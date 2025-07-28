#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';

async function main() {
  try {
    // Count emails
    const totalEmails = await prisma.emailNotification.count();
    console.log(`Total email notifications: ${totalEmails}`);
    
    // Count by status
    const statuses = ['QUEUED', 'SENDING', 'SENT', 'FAILED'];
    for (const status of statuses) {
      const count = await prisma.emailNotification.count({
        where: { status: status as any }
      });
      console.log(`  ${status}: ${count}`);
    }
    
    // Get recent emails
    const recentEmails = await prisma.emailNotification.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        subject: true,
        status: true,
        createdAt: true,
        sentTo: true,
      }
    });
    
    console.log('\nRecent emails:');
    recentEmails.forEach(email => {
      console.log(`  - ${email.subject} (${email.status}) to ${email.sentTo} at ${email.createdAt}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();