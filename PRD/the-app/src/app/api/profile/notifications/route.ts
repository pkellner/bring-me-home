import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isSiteAdmin } from '@/lib/permissions';

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { notifyOnNewComments, notifyFrequency, userId } = await request.json();
    
    // Validate frequency value
    if (!['immediate', 'hourly', 'daily'].includes(notifyFrequency)) {
      return NextResponse.json({ 
        error: 'Invalid notification frequency' 
      }, { status: 400 });
    }
    
    // Determine which user to update
    let targetUserId = session.user.id;
    
    // If userId is provided and user is admin, update that user instead
    if (userId && userId !== session.user.id) {
      if (!isSiteAdmin(session)) {
        return NextResponse.json({ 
          error: 'Only site admins can update other users\' notification preferences' 
        }, { status: 403 });
      }
      targetUserId = userId;
    }
    
    // Update user notification preferences
    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        notifyOnNewComments,
        notifyFrequency,
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}