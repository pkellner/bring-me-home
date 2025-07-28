import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPersonAccess, isSiteAdmin, isTownAdmin, isPersonAdmin } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: personHistoryId } = await context.params;

  try {
    // Get the person history to check access
    const personHistory = await prisma.personHistory.findUnique({
      where: { id: personHistoryId },
      select: { personId: true }
    });

    if (!personHistory) {
      return NextResponse.json({ error: 'Person history not found' }, { status: 404 });
    }

    // Check if user has access to this person
    const hasAccess = await hasPersonAccess(session, personHistory.personId, 'read') || 
                      isTownAdmin(session) || 
                      isPersonAdmin(session) ||
                      isSiteAdmin(session);
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all email notifications for this person history
    const emailNotifications = await prisma.emailNotification.findMany({
      where: {
        personHistoryId,
      },
      select: {
        id: true,
        status: true,
        sentAt: true,
        openedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        },
        sentTo: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Group by email address and get the most recent notification for each
    const emailMap = new Map<string, typeof emailNotifications[0]>();
    
    for (const notification of emailNotifications) {
      const email = notification.sentTo || notification.user?.email || 'Unknown';
      const existing = emailMap.get(email);
      
      // Keep the most recent notification for each email
      if (!existing || notification.createdAt > existing.createdAt) {
        emailMap.set(email, notification);
      }
    }

    // Convert map to array for unique recipients
    const uniqueNotifications = Array.from(emailMap.values());

    // Calculate stats based on unique recipients
    const uniqueSentCount = uniqueNotifications.filter(e => ['SENT', 'DELIVERED', 'OPENED'].includes(e.status)).length;
    const uniqueOpenedCount = uniqueNotifications.filter(e => e.status === 'OPENED').length;
    
    const stats = {
      total: uniqueNotifications.length,
      sent: uniqueSentCount,
      opened: uniqueOpenedCount,
    };

    // Format unique recipients
    const recipients = uniqueNotifications.map(notification => ({
      id: notification.id,
      firstName: notification.user?.firstName || null,
      lastName: notification.user?.lastName || null,
      email: notification.sentTo || notification.user?.email || 'Unknown',
      status: notification.status,
      sentAt: notification.sentAt?.toISOString() || null,
      openedAt: notification.openedAt?.toISOString() || null,
    }));

    return NextResponse.json({ stats, recipients });
  } catch (error) {
    console.error('Error fetching email status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}