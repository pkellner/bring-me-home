#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';

async function main() {
  try {
    console.log('🔍 Debugging Joe Plumber comment issue...\n');

    // Find Joe Plumber
    const joePlumber = await prisma.person.findFirst({
      where: {
        firstName: 'Joe',
        lastName: 'Plumber',
      },
      include: {
        town: true,
      }
    });

    if (!joePlumber) {
      console.error('❌ Joe Plumber not found!');
      return;
    }

    console.log(`✅ Found Joe Plumber:`);
    console.log(`   ID: ${joePlumber.id}`);
    console.log(`   Name: ${joePlumber.firstName} ${joePlumber.lastName}`);
    console.log(`   Town: ${joePlumber.town.name}`);
    console.log(`   Slug: ${joePlumber.slug}`);

    // Find all comments for Joe Plumber
    const comments = await prisma.comment.findMany({
      where: {
        personId: joePlumber.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    console.log(`\n📝 Found ${comments.length} comments for Joe Plumber:\n`);

    for (const comment of comments) {
      console.log(`Comment ID: ${comment.id}`);
      console.log(`   Author: ${comment.firstName} ${comment.lastName}`);
      console.log(`   Email: ${comment.email || 'NO EMAIL'}`);
      console.log(`   Content: ${comment.content?.substring(0, 50)}...`);
      console.log(`   Approved: ${comment.isApproved}`);
      console.log(`   Created: ${comment.createdAt}`);
      console.log(`   Verification Email Sent: ${comment.verificationEmailSentAt || 'NEVER'}`);
      console.log(`   User ID: ${comment.userId || 'NO USER'}`);
      console.log('---');
    }

    // Check for verification tokens
    console.log('\n🔑 Checking for verification tokens...\n');
    
    const emails = comments
      .filter(c => c.email)
      .map(c => c.email)
      .filter((v, i, a) => a.indexOf(v) === i); // unique emails

    for (const email of emails) {
      const token = await prisma.commentVerificationToken.findFirst({
        where: {
          email: email!,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      console.log(`Email: ${email}`);
      if (token) {
        console.log(`   Token ID: ${token.id}`);
        console.log(`   Created: ${token.createdAt}`);
        console.log(`   Last Used: ${token.lastUsedAt || 'NEVER'}`);
        console.log(`   Active: ${token.isActive}`);
      } else {
        console.log(`   ❌ NO TOKEN FOUND`);
      }
      console.log('---');
    }

    // Check email template
    console.log('\n📧 Checking email template...\n');
    const template = await prisma.emailTemplate.findUnique({
      where: { name: 'comment_verification' },
    });

    if (template) {
      console.log('✅ Email template exists:');
      console.log(`   Name: ${template.name}`);
      console.log(`   Subject: ${template.subject}`);
      console.log(`   Active: ${template.isActive}`);
      console.log(`   Variables: ${Object.keys(template.variables || {}).join(', ')}`);
    } else {
      console.log('❌ Email template NOT FOUND!');
    }

    // Check email queue for recent emails
    console.log('\n📬 Checking email queue (if exists)...\n');
    try {
      const recentEmails = await prisma.emailNotification.findMany({
        where: {
          OR: [
          { sentTo: { in: emails.filter(e => e) as string[] } },
          { user: { email: { in: emails.filter(e => e) as string[] } } }
        ],
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
      });

      if (recentEmails.length > 0) {
        console.log(`Found ${recentEmails.length} emails in queue:`);
        for (const email of recentEmails) {
          console.log(`   To: ${email.sentTo || 'User email'}`);
          console.log(`   Subject: ${email.subject}`);
          console.log(`   Status: ${email.status}`);
          console.log(`   Created: ${email.createdAt}`);
          console.log(`   Sent: ${email.sentAt || 'NOT SENT'}`);
          console.log('   ---');
        }
      } else {
        console.log('No emails found in queue for these addresses');
      }
    } catch (error) {
      console.log('Email queue table might not exist');
    }

    // Check environment
    console.log('\n⚙️  Email Configuration:\n');
    console.log(`   EMAIL_PROVIDER: ${process.env.EMAIL_PROVIDER || 'NOT SET (defaults to console)'}`);
    console.log(`   NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || 'NOT SET'}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}`);

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();