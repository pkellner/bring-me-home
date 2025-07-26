#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';

async function main() {
  try {
    const emails = await prisma.emailNotification.findMany({
      where: {
        status: 'QUEUED',
      },
      include: {
        user: true,
        person: true,
        template: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    console.log(`Found ${emails.length} queued emails:\n`);

    emails.forEach((email, i) => {
      console.log(`${i + 1}. Email ID: ${email.id}`);
      console.log(`   Subject: ${email.subject}`);
      console.log(`   To: ${email.sentTo || email.user?.email || 'Unknown'}`);
      console.log(`   User: ${email.user ? `${email.user.firstName} ${email.user.lastName}` : 'None'}`);
      console.log(`   Person: ${email.person ? `${email.person.firstName} ${email.person.lastName}` : 'None'}`);
      console.log(`   Template: ${email.template?.name || 'None'}`);
      console.log(`   Created: ${email.createdAt.toLocaleString()}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();