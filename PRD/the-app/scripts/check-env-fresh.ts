#!/usr/bin/env tsx

// Force fresh load of env
import dotenv from 'dotenv';
import path from 'path';

// Clear any cached env vars
delete process.env.EMAIL_PROVIDER;
delete process.env.EMAIL_PROVIDER_LOG_SMTP;

// Reload from .env file
const envPath = path.resolve(process.cwd(), '.env');
console.log('Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Error loading .env:', result.error);
} else {
  console.log('.env loaded successfully');
}

console.log('\nEmail Configuration:');
console.log('EMAIL_PROVIDER:', process.env.EMAIL_PROVIDER);
console.log('EMAIL_PROVIDER_LOG_SMTP:', process.env.EMAIL_PROVIDER_LOG_SMTP);
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('AWS_SES_FROM_EMAIL:', process.env.AWS_SES_FROM_EMAIL);

// Now test the email provider
import('../src/lib/email').then(({ getEmailProvider }) => {
  console.log('\nActual provider being used:', getEmailProvider());
});