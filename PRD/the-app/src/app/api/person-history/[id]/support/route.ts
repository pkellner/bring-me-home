import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET endpoint to fetch support stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: personHistoryId } = await params;
    
    // Get anonymous support count for this update
    const anonymousSupport = await prisma.anonymousSupport.count({
      where: { personHistoryId }
    });
    
    return NextResponse.json({
      success: true,
      anonymousSupport
    });
  } catch (error) {
    console.error('Error fetching update support stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch support stats' },
      { status: 500 }
    );
  }
}

// POST endpoint to create anonymous support
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: personHistoryId } = await params;
    
    // Get IP address from headers
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
    
    // Get user agent
    const userAgent = request.headers.get('user-agent') || undefined;
    
    // Verify person history exists
    const personHistory = await prisma.personHistory.findUnique({
      where: { id: personHistoryId },
      select: { id: true, personId: true }
    });
    
    if (!personHistory) {
      return NextResponse.json(
        { error: 'Update not found' },
        { status: 404 }
      );
    }
    
    // Create anonymous support record
    const support = await prisma.anonymousSupport.create({
      data: {
        personId: personHistory.personId,
        personHistoryId,
        ipAddress,
        userAgent
      }
    });
    
    // Get total support count for this update
    const totalSupport = await prisma.anonymousSupport.count({
      where: { personHistoryId }
    });
    
    return NextResponse.json({
      success: true,
      supportId: support.id,
      totalSupport
    });
  } catch (error) {
    console.error('Error creating anonymous support for update:', error);
    return NextResponse.json(
      { error: 'Failed to record support' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove support (for admin testing)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: personHistoryId } = await params;
    
    // Delete the most recent anonymous support for this update
    const lastSupport = await prisma.anonymousSupport.findFirst({
      where: { personHistoryId },
      orderBy: { createdAt: 'desc' }
    });
    
    if (lastSupport) {
      await prisma.anonymousSupport.delete({
        where: { id: lastSupport.id }
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting support:', error);
    return NextResponse.json(
      { error: 'Failed to delete support' },
      { status: 500 }
    );
  }
}