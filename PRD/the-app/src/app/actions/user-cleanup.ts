'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isSiteAdmin } from '@/lib/permissions';

/**
 * Cleanup orphaned data when a user is deleted
 * This should be called after deleting a user to clean up related data
 * that doesn't cascade delete automatically
 */
export async function cleanupDeletedUserData(userEmail: string | null) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !isSiteAdmin(session)) {
    throw new Error('Unauthorized - only site admins can perform cleanup');
  }

  if (!userEmail) {
    return { 
      success: true, 
      message: 'No email to cleanup',
      cleaned: {
        commentTokens: 0,
        comments: 0,
        anonymousSupport: 0
      }
    };
  }

  try {
    // Start a transaction to ensure all cleanup happens atomically
    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete comment verification tokens for this email
      const deletedTokens = await tx.commentVerificationToken.deleteMany({
        where: { email: userEmail }
      });

      // 2. Clear email from comments (keep the comments but remove PII)
      const updatedComments = await tx.comment.updateMany({
        where: { 
          email: userEmail,
          userId: null // Only update orphaned comments
        },
        data: { 
          email: null,
          phone: null, // Also clear phone for privacy
          streetAddress: null,
          city: null,
          state: null,
          zipCode: null
        }
      });

      return {
        commentTokens: deletedTokens.count,
        comments: updatedComments.count,
        anonymousSupport: 0 // AnonymousSupport doesn't store PII
      };
    });

    return {
      success: true,
      message: 'Cleanup completed successfully',
      cleaned: result
    };
  } catch (error) {
    console.error('Error cleaning up deleted user data:', error);
    return {
      success: false,
      message: 'Failed to cleanup user data',
      error: error instanceof Error ? error.message : 'Unknown error',
      cleaned: {
        commentTokens: 0,
        comments: 0,
        anonymousSupport: 0
      }
    };
  }
}

/**
 * Get a summary of data that would be cleaned up for a user
 * Useful for showing admins what will happen before deletion
 */
export async function getCleanupSummary(userEmail: string | null) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !isSiteAdmin(session)) {
    throw new Error('Unauthorized - only site admins can view cleanup summary');
  }

  if (!userEmail) {
    return {
      commentTokens: 0,
      orphanedComments: 0,
      orphanedSupport: 0,
      totalAffectedRecords: 0
    };
  }

  const [commentTokens, orphanedComments, orphanedSupport] = await Promise.all([
    // Count comment verification tokens
    prisma.commentVerificationToken.count({
      where: { email: userEmail }
    }),
    
    // Count orphaned comments (comments without userId)
    prisma.comment.count({
      where: { 
        email: userEmail,
        userId: null
      }
    }),
    
    // AnonymousSupport doesn't store email/PII
    Promise.resolve(0)
  ]);

  return {
    commentTokens,
    orphanedComments,
    orphanedSupport,
    totalAffectedRecords: commentTokens + orphanedComments + orphanedSupport
  };
}