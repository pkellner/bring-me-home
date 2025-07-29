#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';
import { EmailStatus } from '@prisma/client';

async function testEmailErrorDisplay() {
  console.log('🧪 Testing Email Error Display in History Page...\n');

  // Find a recent person history with emails
  const personHistory = await prisma.personHistory.findFirst({
    where: {
      emailNotifications: {
        some: {}
      }
    },
    orderBy: { createdAt: 'desc' },
    include: {
      person: true,
      emailNotifications: {
        take: 5,
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!personHistory) {
    console.log('❌ No person history with emails found');
    return;
  }

  console.log(`📋 Person: ${personHistory.person.firstName} ${personHistory.person.lastName}`);
  console.log(`📄 Update: ${personHistory.title}`);
  console.log(`🔗 URL: http://localhost:3000/admin/persons/${personHistory.personId}/edit/history`);
  console.log('\n📧 Email Notifications:');

  for (const email of personHistory.emailNotifications) {
    console.log('\n---');
    console.log(`ID: ${email.id}`);
    console.log(`Status: ${email.status}`);
    console.log(`Sent To: ${email.sentTo || '(check user email)'}`);
    
    if (email.lastMailServerMessage) {
      console.log(`🔴 Error Message: ${email.lastMailServerMessage}`);
      console.log(`   Error Date: ${email.lastMailServerMessageDate?.toISOString() || 'N/A'}`);
    }
    
    if (email.bounceType) {
      console.log(`📨 Bounce Type: ${email.bounceType}/${email.bounceSubType || 'N/A'}`);
    }
  }

  console.log('\n\n💡 How to test:');
  console.log('1. Go to the history page URL above');
  console.log('2. Click the dropdown arrow next to "X sent, Y opened"');
  console.log('3. Hover over the status badges to see error messages');
  console.log('4. Failed/Bounced emails will show detailed error information');
  console.log('\n📌 Status Badge Colors:');
  console.log('   - Green (OPENED): Successfully opened');
  console.log('   - Blue (SENT/DELIVERED): Successfully sent');
  console.log('   - Red (FAILED): Failed to send');
  console.log('   - Orange (BOUNCED): Email bounced');
  console.log('   - Gray (Others): Other statuses');

  // Simulate adding a test bounce error
  if (personHistory.emailNotifications.length > 0) {
    const testEmail = personHistory.emailNotifications[0];
    
    console.log('\n\n🧪 Simulating a bounce error for testing...');
    
    await prisma.emailNotification.update({
      where: { id: testEmail.id },
      data: {
        status: EmailStatus.BOUNCED,
        bounceType: 'Permanent',
        bounceSubType: 'General',
        lastMailServerMessage: 'Bounce (Permanent/General): smtp; 550 5.1.1 <test@example.com>: Recipient address rejected: User unknown',
        lastMailServerMessageDate: new Date()
      }
    });

    console.log(`✅ Updated email ${testEmail.id} with test bounce error`);
    console.log('   Refresh the history page to see the error message on hover');
  }

  await prisma.$disconnect();
}

testEmailErrorDisplay().catch(console.error);