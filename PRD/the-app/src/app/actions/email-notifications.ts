'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isSiteAdmin } from '@/lib/permissions';
import bcrypt from 'bcryptjs';
import { EmailStatus } from '@prisma/client';
import { generateOptOutToken } from '@/lib/email-opt-out-tokens';

// Toggle email opt-out for a specific person
export async function toggleEmailOptOut(personId: string, optOut: boolean) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  try {
    if (optOut) {
      // Create opt-out record
      await prisma.emailOptOut.create({
        data: {
          userId: session.user.id,
          personId,
        },
      });
    } else {
      // Remove opt-out record
      await prisma.emailOptOut.deleteMany({
        where: {
          userId: session.user.id,
          personId,
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error toggling email opt-out:', error);
    return { success: false, error: 'Failed to update email preferences' };
  }
}

// Get email opt-out status for current user
export async function getEmailOptOuts() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      optOutOfAllEmail: true,
      emailOptOuts: {
        select: {
          personId: true,
        },
      },
    },
  });

  return {
    globalOptOut: user?.optOutOfAllEmail || false,
    personOptOuts: user?.emailOptOuts.map(opt => opt.personId) || [],
  };
}

// Toggle global email opt-out
export async function toggleGlobalEmailOptOut(optOut: boolean) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { optOutOfAllEmail: optOut },
    });

    return { success: true };
  } catch (error) {
    console.error('Error toggling global email opt-out:', error);
    return { success: false, error: 'Failed to update email preferences' };
  }
}

// Create users from comment emails (admin only)
export async function createUsersFromCommentEmails() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isSiteAdmin(session)) {
    throw new Error('Unauthorized');
  }

  try {
    // Get all unique emails from comments
    const comments = await prisma.comment.findMany({
      where: {
        email: {
          not: null,
        },
      },
      select: {
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    const uniqueEmails = new Map<string, { firstName?: string; lastName?: string }>();
    
    for (const comment of comments) {
      if (comment.email && !uniqueEmails.has(comment.email)) {
        uniqueEmails.set(comment.email, {
          firstName: comment.firstName || undefined,
          lastName: comment.lastName || undefined,
        });
      }
    }

    // Check which emails already have users
    const existingUsers = await prisma.user.findMany({
      where: {
        email: {
          in: Array.from(uniqueEmails.keys()),
        },
      },
      select: {
        email: true,
      },
    });

    const existingEmails = new Set(existingUsers.map(u => u.email).filter(Boolean));
    
    // Create users for emails that don't have accounts
    const newUsers = [];
    for (const [email, info] of uniqueEmails) {
      if (!existingEmails.has(email)) {
        // Generate a random password (they'll need to reset it)
        const tempPassword = await bcrypt.hash(Math.random().toString(36).substring(7), 10);
        
        newUsers.push({
          username: email,
          email,
          password: tempPassword,
          firstName: info.firstName,
          lastName: info.lastName,
          isActive: true,
        });
      }
    }

    // Create all new users
    const created = await prisma.user.createMany({
      data: newUsers,
      skipDuplicates: true,
    });

    return {
      success: true,
      created: created.count,
      skipped: uniqueEmails.size - created.count,
    };
  } catch (error) {
    console.error('Error creating users from emails:', error);
    return { success: false, error: 'Failed to create users' };
  }
}

// Get followers for a person (users who have commented and not opted out)
export async function getPersonFollowers(personId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isSiteAdmin(session)) {
    throw new Error('Unauthorized');
  }

  // Get all users who have APPROVED comments on this person
  const commenters = await prisma.comment.findMany({
    where: {
      personId,
      email: {
        not: null,
      },
      isApproved: true, // Only consider approved comments
    },
    select: {
      email: true,
    },
    distinct: ['email'],
  });

  const emails = commenters.map(c => c.email).filter(Boolean) as string[];

  // Get users with these emails who haven't opted out
  const followers = await prisma.user.findMany({
    where: {
      email: {
        in: emails,
      },
      optOutOfAllEmail: false,
      NOT: {
        emailOptOuts: {
          some: {
            personId,
          },
        },
      },
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  return followers;
}

// Send email update to followers
export async function sendUpdateEmail(
  personHistoryId: string,
  customContent?: {
    subject?: string;
    htmlContent?: string;
    textContent?: string;
    templateId?: string;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isSiteAdmin(session)) {
    throw new Error('Unauthorized');
  }

  try {
    // Get the person history update
    const update = await prisma.personHistory.findUnique({
      where: { id: personHistoryId },
      include: {
        person: {
          include: {
            town: true,
            personImages: {
              where: { imageType: 'primary' },
              include: { image: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!update) {
      throw new Error('Update not found');
    }

    // Get followers
    const followers = await getPersonFollowers(update.personId);

    // Create email notifications with opt-out tokens
    const emailNotifications = await Promise.all(
      followers.map(async (follower) => {
        // Generate unique opt-out tokens for this email
        const personOptOutToken = await generateOptOutToken(follower.id, update.personId);
        const allOptOutToken = await generateOptOutToken(follower.id);

        // Replace variables in custom content if provided
        let finalSubject = customContent?.subject || `Update on ${update.person.firstName} ${update.person.lastName}`;
        let finalHtmlContent = customContent?.htmlContent || generateUpdateEmailHtml(update, personOptOutToken, allOptOutToken);
        let finalTextContent = customContent?.textContent || generateUpdateEmailText(update, personOptOutToken, allOptOutToken);
        
        // Replace recipient-specific variables
        const recipientVars = {
          recipientName: `${follower.firstName || ''} ${follower.lastName || ''}`.trim() || 'Supporter',
          recipientEmail: follower.email || '',
          personOptOutUrl: `${process.env.NEXTAUTH_URL}/unsubscribe?token=${personOptOutToken}&action=person`,
          allOptOutUrl: `${process.env.NEXTAUTH_URL}/unsubscribe?token=${allOptOutToken}&action=all`,
        };
        
        finalSubject = finalSubject.replace(/\{\{recipientName\}\}/g, recipientVars.recipientName);
        finalSubject = finalSubject.replace(/\{\{recipientEmail\}\}/g, recipientVars.recipientEmail);
        
        finalHtmlContent = finalHtmlContent.replace(/\{\{recipientName\}\}/g, recipientVars.recipientName);
        finalHtmlContent = finalHtmlContent.replace(/\{\{recipientEmail\}\}/g, recipientVars.recipientEmail);
        finalHtmlContent = finalHtmlContent.replace(/\{\{personOptOutUrl\}\}/g, recipientVars.personOptOutUrl);
        finalHtmlContent = finalHtmlContent.replace(/\{\{allOptOutUrl\}\}/g, recipientVars.allOptOutUrl);
        
        if (finalTextContent) {
          finalTextContent = finalTextContent.replace(/\{\{recipientName\}\}/g, recipientVars.recipientName);
          finalTextContent = finalTextContent.replace(/\{\{recipientEmail\}\}/g, recipientVars.recipientEmail);
          finalTextContent = finalTextContent.replace(/\{\{personOptOutUrl\}\}/g, recipientVars.personOptOutUrl);
          finalTextContent = finalTextContent.replace(/\{\{allOptOutUrl\}\}/g, recipientVars.allOptOutUrl);
        }

        return {
          userId: follower.id,
          personId: update.personId,
          personHistoryId: update.id,
          subject: finalSubject,
          htmlContent: finalHtmlContent,
          textContent: finalTextContent,
          status: EmailStatus.QUEUED,
          templateId: customContent?.templateId,
        };
      })
    );

    // Create all email notifications
    const created = await prisma.emailNotification.createMany({
      data: emailNotifications,
    });

    return {
      success: true,
      emailsQueued: created.count,
    };
  } catch (error) {
    console.error('Error sending update email:', error);
    return { success: false, error: 'Failed to queue emails' };
  }
}

// Generate HTML email content
function generateUpdateEmailHtml(
  update: {
    person: {
      firstName: string;
      lastName: string;
      town: {
        slug: string;
      };
      slug: string;
    };
    description: string;
    date: Date;
  },
  personOptOutToken: string,
  allOptOutToken: string
): string {
  const personName = `${update.person.firstName} ${update.person.lastName}`;
  const profileUrl = `${process.env.NEXTAUTH_URL}/${update.person.town.slug}/${update.person.slug}`;
  const personUnsubscribeUrl = `${process.env.NEXTAUTH_URL}/unsubscribe?token=${personOptOutToken}&action=person`;
  const allUnsubscribeUrl = `${process.env.NEXTAUTH_URL}/unsubscribe?token=${allOptOutToken}&action=all`;
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a202c;">Update on ${personName}</h2>
      
      <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="font-size: 16px; color: #2d3748; margin: 0;">
          ${update.description}
        </p>
        <p style="font-size: 14px; color: #718096; margin-top: 10px;">
          Posted on ${new Date(update.date).toLocaleDateString()}
        </p>
      </div>
      
      <div style="margin: 30px 0;">
        <a href="${profileUrl}" style="background-color: #4299e1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          View Profile
        </a>
      </div>
      
      <!-- Professional Email Footer -->
      <table style="width: 100%; margin-top: 40px;">
        <tr>
          <td>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 30px 0;">
          </td>
        </tr>
      </table>
      
      <div style="text-align: center; padding: 0 20px;">
        <p style="font-size: 13px; color: #718096; margin-bottom: 20px; line-height: 1.6;">
          You're receiving this email because you've shown support for ${personName} on Bring Me Home.
        </p>
        
        <div style="margin: 20px 0;">
          <a href="${personUnsubscribeUrl}" style="
            color: #718096;
            font-size: 12px;
            text-decoration: underline;
            display: inline-block;
            margin: 0 10px;
          ">
            Unsubscribe from emails about ${personName}
          </a>
          <span style="color: #cbd5e0; margin: 0 5px;">|</span>
          <a href="${allUnsubscribeUrl}" style="
            color: #718096;
            font-size: 12px;
            text-decoration: underline;
            display: inline-block;
            margin: 0 10px;
          ">
            Unsubscribe from all Bring Me Home emails
          </a>
        </div>
        
        <p style="font-size: 11px; color: #a0aec0; margin-top: 20px; line-height: 1.5;">
          These are one-click unsubscribe links that expire after 14 days.<br>
          To manage your email preferences or resubscribe, please log in at 
          <a href="${process.env.NEXTAUTH_URL}/profile" style="color: #a0aec0; text-decoration: underline;">bring-me-home.com</a>
        </p>
        
        <p style="font-size: 11px; color: #cbd5e0; margin-top: 15px;">
          © ${new Date().getFullYear()} Bring Me Home. All rights reserved.
        </p>
      </div>
    </div>
  `;
}

// Generate plain text email content
function generateUpdateEmailText(
  update: {
    person: {
      firstName: string;
      lastName: string;
      town: {
        slug: string;
      };
      slug: string;
    };
    description: string;
    date: Date;
  },
  personOptOutToken: string,
  allOptOutToken: string
): string {
  const personName = `${update.person.firstName} ${update.person.lastName}`;
  const profileUrl = `${process.env.NEXTAUTH_URL}/${update.person.town.slug}/${update.person.slug}`;
  const personUnsubscribeUrl = `${process.env.NEXTAUTH_URL}/unsubscribe?token=${personOptOutToken}&action=person`;
  const allUnsubscribeUrl = `${process.env.NEXTAUTH_URL}/unsubscribe?token=${allOptOutToken}&action=all`;
  
  return `
Update on ${personName}

${update.description}

Posted on ${new Date(update.date).toLocaleDateString()}

View Profile: ${profileUrl}

========================================

You're receiving this email because you've shown support for ${personName} on Bring Me Home.

MANAGE EMAIL PREFERENCES:

Unsubscribe from emails about ${personName}:
${personUnsubscribeUrl}

Unsubscribe from all Bring Me Home emails:
${allUnsubscribeUrl}

These are one-click unsubscribe links that expire after 14 days.
To manage your email preferences or resubscribe, please log in at bring-me-home.com/profile

© ${new Date().getFullYear()} Bring Me Home. All rights reserved.
  `;
}

// Get email notification statistics
export async function getEmailStats() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isSiteAdmin(session)) {
    throw new Error('Unauthorized');
  }

  const stats = await prisma.emailNotification.groupBy({
    by: ['status'],
    _count: {
      id: true,
    },
  });

  const total = await prisma.emailNotification.count();
  
  return {
    total,
    byStatus: Object.fromEntries(
      stats.map(s => [s.status, s._count.id])
    ),
  };
}

// Retry failed emails
export async function retryFailedEmails(emailIds?: string[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isSiteAdmin(session)) {
    throw new Error('Unauthorized');
  }

  try {
    const where = {
      status: EmailStatus.FAILED,
      retryCount: {
        lt: prisma.emailNotification.fields.maxRetries,
      },
      ...(emailIds ? { id: { in: emailIds } } : {}),
    };

    const updated = await prisma.emailNotification.updateMany({
      where,
      data: {
        status: EmailStatus.QUEUED,
        errorMessage: null,
      },
    });

    return {
      success: true,
      retriedCount: updated.count,
    };
  } catch (error) {
    console.error('Error retrying failed emails:', error);
    return { success: false, error: 'Failed to retry emails' };
  }
}

// Get all email notifications with filters
export async function getEmailNotifications(filters?: {
  status?: EmailStatus;
  personId?: string;
  userId?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isSiteAdmin(session)) {
    throw new Error('Unauthorized');
  }

  const where: Record<string, unknown> = {};
  
  if (filters?.status) {
    where.status = filters.status;
  }
  
  if (filters?.personId) {
    where.personId = filters.personId;
  }
  
  if (filters?.userId) {
    where.userId = filters.userId;
  }

  const emails = await prisma.emailNotification.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      person: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      personHistory: {
        select: {
          id: true,
          description: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 500, // Limit to recent 500 emails
  });

  return emails;
}

// Send queued emails (mark as ready to send and trigger sending)
export async function sendQueuedEmails(emailIds: string[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isSiteAdmin(session)) {
    throw new Error('Unauthorized');
  }

  try {
    // Update status to SENDING
    const updated = await prisma.emailNotification.updateMany({
      where: {
        id: { in: emailIds },
        status: EmailStatus.QUEUED,
      },
      data: {
        status: EmailStatus.SENDING,
      },
    });

    // Trigger the email sending by calling the cron endpoint
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const cronUrl = `${baseUrl}/api/cron/send-emails`;
    
    try {
      const response = await fetch(cronUrl, {
        method: 'GET',
        headers: process.env.CRON_SECRET ? {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`
        } : {},
      });
      
      if (!response.ok) {
        console.error('Failed to trigger email cron job:', response.status, await response.text());
      } else {
        const result = await response.json();
        console.log('Email cron job triggered:', result);
      }
    } catch (fetchError) {
      console.error('Error calling email cron job:', fetchError);
      // Don't throw - emails are marked as SENDING and cron can pick them up later
    }

    return {
      success: true,
      sentCount: updated.count,
    };
  } catch (error) {
    console.error('Error sending emails:', error);
    return { success: false, error: 'Failed to send emails' };
  }
}

// Get distinct persons who have email notifications
export async function getPersonsWithEmails() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isSiteAdmin(session)) {
    throw new Error('Unauthorized');
  }

  const persons = await prisma.person.findMany({
    where: {
      emailNotifications: {
        some: {},
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
    orderBy: [
      { firstName: 'asc' },
      { lastName: 'asc' },
    ],
  });

  return persons;
}

// Update email notification status
export async function updateEmailStatus(emailId: string, newStatus: EmailStatus) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isSiteAdmin(session)) {
    throw new Error('Unauthorized');
  }

  try {
    const updated = await prisma.emailNotification.update({
      where: { id: emailId },
      data: { 
        status: newStatus,
        // Clear error message if changing from FAILED to another status
        errorMessage: newStatus !== EmailStatus.FAILED ? null : undefined,
        // Update sentAt if changing to SENT
        sentAt: newStatus === EmailStatus.SENT ? new Date() : undefined,
        // Update deliveredAt if changing to DELIVERED
        deliveredAt: newStatus === EmailStatus.DELIVERED ? new Date() : undefined,
        // Update openedAt if changing to OPENED
        openedAt: newStatus === EmailStatus.OPENED ? new Date() : undefined,
      },
    });

    return { success: true, email: updated };
  } catch (error) {
    console.error('Error updating email status:', error);
    return { success: false, error: 'Failed to update email status' };
  }
}