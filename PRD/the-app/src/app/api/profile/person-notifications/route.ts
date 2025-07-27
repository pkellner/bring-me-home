import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isSiteAdmin, isTownAdmin, hasPersonAccess } from '@/lib/permissions';

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { userId, personId, notifyOnNewComments, notifyFrequency } = body;
    
    // Determine which user to update
    let targetUserId = session.user.id;
    
    // If userId is provided and user is admin, update that user instead
    if (userId && userId !== session.user.id) {
      if (!isSiteAdmin(session) && !isTownAdmin(session)) {
        return NextResponse.json({ 
          error: 'Only admins can update other users\' notification preferences' 
        }, { status: 403 });
      }
      targetUserId = userId;
    }
    
    // Check if the user has access to this person
    let hasAccess = false;
    
    if (isSiteAdmin(session)) {
      // Site admins have access to all persons
      hasAccess = true;
    } else if (isTownAdmin(session)) {
      // Town admins have access to persons in their towns
      const person = await prisma.person.findUnique({
        where: { id: personId },
        select: { townId: true }
      });
      
      if (person) {
        const townAccess = await prisma.townAccess.findFirst({
          where: {
            userId: targetUserId,
            townId: person.townId
          }
        });
        hasAccess = !!townAccess;
      }
    } else {
      // Check direct person access
      hasAccess = await hasPersonAccess(session, personId);
    }
    
    if (!hasAccess) {
      return NextResponse.json({ 
        error: 'You do not have access to manage notifications for this person' 
      }, { status: 403 });
    }
    
    // Update or create the preference
    const data: Partial<{notifyOnNewComments: boolean; notifyFrequency: string}> = {};
    if (notifyOnNewComments !== undefined) data.notifyOnNewComments = notifyOnNewComments;
    if (notifyFrequency !== undefined) {
      // Validate frequency value
      if (!['immediate', 'hourly', 'daily'].includes(notifyFrequency)) {
        return NextResponse.json({ 
          error: 'Invalid notification frequency' 
        }, { status: 400 });
      }
      data.notifyFrequency = notifyFrequency;
    }
    
    await prisma.personNotificationPreference.upsert({
      where: {
        userId_personId: {
          userId: targetUserId,
          personId,
        },
      },
      update: data,
      create: {
        userId: targetUserId,
        personId,
        ...data,
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