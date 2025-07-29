#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';

async function testSESWebhookLogging() {
  console.log('📧 Testing SES Webhook Logging...\n');
  console.log('To test the logging, send a test SES notification to your webhook endpoint.');
  console.log('\nThe webhook will show different logging based on how the email is matched:\n');
  
  console.log('1. ✅ [DEV] Email matched by messageId');
  console.log('   - Direct match using the SES messageId\n');
  
  console.log('2. 🔍 [DEV] Partial messageId matches found');
  console.log('   - When exact match fails but partial matches exist\n');
  
  console.log('3. ✅ [DEV] Email matched by recipient and timestamp');
  console.log('   - When messageId fails but recipient email + timestamp match\n');
  
  console.log('4. ❌ [DEV] No email match found by recipient/timestamp');
  console.log('   - When recipient lookup fails\n');
  
  console.log('5. ⚠️ [DEV] No email match found for SES notification');
  console.log('   - When all matching methods fail\n');
  
  // Show some recent emails for testing
  const recentEmails = await prisma.emailNotification.findMany({
    where: {
      provider: 'ses',
      sentAt: { not: null }
    },
    orderBy: { sentAt: 'desc' },
    take: 5,
    select: {
      id: true,
      messageId: true,
      sentTo: true,
      subject: true,
      sentAt: true,
      user: {
        select: {
          email: true
        }
      }
    }
  });
  
  console.log('\n📋 Recent SES emails you can test with:\n');
  
  for (const email of recentEmails) {
    console.log(`Email ID: ${email.id}`);
    console.log(`MessageID: ${email.messageId || '(not set)'}`);
    console.log(`Sent To: ${email.sentTo || email.user?.email || '(unknown)'}`);
    console.log(`Subject: ${email.subject}`);
    console.log(`Sent At: ${email.sentAt?.toISOString()}`);
    console.log('---');
  }
  
  console.log('\n💡 Tips:');
  console.log('- Set NODE_ENV=development to see detailed logging');
  console.log('- Use AWS SES Test emails to trigger different notification types');
  console.log('- Check the console output when the webhook receives notifications');
  
  await prisma.$disconnect();
}

testSESWebhookLogging().catch(console.error);