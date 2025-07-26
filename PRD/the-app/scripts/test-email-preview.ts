#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';

async function main() {
  try {
    // Get first email notification
    const email = await prisma.emailNotification.findFirst({
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
        template: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (email) {
      console.log('Found email notification:');
      console.log('ID:', email.id);
      console.log('Subject:', email.subject);
      console.log('Status:', email.status);
      console.log('User:', email.user?.email || email.sentTo || 'N/A');
      console.log('\nUse this ID to test: /api/admin/emails/' + email.id);
    } else {
      console.log('No email notifications found in database');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();