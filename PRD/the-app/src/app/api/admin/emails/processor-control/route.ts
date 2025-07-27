import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isSiteAdmin } from '@/lib/permissions';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !isSiteAdmin(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get or create control record
    let control = await prisma.emailProcessorControl.findUnique({
      where: { id: 'control' },
    });
    
    if (!control) {
      control = await prisma.emailProcessorControl.create({
        data: { id: 'control' },
      });
    }

    // Check if processor is running (last check within 30 seconds)
    const isRunning = control.lastCheckAt && 
      (new Date().getTime() - control.lastCheckAt.getTime()) < 30000;

    return NextResponse.json({
      control,
      isRunning,
    });
  } catch (error) {
    console.error('Error fetching processor control:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch control',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !isSiteAdmin(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body; // 'pause', 'resume', 'abort'
    
    // Get or create control record
    let control = await prisma.emailProcessorControl.findUnique({
      where: { id: 'control' },
    });
    
    if (!control) {
      control = await prisma.emailProcessorControl.create({
        data: { id: 'control' },
      });
    }

    // Update based on action
    let updateData: Record<string, boolean | string | Date | null> = {};
    
    switch (action) {
      case 'pause':
        updateData = {
          isPaused: true,
          pausedBy: session.user.username || session.user.email || session.user.id,
          pausedAt: new Date(),
        };
        break;
        
      case 'resume':
        updateData = {
          isPaused: false,
          pausedBy: null,
          pausedAt: null,
        };
        break;
        
      case 'abort':
        updateData = {
          isAborted: true,
          abortedBy: session.user.username || session.user.email || session.user.id,
          abortedAt: new Date(),
        };
        break;
        
      case 'reset':
        updateData = {
          isPaused: false,
          isAborted: false,
          pausedBy: null,
          pausedAt: null,
          abortedBy: null,
          abortedAt: null,
        };
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updatedControl = await prisma.emailProcessorControl.update({
      where: { id: 'control' },
      data: updateData,
    });
    
    // Log the action
    await prisma.emailProcessorLog.create({
      data: {
        level: 'warning',
        category: 'control',
        message: `Email processor ${action} by ${session.user.username || session.user.email}`,
        metadata: JSON.stringify({
          action,
          userId: session.user.id,
          username: session.user.username || session.user.email,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      control: updatedControl,
    });
  } catch (error) {
    console.error('Error updating processor control:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to update control',
    }, { status: 500 });
  }
}