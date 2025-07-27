#!/usr/bin/env tsx

import { prisma } from '../src/lib/prisma';
import { EmailStatus } from '@prisma/client';

async function main() {
  try {
    // Get count by status
    const statusCounts = await prisma.emailNotification.groupBy({
      by: ['status'],
      _count: true,
      orderBy: {
        _count: {
          status: 'desc'
        }
      }
    });

    console.log('Email counts by status:');
    statusCounts.forEach(({ status, _count }) => {
      console.log(`  ${status}: ${_count}`);
    });

    // Get recent emails
    const recentEmails = await prisma.emailNotification.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        subject: true,
        status: true,
        sentTo: true,
        createdAt: true,
        sentAt: true,
        errorMessage: true,
        template: {
          select: { name: true }
        }
      }
    });

    console.log('\nMost recent 10 emails:');
    recentEmails.forEach((email) => {
      console.log(`  ${email.createdAt.toISOString()} - ${email.status} - ${email.subject}`);
      console.log(`    To: ${email.sentTo}, Template: ${email.template?.name || 'N/A'}`);
      if (email.sentAt) console.log(`    Sent at: ${email.sentAt.toISOString()}`);
      if (email.errorMessage) console.log(`    Error: ${email.errorMessage}`);
    });

    // Check EMAIL_PROVIDER setting
    console.log('\nEmail provider configuration:');
    console.log(`  EMAIL_PROVIDER: ${process.env.EMAIL_PROVIDER || 'console (default)'}`);
    console.log(`  EMAIL_PROVIDER_LOG_SMTP: ${process.env.EMAIL_PROVIDER_LOG_SMTP || 'false'}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();