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
    const { personAccessId, notifyOnComment } = body;
    
    // Verify the person access belongs to the user or user is admin
    const personAccess = await prisma.personAccess.findUnique({
      where: { id: personAccessId },
      select: { userId: true }
    });
    
    if (!personAccess) {
      return NextResponse.json({ error: 'Person access not found' }, { status: 404 });
    }
    
    // Check if user owns this access or is an admin
    if (personAccess.userId !== session.user.id && !isSiteAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Update the notification setting
    await prisma.personAccess.update({
      where: { id: personAccessId },
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