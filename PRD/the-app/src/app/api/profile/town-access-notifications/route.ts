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
    const body = await request.json();
    const { townAccessId, notifyOnComment } = body;
    
    // Verify the town access belongs to the user or user is admin
    const townAccess = await prisma.townAccess.findUnique({
      where: { id: townAccessId },
      select: { userId: true }
    });
    
    if (!townAccess) {
      return NextResponse.json({ error: 'Town access not found' }, { status: 404 });
    }
    
    // Check if user owns this access or is an admin
    if (townAccess.userId !== session.user.id && !isSiteAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Update the notification setting
    await prisma.townAccess.update({
      where: { id: townAccessId },
      data: { notifyOnComment }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update notification settings:', error);
    return NextResponse.json(
      { error: 'Failed to update notification settings' },
      { status: 500 }
    );
  }
}