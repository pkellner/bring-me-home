import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isSiteAdmin } from '@/lib/permissions';
import { EmailStatus } from '@prisma/client';

export async function POST() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !isSiteAdmin(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Update all QUEUED emails to SENDING status
    const result = await prisma.emailNotification.updateMany({
      where: {
        status: EmailStatus.QUEUED,
        scheduledFor: {
          lte: new Date(), // Only process emails that are scheduled for now or in the past
        },
      },
      data: {
        status: EmailStatus.SENDING,
      },
    });

    console.log(`[Process Queue] Updated ${result.count} emails from QUEUED to SENDING`);

    return NextResponse.json({
      success: true,
      count: result.count,
    });
  } catch (error) {
    console.error('Error processing email queue:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process email queue',
    }, { status: 500 });
  }
}