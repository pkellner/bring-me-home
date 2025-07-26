#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';
import { getEmail, EMAIL_TYPES } from '../src/config/emails';

async function main() {
  try {
    // Check if template already exists
    const existing = await prisma.emailTemplate.findUnique({
      where: { name: 'Password Reset' },
    });

    if (existing) {
      console.log('Password reset template already exists');
      return;
    }

    // Create password reset email template
    const template = await prisma.emailTemplate.create({
      data: {
        name: 'Password Reset',
        subject: 'Reset Your Bring Me Home Password',
        htmlContent: `
<div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
  <h1 style="color: #1F2937; font-size: 24px; margin-bottom: 16px;">Password Reset Request</h1>
  <p style="color: #374151; font-size: 16px; line-height: 24px;">
    Hi{{#if userName}} {{userName}}{{/if}},
  </p>
  <p style="color: #374151; font-size: 16px; line-height: 24px;">
    You requested a password reset for your Bring Me Home account. Click the link below to reset your password:
  </p>
  <p style="margin: 24px 0;">
    <a href="{{resetUrl}}" style="display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
      Reset Password
    </a>
  </p>
  <p style="color: #6B7280; font-size: 14px;">
    Or copy and paste this link into your browser:
  </p>
  <p style="color: #3B82F6; font-size: 14px; word-break: break-all;">
    {{resetUrl}}
  </p>
  <p style="color: #6B7280; font-size: 14px; margin-top: 24px;">
    This link will expire in 1 hour.
  </p>
  <p style="color: #374151; font-size: 16px; line-height: 24px;">
    If you didn't request this password reset, you can safely ignore this email.
  </p>
  <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
  <p style="color: #6B7280; font-size: 14px;">
    This email was sent from Bring Me Home. If you have questions, contact us at {{supportEmail}}.
  </p>
</div>`,
        textContent: `Password Reset Request

Hi{{#if userName}} {{userName}}{{/if}},

You requested a password reset for your Bring Me Home account. Click the link below to reset your password:

{{resetUrl}}

This link will expire in 1 hour.

If you didn't request this password reset, you can safely ignore this email.

This email was sent from Bring Me Home. If you have questions, contact us at {{supportEmail}}.`,
        variables: JSON.stringify([
          'resetUrl',
          'userName',
          'userEmail',
          'supportEmail',
        ]),
        isActive: true,
      },
    });

    console.log('Created password reset email template:', template.id);
  } catch (error) {
    console.error('Error creating password reset template:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();