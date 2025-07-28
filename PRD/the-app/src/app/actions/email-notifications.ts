'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isSiteAdmin, isTownAdmin, isPersonAdmin, hasPersonAccess } from '@/lib/permissions';
import bcrypt from 'bcryptjs';
import { EmailStatus } from '@prisma/client';
import { generateOptOutToken } from '@/lib/email-opt-out-tokens';
import crypto from 'crypto';
import { replaceTemplateVariablesWithUnsubscribe } from '@/lib/email-template-variables';

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
export async function getPersonFollowers(personId: string, includeHistoryComments = false) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Check if user has access to this person
  const hasAccess = await hasPersonAccess(session, personId, 'read') || 
                    isTownAdmin(session) || 
                    isPersonAdmin(session) ||
                    isSiteAdmin(session);
  
  if (!hasAccess) {
    throw new Error('Unauthorized');
  }

  // Build where clause for comments
  const whereClause: {
    email: { not: null };
    isApproved: boolean;
    hideRequested: boolean;
    OR?: Array<{ personId?: string; personHistoryId?: { in: string[] } }>;
    personId?: string;
  } = {
    email: {
      not: null,
    },
    isApproved: true, // Only consider approved comments
    hideRequested: false, // Exclude hidden comments
  };

  if (includeHistoryComments) {
    // Get all person history IDs for this person
    const personHistories = await prisma.personHistory.findMany({
      where: { personId },
      select: { id: true },
    });
    const historyIds = personHistories.map(h => h.id);

    // Include both regular comments on the person AND comments on their history
    whereClause.OR = [
      { personId },
      { personHistoryId: { in: historyIds } },
    ];
  } else {
    // Only get comments directly on the person
    whereClause.personId = personId;
  }

  // Get all users who have APPROVED comments
  const commenters = await prisma.comment.findMany({
    where: whereClause,
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
  },
  selectedFollowerIds?: string[]
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
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

    // Check if user has access to this person
    const hasAccess = await hasPersonAccess(session, update.personId, 'write') || 
                      isTownAdmin(session) || 
                      isPersonAdmin(session) ||
                      isSiteAdmin(session);
    
    if (!hasAccess) {
      throw new Error('Unauthorized');
    }

    // Get followers
    let followers = await getPersonFollowers(update.personId, true);
    
    // Filter to only selected followers if provided
    if (selectedFollowerIds && selectedFollowerIds.length > 0) {
      followers = followers.filter(f => selectedFollowerIds.includes(f.id));
    }

    // Create email notifications with opt-out tokens
    const emailNotifications = await Promise.all(
      followers.map(async (follower) => {
        // Generate unique opt-out tokens for this email
        const personOptOutToken = await generateOptOutToken(follower.id, update.personId);
        const allOptOutToken = await generateOptOutToken(follower.id);

        // Generate a magic link token for this follower
        const magicToken = await generateMagicLinkToken(follower.id, update.personId, update.id);
        
        // Generate the comment link with magic token
        const commentLink = `${process.env.NEXTAUTH_URL}/${update.person.town.slug}/${update.person.slug}?update=${update.id}&addComment=true&uid=${magicToken}`;
        
        // Get template or use custom content
        let finalSubject: string;
        let finalHtmlContent: string;
        let finalTextContent: string | null = null;
        let templateId: string | undefined;

        if (customContent?.templateId) {
          // Use template from database
          const template = await prisma.emailTemplate.findUnique({
            where: { id: customContent.templateId }
          });
          
          if (template) {
            finalSubject = template.subject;
            finalHtmlContent = template.htmlContent;
            finalTextContent = template.textContent;
            templateId = template.id;
          } else {
            // Fallback if template not found
            finalSubject = customContent?.subject || `Update on ${update.person.firstName} ${update.person.lastName}`;
            finalHtmlContent = customContent?.htmlContent || '';
            finalTextContent = customContent?.textContent || null;
          }
        } else if (customContent?.subject || customContent?.htmlContent) {
          // Use custom content
          finalSubject = customContent.subject || `Update on ${update.person.firstName} ${update.person.lastName}`;
          finalHtmlContent = customContent.htmlContent || '';
          finalTextContent = customContent.textContent || null;
        } else {
          // Use default template
          const defaultTemplate = await prisma.emailTemplate.findFirst({
            where: { name: 'person_history_update', isActive: true }
          });
          
          if (defaultTemplate) {
            finalSubject = defaultTemplate.subject;
            finalHtmlContent = defaultTemplate.htmlContent;
            finalTextContent = defaultTemplate.textContent;
            templateId = defaultTemplate.id;
          } else {
            throw new Error('No email template found for person history updates');
          }
        }
        
        // Replace recipient-specific variables
        const recipientVars = {
          recipientName: `${follower.firstName || ''} ${follower.lastName || ''}`.trim() || 'Supporter',
          recipientEmail: follower.email || '',
          personName: `${update.person.firstName} ${update.person.lastName}`,
          personFirstName: update.person.firstName,
          personLastName: update.person.lastName,
          townName: update.person.town.name,
          updateDescription: update.title,
          updateText: update.description,
          updateDate: new Date(update.date).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          updateId: update.id,
          commentLink,
          profileUrl: `${process.env.NEXTAUTH_URL}/${update.person.town.slug}/${update.person.slug}`,
          hideUrl: `${process.env.NEXTAUTH_URL}/api/profile/anonymous-comments?action=hide&email=${encodeURIComponent(follower.email || '')}`,
          manageUrl: `${process.env.NEXTAUTH_URL}/api/profile/anonymous-comments?email=${encodeURIComponent(follower.email || '')}`,
          personOptOutUrl: `${process.env.NEXTAUTH_URL}/unsubscribe?token=${personOptOutToken}&action=person`,
          allOptOutUrl: `${process.env.NEXTAUTH_URL}/unsubscribe?token=${allOptOutToken}&action=all`,
        };
        
        // Replace all variables in subject first
        Object.entries(recipientVars).forEach(([key, value]) => {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          finalSubject = finalSubject.replace(regex, value);
        });
        
        // Use enhanced function for HTML and text content to handle unsubscribe keywords
        const processedContent = replaceTemplateVariablesWithUnsubscribe(
          finalHtmlContent,
          finalTextContent,
          recipientVars
        );
        finalHtmlContent = processedContent.html;
        finalTextContent = processedContent.text;

        return {
          userId: follower.id,
          personId: update.personId,
          personHistoryId: update.id,
          subject: finalSubject,
          htmlContent: finalHtmlContent,
          textContent: finalTextContent,
          trackingEnabled: true,
          status: EmailStatus.QUEUED,
          templateId: templateId || customContent?.templateId,
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


// Generate a magic link token for pre-filling comment forms
async function generateMagicLinkToken(userId: string, personId: string, personHistoryId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry
  
  // Store the token in database for verification
  await prisma.magicLinkToken.create({
    data: {
      token,
      userId,
      personId,
      personHistoryId,
      expiresAt,
    },
  });
  
  return token;
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
        lastMailServerMessage: null,
        lastMailServerMessageDate: null,
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

  // Get total count
  const totalCount = await prisma.emailNotification.count({ where });

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
          title: true,
          description: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 500, // Limit to recent 500 emails
  });

  return {
    emails,
    totalCount,
  };
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
        // Clear server message if changing from FAILED to another status
        lastMailServerMessage: newStatus !== EmailStatus.FAILED ? null : undefined,
        lastMailServerMessageDate: newStatus !== EmailStatus.FAILED ? null : undefined,
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

// Delete selected email notifications
export async function deleteEmailNotifications(emailIds: string[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isSiteAdmin(session)) {
    throw new Error('Unauthorized');
  }

  try {
    const result = await prisma.emailNotification.deleteMany({
      where: {
        id: { in: emailIds },
      },
    });

    return { success: true, count: result.count };
  } catch (error) {
    console.error('Error deleting email notifications:', error);
    return { success: false, error: 'Failed to delete email notifications' };
  }
}