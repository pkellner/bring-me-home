#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';

async function main() {
  try {
    // Get the most recent queued emails
    const recentEmails = await prisma.emailNotification.findMany({
      where: {
        status: 'QUEUED',
      },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        person: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        personHistory: {
          select: {
            id: true,
            title: true,
            description: true,
            person: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        template: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    console.log(`\nFound ${recentEmails.length} recent queued emails:\n`);

    recentEmails.forEach((email, i) => {
      console.log(`${i + 1}. Email ID: ${email.id}`);
      console.log(`   Subject: ${email.subject}`);
      console.log(`   To: ${email.sentTo || email.user?.email || 'Unknown'}`);
      console.log(`   User: ${email.user ? `${email.user.firstName} ${email.user.lastName}` : 'None'}`);
      console.log(`   Person: ${email.person ? `${email.person.firstName} ${email.person.lastName}` : 'None'}`);
      
      if (email.personHistory) {
        console.log(`   Person History: ${email.personHistory.title}`);
        console.log(`   History Person: ${email.personHistory.person.firstName} ${email.personHistory.person.lastName}`);
      }
      
      console.log(`   Template: ${email.template?.name || 'None'}`);
      console.log(`   Created: ${email.createdAt.toLocaleString()}`);
      console.log('');
    });

    // Also check for recent failed emails that might show errors
    const failedEmails = await prisma.emailNotification.findMany({
      where: {
        status: 'FAILED',
        createdAt: {
          gte: new Date(Date.now() - 1000 * 60 * 60), // Last hour
        },
      },
      select: {
        id: true,
        subject: true,
        lastMailServerMessage: true,
        lastMailServerMessageDate: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 3,
    });

    if (failedEmails.length > 0) {
      console.log('\nRecent failed emails:');
      failedEmails.forEach((email) => {
        console.log(`- ${email.subject}`);
        console.log(`  Server Message: ${email.lastMailServerMessage}`);
        console.log(`  Time: ${email.createdAt.toLocaleString()}\n`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();