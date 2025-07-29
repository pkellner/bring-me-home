#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';

async function debugMessageIds() {
  console.log('🔍 Debugging SES Message IDs...\n');

  try {
    // Get recent email notifications with messageIds
    const recentEmails = await prisma.emailNotification.findMany({
      where: {
        messageId: { not: null },
        provider: 'ses'
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        messageId: true,
        subject: true,
        sentTo: true,
        status: true,
        provider: true,
        sentAt: true,
        createdAt: true,
      }
    });

    console.log(`Found ${recentEmails.length} recent SES emails with messageIds:\n`);

    for (const email of recentEmails) {
      console.log(`📧 Email ID: ${email.id}`);
      console.log(`   Subject: ${email.subject}`);
      console.log(`   To: ${email.sentTo || '(null - check user email)'}`);
      console.log(`   Status: ${email.status}`);
      console.log(`   Provider: ${email.provider}`);
      console.log(`   MessageID: ${email.messageId}`);
      console.log(`   Sent At: ${email.sentAt?.toISOString() || 'Not sent'}`);
      console.log(`   Created: ${email.createdAt.toISOString()}`);
      console.log('');
    }
    
    // Also check emails sent today with sentTo field populated
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const emailsWithSentTo = await prisma.emailNotification.findMany({
      where: {
        sentTo: { not: null },
        provider: 'ses',
        createdAt: { gte: todayStart }
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        messageId: true,
        subject: true,
        sentTo: true,
        status: true,
        provider: true,
        sentAt: true,
      }
    });
    
    console.log(`\n📨 Recent emails with sentTo field populated (${emailsWithSentTo.length}):\n`);
    for (const email of emailsWithSentTo) {
      console.log(`   ID: ${email.id}`);
      console.log(`   To: ${email.sentTo}`);
      console.log(`   MessageID: ${email.messageId || '(not set)'}`);
      console.log(`   Status: ${email.status}`);
      console.log('');
    }

    // Check for emails without messageIds
    const emailsWithoutMessageId = await prisma.emailNotification.count({
      where: {
        status: 'SENT',
        messageId: null,
        provider: 'ses'
      }
    });

    console.log(`\n⚠️  Emails sent via SES without messageId: ${emailsWithoutMessageId}`);

    // Get a sample of recent sent emails without messageId
    if (emailsWithoutMessageId > 0) {
      const sampleMissing = await prisma.emailNotification.findMany({
        where: {
          status: 'SENT',
          messageId: null,
          provider: 'ses'
        },
        take: 5,
        orderBy: { sentAt: 'desc' },
        select: {
          id: true,
          subject: true,
          sentTo: true,
          sentAt: true,
          lastMailServerMessage: true
        }
      });

      console.log('\nSample of emails missing messageId:');
      for (const email of sampleMissing) {
        console.log(`\n   ID: ${email.id}`);
        console.log(`   Subject: ${email.subject}`);
        console.log(`   To: ${email.sentTo}`);
        console.log(`   Sent: ${email.sentAt?.toISOString()}`);
        console.log(`   Server Message: ${email.lastMailServerMessage}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugMessageIds();