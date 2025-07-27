'use server';

import { prisma } from '@/lib/prisma';

export async function verifyMagicLink(token: string) {
  try {
    // Find the magic link token
    const magicToken = await prisma.magicLinkToken.findUnique({
      where: { token },
      include: {
        user: true,
      },
    });

    if (!magicToken) {
      return { success: false, error: 'Invalid token' };
    }

    // Check if token has expired
    if (new Date() > magicToken.expiresAt) {
      return { success: false, error: 'Token has expired' };
    }

    // Check if token has already been used
    if (magicToken.usedAt) {
      return { success: false, error: 'Token has already been used' };
    }

    // Get the user's most recent comment from EITHER regular comments OR person history comments
    // Fetch both types and determine which is most recent
    const [regularComment, historyComment] = await Promise.all([
      // Regular support message (personHistoryId is null)
      prisma.comment.findFirst({
        where: {
          email: magicToken.user.email,
          isApproved: true,
          personHistoryId: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          occupation: true,
          city: true,
          state: true,
          birthdate: true,
          displayNameOnly: true,
          showOccupation: true,
          showBirthdate: true,
          showCityState: true,
          showComment: true,
          createdAt: true,
        },
      }),
      // Person history update comment (personHistoryId is NOT null)
      prisma.comment.findFirst({
        where: {
          email: magicToken.user.email,
          isApproved: true,
          personHistoryId: { not: null },
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          occupation: true,
          city: true,
          state: true,
          birthdate: true,
          displayNameOnly: true,
          showOccupation: true,
          showBirthdate: true,
          showCityState: true,
          showComment: true,
          createdAt: true,
        },
      }),
    ]);

    // Determine which comment is most recent
    let recentComment = null;
    if (regularComment && historyComment) {
      // Both exist, pick the most recent one
      recentComment = regularComment.createdAt > historyComment.createdAt ? regularComment : historyComment;
    } else {
      // Only one exists (or neither)
      recentComment = regularComment || historyComment;
    }

    // Mark token as used
    await prisma.magicLinkToken.update({
      where: { id: magicToken.id },
      data: { usedAt: new Date() },
    });

    return {
      success: true,
      data: {
        user: {
          email: magicToken.user.email || '',
        },
        previousComment: recentComment ? {
          firstName: recentComment.firstName || '',
          lastName: recentComment.lastName || '',
          email: recentComment.email || '',
          occupation: recentComment.occupation,
          birthdate: recentComment.birthdate,
          city: recentComment.city,
          state: recentComment.state,
        } : undefined,
      },
    };
  } catch (error) {
    console.error('Error verifying magic link:', error);
    return { success: false, error: 'Failed to verify token' };
  }
}