import { prisma } from '@/lib/prisma';
import { EmailSuppression } from '@prisma/client';

// Suppression reasons
export const SUPPRESSION_REASONS = {
  BOUNCE_PERMANENT: 'bounce_permanent',
  BOUNCE_TRANSIENT: 'bounce_transient',
  SPAM_COMPLAINT: 'spam_complaint',
  MANUAL: 'manual',
  UNSUBSCRIBE_LINK: 'unsubscribe_link',
} as const;

export type SuppressionReason = typeof SUPPRESSION_REASONS[keyof typeof SUPPRESSION_REASONS];

// Suppression sources
export const SUPPRESSION_SOURCES = {
  SES_WEBHOOK: 'ses_webhook',
  ADMIN_ACTION: 'admin_action',
  USER_ACTION: 'user_action',
  SYSTEM: 'system',
} as const;

export type SuppressionSource = typeof SUPPRESSION_SOURCES[keyof typeof SUPPRESSION_SOURCES];

export interface AddSuppressionOptions {
  email: string;
  reason: SuppressionReason;
  reasonDetails?: string;
  source: SuppressionSource;
  bounceType?: string;
  bounceSubType?: string;
}

export interface SuppressionInfo {
  isSuppressed: boolean;
  suppression?: EmailSuppression;
}

/**
 * Check if an email address is suppressed
 */
export async function isEmailSuppressed(email: string): Promise<boolean> {
  if (!email) return false;
  
  const suppression = await prisma.emailSuppression.findUnique({
    where: { email: email.toLowerCase() },
  });
  
  return !!suppression;
}

/**
 * Get suppression information for an email
 */
export async function getSuppressionInfo(email: string): Promise<SuppressionInfo> {
  if (!email) {
    return { isSuppressed: false };
  }
  
  const suppression = await prisma.emailSuppression.findUnique({
    where: { email: email.toLowerCase() },
  });
  
  return {
    isSuppressed: !!suppression,
    suppression: suppression || undefined,
  };
}

/**
 * Add an email to the suppression list
 */
export async function addToSuppressionList(options: AddSuppressionOptions): Promise<EmailSuppression> {
  const { email, reason, reasonDetails, source, bounceType, bounceSubType } = options;
  
  // Upsert to handle duplicate entries gracefully
  const suppression = await prisma.emailSuppression.upsert({
    where: { email: email.toLowerCase() },
    update: {
      reason,
      reasonDetails,
      source,
      bounceType,
      bounceSubType,
      updatedAt: new Date(),
    },
    create: {
      email: email.toLowerCase(),
      reason,
      reasonDetails,
      source,
      bounceType,
      bounceSubType,
    },
  });
  
  // If it's a spam complaint or permanent bounce, also update the user's opt-out status
  if (reason === SUPPRESSION_REASONS.SPAM_COMPLAINT || reason === SUPPRESSION_REASONS.BOUNCE_PERMANENT) {
    await updateUserOptOut(email, reason, reasonDetails);
  }
  
  return suppression;
}

/**
 * Remove an email from the suppression list (admin action)
 */
export async function removeFromSuppressionList(email: string): Promise<boolean> {
  if (!email) return false;
  
  try {
    await prisma.emailSuppression.delete({
      where: { email: email.toLowerCase() },
    });
    return true;
  } catch {
    // Email wasn't in the suppression list
    return false;
  }
}

/**
 * Update user opt-out status based on suppression
 */
async function updateUserOptOut(email: string, reason: SuppressionReason, reasonDetails?: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  
  if (!user) return;
  
  let optOutNotes = '';
  
  switch (reason) {
    case SUPPRESSION_REASONS.SPAM_COMPLAINT:
      optOutNotes = 'Opted out by spam complaint via SES';
      break;
    case SUPPRESSION_REASONS.BOUNCE_PERMANENT:
      optOutNotes = `Opted out by permanent bounce: ${reasonDetails || 'Email address invalid'}`;
      break;
    case SUPPRESSION_REASONS.UNSUBSCRIBE_LINK:
      optOutNotes = 'Opted out by unsubscribe link';
      break;
    case SUPPRESSION_REASONS.MANUAL:
      optOutNotes = 'Opted out by admin action';
      break;
    default:
      optOutNotes = `Opted out by ${reason}`;
  }
  
  await prisma.user.update({
    where: { id: user.id },
    data: {
      optOutOfAllEmail: true,
      optOutNotes,
      optOutDate: new Date(),
    },
  });
}

/**
 * Get all suppressed emails with pagination
 */
export async function getSuppressionList(options: {
  page?: number;
  limit?: number;
  reason?: SuppressionReason;
  searchTerm?: string;
}) {
  const { page = 1, limit = 50, reason, searchTerm } = options;
  const skip = (page - 1) * limit;
  
  const where = {
    ...(reason && { reason }),
    ...(searchTerm && {
      OR: [
        { email: { contains: searchTerm } },
        { reasonDetails: { contains: searchTerm } },
      ],
    }),
  };
  
  const [suppressions, total] = await Promise.all([
    prisma.emailSuppression.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.emailSuppression.count({ where }),
  ]);
  
  return {
    suppressions,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Bulk check if multiple emails are suppressed
 */
export async function areEmailsSuppressed(emails: string[]): Promise<Map<string, boolean>> {
  if (!emails.length) return new Map();
  
  const normalizedEmails = emails.map(e => e.toLowerCase());
  const suppressions = await prisma.emailSuppression.findMany({
    where: {
      email: { in: normalizedEmails },
    },
    select: { email: true },
  });
  
  const suppressedSet = new Set(suppressions.map(s => s.email));
  const result = new Map<string, boolean>();
  
  for (const email of emails) {
    result.set(email, suppressedSet.has(email.toLowerCase()));
  }
  
  return result;
}

/**
 * Get suppression statistics
 */
export async function getSuppressionStats() {
  const stats = await prisma.emailSuppression.groupBy({
    by: ['reason'],
    _count: true,
  });
  
  const total = await prisma.emailSuppression.count();
  
  return {
    total,
    byReason: stats.reduce((acc, stat) => {
      acc[stat.reason] = stat._count;
      return acc;
    }, {} as Record<string, number>),
  };
}