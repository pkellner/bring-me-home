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

    // Generate opt-out token for unsubscribe link
    const { generateOptOutToken } = await import('@/lib/email-opt-out-tokens');
    const optOutToken = await generateOptOutToken(userId);
    
    // Queue verification email
    const verificationUrl = `${process.env.NEXTAUTH_URL}/verify/email?token=${token}`;
    const profileUrl = `${process.env.NEXTAUTH_URL}/profile`;
    const unsubscribeUrl = `${process.env.NEXTAUTH_URL}/unsubscribe?token=${optOutToken}`;
    
    // Get the appropriate template
    const templateName = isNewRegistration ? 'welcome_registration' : 'email_verification';
    const template = await prisma.emailTemplate.findUnique({
      where: { name: templateName },
    });

    if (template && template.isActive) {
      // Use template
      const { replaceTemplateVariables } = await import('@/lib/email-template-variables');
      
      const templateData = {
        firstName: user.firstName || user.username || 'there',
        verificationUrl,
        profileUrl,
        unsubscribeUrl,
      };

      const subject = replaceTemplateVariables(template.subject, templateData);
      const htmlContent = replaceTemplateVariables(template.htmlContent, templateData);
      const textContent = template.textContent ? replaceTemplateVariables(template.textContent, templateData) : null;
      // Create email notification in queue
      await prisma.emailNotification.create({
        data: {
          userId: user.id,
          templateId: template.id,
          subject,
          htmlContent,
          textContent,
          status: EmailStatus.QUEUED,
          sentTo: user.email,
          customizations: templateData,
        }
      });
    } else {
      // Fallback if template not found
      console.error(`Email template "${templateName}" not found or inactive`);
      throw new Error('Email template not configured');
    }

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

    // Get the most recent comment from this user to find the person they were commenting on
    const recentComment = await prisma.comment.findFirst({
      where: { 
        userId: user.id,
        isActive: true
      },
      orderBy: { createdAt: 'desc' },
      select: {
        personId: true,
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            slug: true,
            town: {
              select: {
                slug: true
              }
            }
          }
        }
      }
    });

    return { 
      success: true, 
      message: 'Email verified successfully',
      person: recentComment?.person ? {
        id: recentComment.person.id,
        firstName: recentComment.person.firstName,
        lastName: recentComment.person.lastName,
        slug: recentComment.person.slug,
        townSlug: recentComment.person.town.slug
      } : undefined
    };
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

export async function verifyAnonymousEmail(token: string) {
  try {
    // This function verifies the email for anonymous users
    // It uses the existing comment verification token system
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const verificationToken = await prisma.commentVerificationToken.findFirst({
      where: { 
        tokenHash,
        isActive: true
      }
    });

    if (!verificationToken) {
      return { success: false, error: 'Invalid or expired verification link' };
    }

    // Update token usage
    await prisma.commentVerificationToken.update({
      where: { id: verificationToken.id },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 },
        lastAction: 'email_verified'
      }
    });

    // Get the most recent comment for this email to get person info
    const recentComment = await prisma.comment.findFirst({
      where: { 
        email: verificationToken.email,
        isActive: true
      },
      orderBy: { createdAt: 'desc' },
      select: {
        personId: true,
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
    
    return { 
      success: true, 
      message: 'Email verified successfully',
      email: verificationToken.email,
      personId: recentComment?.personId,
      personName: recentComment?.person ? `${recentComment.person.firstName} ${recentComment.person.lastName}` : undefined
    };
  } catch (error) {
    console.error('Error verifying anonymous email:', error);
    return { success: false, error: 'Failed to verify email' };
  }
}

export async function sendAnonymousVerificationEmail(commentId: string, email: string, personName: string, firstName?: string) {
  try {
    // Generate or get verification token for this email
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    let verificationToken = await prisma.commentVerificationToken.findUnique({
      where: { email },
    });

    if (verificationToken) {
      // Update existing token with new hash
      await prisma.commentVerificationToken.update({
        where: { id: verificationToken.id },
        data: {
          tokenHash,
          lastUsedAt: new Date(),
          isActive: true
        }
      });
    } else {
      // Create new token
      verificationToken = await prisma.commentVerificationToken.create({
        data: {
          email,
          tokenHash,
        }
      });
    }

    // Get the template
    const template = await prisma.emailTemplate.findUnique({
      where: { name: 'anonymous_verification' },
    });

    if (!template || !template.isActive) {
      console.error('Anonymous verification email template not found or inactive');
      throw new Error('Email template not configured');
    }

    // Get comment details for the email
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { 
        personId: true,
        person: {
          select: {
            slug: true,
            town: {
              select: { slug: true }
            }
          }
        }
      }
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    // Generate URLs for the email
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/verify/anonymous?token=${token}`;
    const hideUrl = `${baseUrl}/verify/comments?token=${token}&action=hide`;
    const manageUrl = `${baseUrl}/verify/comments?token=${token}&action=manage`;
    
    // Check if user exists to generate proper opt-out tokens
    let personUnsubscribeUrl = manageUrl; // Default to manage URL
    let allUnsubscribeUrl = manageUrl; // Default to manage URL
    
    const emailUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    
    if (emailUser) {
      const { generateOptOutToken } = await import('@/lib/email-opt-out-tokens');
      const personOptOutToken = await generateOptOutToken(emailUser.id, comment.personId);
      const allOptOutToken = await generateOptOutToken(emailUser.id);
      personUnsubscribeUrl = `${baseUrl}/unsubscribe?token=${personOptOutToken}`;
      allUnsubscribeUrl = `${baseUrl}/unsubscribe?token=${allOptOutToken}`;
    }
    
    const { replaceTemplateVariables } = await import('@/lib/email-template-variables');
    
    const templateData = {
      firstName: firstName || 'there',
      personName,
      verificationUrl,
      hideUrl,
      manageUrl,
      personUnsubscribeUrl,
      allUnsubscribeUrl,
      personSlug: comment.person?.slug || '',
      townSlug: comment.person?.town?.slug || '',
    };

    const subject = replaceTemplateVariables(template.subject, templateData);
    const htmlContent = replaceTemplateVariables(template.htmlContent, templateData);
    const textContent = template.textContent ? replaceTemplateVariables(template.textContent, templateData) : null;

    // Create email notification in queue
    await prisma.emailNotification.create({
      data: {
        personId: comment.personId,
        templateId: template.id,
        subject,
        htmlContent,
        textContent,
        status: EmailStatus.QUEUED,
        sentTo: email,
        customizations: templateData,
      }
    });

    return { success: true, message: 'Verification email queued successfully' };
  } catch (error) {
    console.error('Error sending anonymous verification email:', error);
    return { success: false, error: 'Failed to send verification email' };
  }
}