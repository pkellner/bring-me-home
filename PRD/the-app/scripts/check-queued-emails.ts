#!/usr/bin/env tsx

import { prisma } from '../src/lib/prisma';
import { EmailStatus } from '@prisma/client';

async function main() {
  try {
    // Get QUEUED emails
    const queuedEmails = await prisma.emailNotification.findMany({
      where: { status: EmailStatus.QUEUED },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        subject: true,
        status: true,
        sentTo: true,
        createdAt: true,
        template: {
          select: { name: true }
        }
      }
    });

    console.log(`Found ${queuedEmails.length} QUEUED emails:`);
    queuedEmails.forEach((email) => {
      console.log(`  ${email.createdAt.toISOString()} - ${email.subject}`);
      console.log(`    To: ${email.sentTo}, Template: ${email.template?.name || 'N/A'}`);
    });

    // Get SENDING emails
    const sendingEmails = await prisma.emailNotification.findMany({
      where: { status: EmailStatus.SENDING },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        subject: true,
        status: true,
        sentTo: true,
        createdAt: true,
        template: {
          select: { name: true }
        }
      }
    });

    console.log(`\nFound ${sendingEmails.length} SENDING emails:`);
    sendingEmails.forEach((email) => {
      console.log(`  ${email.createdAt.toISOString()} - ${email.subject}`);
      console.log(`    To: ${email.sentTo}, Template: ${email.template?.name || 'N/A'}`);
    });

    // Get FAILED emails
    const failedEmails = await prisma.emailNotification.findMany({
      where: { status: EmailStatus.FAILED },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        subject: true,
        status: true,
        sentTo: true,
        createdAt: true,
        lastMailServerMessage: true,
        lastMailServerMessageDate: true,
        template: {
          select: { name: true }
        }
      }
    });

    console.log(`\nFound ${failedEmails.length} recent FAILED emails:`);
    failedEmails.forEach((email) => {
      console.log(`  ${email.createdAt.toISOString()} - ${email.subject}`);
      console.log(`    To: ${email.sentTo}, Template: ${email.template?.name || 'N/A'}`);
      if (email.lastMailServerMessage) console.log(`    Server Message: ${email.lastMailServerMessage}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();