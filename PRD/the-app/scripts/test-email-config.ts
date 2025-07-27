#!/usr/bin/env tsx

import { getEmailProvider } from '../src/lib/email';

console.log('Email Configuration Test:');
console.log('========================');
console.log(`EMAIL_PROVIDER env var: ${process.env.EMAIL_PROVIDER}`);
console.log(`Actual provider being used: ${getEmailProvider()}`);
console.log(`EMAIL_PROVIDER_LOG_SMTP: ${process.env.EMAIL_PROVIDER_LOG_SMTP}`);

// AWS SES specific
if (process.env.EMAIL_PROVIDER === 'ses') {
  console.log('\nAWS SES Configuration:');
  console.log(`AWS_REGION: ${process.env.AWS_REGION || 'Not set'}`);
  console.log(`AWS_SES_FROM_EMAIL: ${process.env.AWS_SES_FROM_EMAIL || 'Not set'}`);
  console.log(`AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? 'Set' : 'Not set'}`);
  console.log(`AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? 'Set' : 'Not set'}`);
}

// Check if in development
console.log(`\nNODE_ENV: ${process.env.NODE_ENV || 'development'}`);

// Test sending a test email
console.log('\nTesting email send (dry run)...');

import { sendEmail } from '../src/lib/email';

async function testEmail() {
  try {
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test Email - DRY RUN',
      html: '<p>This is a test email</p>',
      text: 'This is a test email'
    });
    console.log('Email send result:', result);
  } catch (error) {
    console.error('Email send error:', error);
  }
}

testEmail();