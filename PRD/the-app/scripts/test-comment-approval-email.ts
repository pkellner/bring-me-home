#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';

async function main() {
  try {
    // Find joe plumber
    const person = await prisma.person.findFirst({
      where: {
        slug: 'joe_plumber',
      },
      include: {
        town: true,
      },
    });

    if (!person) {
      console.log('Joe Plumber not found');
      return;
    }

    console.log('Found person:', person.firstName, person.lastName);

    // Create a test comment
    const comment = await prisma.comment.create({
      data: {
        personId: person.id,
        firstName: 'Test',
        lastName: 'User',
        email: 'testuser@example.com',
        content: 'This is a test comment to check email verification',
        occupation: 'Tester',
        city: 'Test City',
        state: 'TX',
        showOccupation: true,
        showBirthdate: false,
        showCityState: true,
        showComment: true,
        displayNameOnly: false,
        privacyRequiredDoNotShowPublicly: false,
        isApproved: false,
      },
    });

    console.log('\nCreated test comment:', comment.id);
    console.log('Email:', comment.email);
    console.log('Status: Not approved yet');
    console.log('\nNow approve this comment from the admin panel to test the email queue');
    console.log(`Admin URL: http://localhost:3000/admin/comments/${person.town.slug}/${person.slug}`);

    // Check if email template exists
    const template = await prisma.emailTemplate.findUnique({
      where: { name: 'comment_verification' },
    });

    if (!template) {
      console.log('\n⚠️  WARNING: Comment Verification email template not found!');
      console.log('The email will not be sent when you approve the comment.');
    } else {
      console.log('\n✅ Comment Verification email template found');
    }

    // Check current email queue
    const queueCount = await prisma.emailNotification.count({
      where: {
        status: 'QUEUED',
      },
    });

    console.log(`\nCurrent email queue: ${queueCount} emails waiting to be sent`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();