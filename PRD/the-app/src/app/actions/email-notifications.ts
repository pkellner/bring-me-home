'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isSiteAdmin } from '@/lib/permissions';
import bcrypt from 'bcryptjs';
import { EmailStatus } from '@prisma/client';

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

  // Get all users who have commented on this person
  const commenters = await prisma.comment.findMany({
    where: {
      personId,
      email: {
        not: null,
      },
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
export async function sendUpdateEmail(personHistoryId: string) {
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

    // Create email notifications
    const emailNotifications = followers.map(follower => ({
      userId: follower.id,
      personId: update.personId,
      personHistoryId: update.id,
      subject: `Update on ${update.person.firstName} ${update.person.lastName}`,
      htmlContent: generateUpdateEmailHtml(update),
      textContent: generateUpdateEmailText(update),
      status: EmailStatus.QUEUED,
    }));

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
function generateUpdateEmailHtml(update: {
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
}): string {
  const personName = `${update.person.firstName} ${update.person.lastName}`;
  const profileUrl = `${process.env.NEXTAUTH_URL}/${update.person.town.slug}/${update.person.slug}`;
  const unsubscribeUrl = `${process.env.NEXTAUTH_URL}/profile#email-preferences`;
  
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
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 40px 0;">
      
      <p style="font-size: 12px; color: #718096;">
        You're receiving this email because you've shown support for ${personName}.
        <br>
        <a href="${unsubscribeUrl}" style="color: #4299e1;">Manage your email preferences</a>
      </p>
    </div>
  `;
}

// Generate plain text email content
function generateUpdateEmailText(update: {
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
}): string {
  const personName = `${update.person.firstName} ${update.person.lastName}`;
  const profileUrl = `${process.env.NEXTAUTH_URL}/${update.person.town.slug}/${update.person.slug}`;
  const unsubscribeUrl = `${process.env.NEXTAUTH_URL}/profile#email-preferences`;
  
  return `
Update on ${personName}

${update.description}

Posted on ${new Date(update.date).toLocaleDateString()}

View Profile: ${profileUrl}

---

You're receiving this email because you've shown support for ${personName}.
Manage your email preferences: ${unsubscribeUrl}
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