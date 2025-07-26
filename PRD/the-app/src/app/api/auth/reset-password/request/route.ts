import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';
import { EmailStatus } from '@prisma/client';
import { replaceTemplateVariables } from '@/lib/email-template-variables';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      console.log('Password reset requested for non-existent email:', email);
      return NextResponse.json({ success: true });
    }

    // Check if there's a recent unexpired token
    const existingToken = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let tokenToSend: string;
    
    // If a recent token exists (created within last 5 minutes), use it instead of creating a new one
    if (existingToken) {
      const tokenAge = Date.now() - existingToken.createdAt.getTime();
      if (tokenAge < 5 * 60 * 1000) { // 5 minutes
        console.log('Recent password reset token already exists for user:', user.id);
        console.log('Resending email with existing token...');
        tokenToSend = existingToken.token;
      } else {
        // Token exists but is older than 5 minutes, create a new one
        const newToken = nanoid(32);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        await prisma.passwordResetToken.create({
          data: {
            token: newToken,
            userId: user.id,
            expiresAt,
          },
        });
        
        tokenToSend = newToken;
      }
    } else {
      // No existing token, create a new one
      const newToken = nanoid(32);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      await prisma.passwordResetToken.create({
        data: {
          token: newToken,
          userId: user.id,
          expiresAt,
        },
      });
      
      tokenToSend = newToken;
    }

    // Queue reset email (always queue, whether using existing or new token)
    console.log('Attempting to queue password reset email for:', user.email);
    try {
      // Get the password reset email template
      const template = await prisma.emailTemplate.findUnique({
        where: { name: 'password_reset' },
      });

      if (!template || !template.isActive) {
        console.error('Password reset email template not found or inactive');
        return NextResponse.json({ success: true }); // Still return success to prevent enumeration
      }

      // Prepare template variables
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const resetUrl = `${baseUrl}/auth/reset-password?token=${tokenToSend}`;
      
      const templateData = {
        firstName: user.firstName || 'there',
        resetUrl,
      };

      const subject = replaceTemplateVariables(template.subject, templateData);
      const htmlContent = replaceTemplateVariables(template.htmlContent, templateData);
      const textContent = template.textContent ? replaceTemplateVariables(template.textContent, templateData) : undefined;

      // Queue the email instead of sending directly
      await prisma.emailNotification.create({
        data: {
          userId: user.id,
          subject,
          htmlContent,
          textContent,
          status: EmailStatus.QUEUED,
          templateId: template.id,
          sentTo: user.email!,
          customizations: templateData,
        }
      });

      console.log('Password reset email queued successfully');
    } catch (emailError) {
      console.error('Failed to queue password reset email:', emailError);
      // Still return success to user, but log the error
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}