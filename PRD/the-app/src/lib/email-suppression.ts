import { prisma } from '@/lib/prisma';
import { EmailSuppression, Prisma } from '@prisma/client';
import { SUPPRESSION_REASONS, type SuppressionReason, type SuppressionSource } from './email-suppression-constants';
import { normalizeEmail } from './normalize-identity';

// Re-export constants from the separate file
export { 
  SUPPRESSION_REASONS, 
  SUPPRESSION_SOURCES,
  type SuppressionReason,
  type SuppressionSource
} from './email-suppression-constants';

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
    where: { email: normalizeEmail(email) },
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
    where: { email: normalizeEmail(email) },
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
    where: { email: normalizeEmail(email) },
    update: {
      reason,
      reasonDetails,
      source,
      bounceType,
      bounceSubType,
      updatedAt: new Date(),
    },
    create: {
      email: normalizeEmail(email),
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
      where: { email: normalizeEmail(email) },
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
    where: { email: normalizeEmail(email) },
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
  
  const where: Prisma.EmailSuppressionWhereInput = {
    ...(reason && { reason }),
    ...(searchTerm && {
      OR: [
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { reasonDetails: { contains: searchTerm, mode: 'insensitive' } },
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
  
  const suppressions = await prisma.emailSuppression.findMany({
    where: {
      email: { in: emails.map(normalizeEmail) },
    },
    select: { email: true },
  });
  
  const suppressedSet = new Set(suppressions.map(s => s.email));
  const result = new Map<string, boolean>();
  
  for (const email of emails) {
    result.set(email, suppressedSet.has(normalizeEmail(email)));
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