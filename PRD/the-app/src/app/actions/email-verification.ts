'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import crypto from 'crypto';
import { EmailStatus } from '@prisma/client';

const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

export async function sendVerificationEmail(userId: string, isNewRegistration: boolean = false) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, emailVerified: true, firstName: true, lastName: true, username: true }
    });

    if (!user?.email) {
      return { success: false, error: 'No email address found for user' };
    }

    if (user.emailVerified && !isNewRegistration) {
      return { success: false, error: 'Email already verified' };
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + VERIFICATION_TOKEN_EXPIRY_HOURS);

    // Update user with verification token
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: token,
        emailVerificationExpires: expires
      }
    });

    // Queue verification email
    const verificationUrl = `${process.env.NEXTAUTH_URL}/verify/email?token=${token}`;
    const profileUrl = `${process.env.NEXTAUTH_URL}/profile`;
    const unsubscribeUrl = `${process.env.NEXTAUTH_URL}/unsubscribe?token=${crypto.randomBytes(32).toString('base64url')}`;
    
    let subject: string;
    let htmlContent: string;
    let textContent: string;

    if (isNewRegistration) {
      // Welcome email for new registrations
      subject = 'Welcome! Confirm your account creation';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome to Bring Me Home!</h1>
          <p>Hi ${user.firstName || user.username},</p>
          <p>Thank you for creating an account. Your account has been successfully created and you can now:</p>
          <ul>
            <li>Leave messages of support for detained individuals</li>
            <li>Manage your email preferences</li>
            <li>Control your privacy settings</li>
          </ul>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Email Verification (Optional but Recommended)</strong></p>
            <p>Verifying your email is not required, but it helps families know that messages are from real people. This can be especially helpful when they are reviewing messages for approval.</p>
            <div style="margin: 15px 0;">
              <a href="${verificationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Verify My Email
              </a>
            </div>
          </div>

          <div style="margin: 30px 0;">
            <p><strong>Privacy Controls</strong></p>
            <p>You have full control over your privacy settings. Visit your profile to:</p>
            <ul>
              <li>Manage which emails you receive</li>
              <li>Control anonymous comment settings</li>
              <li>Block others from posting with your email address</li>
            </ul>
            <a href="${profileUrl}" style="color: #4F46E5;">Go to My Profile</a>
          </div>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #666;">
            You're receiving this because you created an account with this email address.<br>
            <a href="${unsubscribeUrl}" style="color: #666;">Unsubscribe from all emails</a> | 
            <a href="${profileUrl}" style="color: #666;">Manage email preferences</a><br><br>
            If you didn't create this account, you can safely ignore this email or <a href="${profileUrl}" style="color: #666;">block future use of your email</a>.
          </p>
        </div>
      `;
      
      textContent = `Welcome to Bring Me Home!

Hi ${user.firstName || user.username},

Thank you for creating an account. Your account has been successfully created and you can now:
- Leave messages of support for detained individuals
- Manage your email preferences
- Control your privacy settings

Email Verification (Optional but Recommended)
Verifying your email is not required, but it helps families know that messages are from real people. This can be especially helpful when they are reviewing messages for approval.

Verify your email: ${verificationUrl}

Privacy Controls
You have full control over your privacy settings. Visit your profile to:
- Manage which emails you receive
- Control anonymous comment settings
- Block others from posting with your email address

Go to your profile: ${profileUrl}

---
You're receiving this because you created an account with this email address.
Unsubscribe: ${unsubscribeUrl}
Manage preferences: ${profileUrl}

If you didn't create this account, you can safely ignore this email or block future use of your email.`;
    } else {
      // Standard verification email
      subject = 'Verify your email address';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Verify Your Email Address</h1>
          <p>Hi ${user.firstName || 'there'},</p>
          <p>Please click the button below to verify your email address:</p>
          <div style="margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Verify Email
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p style="color: #666; font-size: 14px; word-break: break-all;">${verificationUrl}</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">This link will expire in ${VERIFICATION_TOKEN_EXPIRY_HOURS} hours.</p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #666;">
            <a href="${unsubscribeUrl}" style="color: #666;">Unsubscribe</a> | 
            <a href="${profileUrl}" style="color: #666;">Manage preferences</a>
          </p>
        </div>
      `;
      
      textContent = `Verify your email address

Hi ${user.firstName || 'there'},

Please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in ${VERIFICATION_TOKEN_EXPIRY_HOURS} hours.

---
Unsubscribe: ${unsubscribeUrl}
Manage preferences: ${profileUrl}`;
    }

    // Create email notification in queue
    await prisma.emailNotification.create({
      data: {
        userId: user.id,
        subject,
        htmlContent,
        textContent,
        status: EmailStatus.QUEUED,
        sentTo: user.email,
      }
    });

    return { success: true, message: 'Email queued successfully' };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: 'Failed to send verification email' };
  }
}

export async function verifyEmail(token: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { emailVerificationToken: token },
      select: { 
        id: true, 
        email: true, 
        emailVerified: true,
        emailVerificationExpires: true 
      }
    });

    if (!user) {
      return { success: false, error: 'Invalid verification token' };
    }

    if (user.emailVerified) {
      return { success: false, error: 'Email already verified' };
    }

    if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
      return { success: false, error: 'Verification token has expired' };
    }

    // Update user to mark email as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        emailVerificationToken: null,
        emailVerificationExpires: null
      }
    });

    return { success: true, message: 'Email verified successfully' };
  } catch (error) {
    console.error('Error verifying email:', error);
    return { success: false, error: 'Failed to verify email' };
  }
}

export async function resendVerificationEmail() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' };
  }

  return sendVerificationEmail(session.user.id);
}

export async function checkEmailVerificationStatus(userId?: string) {
  const session = await getServerSession(authOptions);
  const targetUserId = userId || session?.user?.id;
  
  if (!targetUserId) {
    return { verified: false, email: null };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { email: true, emailVerified: true }
    });

    return {
      verified: !!user?.emailVerified,
      email: user?.email || null,
      verifiedAt: user?.emailVerified || null
    };
  } catch (error) {
    console.error('Error checking email verification status:', error);
    return { verified: false, email: null };
  }
}