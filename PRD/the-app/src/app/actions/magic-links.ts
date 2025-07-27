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

    // Get the user's most recent comment to pre-fill form
    const recentComment = await prisma.comment.findFirst({
      where: {
        email: magicToken.user.email,
        isApproved: true,
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
      },
    });

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