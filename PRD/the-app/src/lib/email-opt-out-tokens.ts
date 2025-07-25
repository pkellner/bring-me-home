import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';

interface OptOutTokenData {
  userId: string;
  personId?: string;
}

export async function generateOptOutToken(userId: string, personId?: string): Promise<string> {
  const token = nanoid(32);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14); // 14 days expiration

  await prisma.emailOptOutToken.create({
    data: {
      token,
      userId,
      personId,
      expiresAt,
    },
  });

  return token;
}

export async function validateOptOutToken(token: string): Promise<OptOutTokenData | null> {
  const tokenRecord = await prisma.emailOptOutToken.findUnique({
    where: { token },
    select: {
      userId: true,
      personId: true,
      expiresAt: true,
      used: true,
    },
  });

  if (!tokenRecord) {
    return null;
  }

  if (tokenRecord.used) {
    return null;
  }

  if (new Date() > tokenRecord.expiresAt) {
    return null;
  }

  return {
    userId: tokenRecord.userId,
    personId: tokenRecord.personId || undefined,
  };
}

export async function consumeOptOutToken(token: string): Promise<OptOutTokenData | null> {
  const tokenData = await validateOptOutToken(token);

  if (!tokenData) {
    return null;
  }

  // Mark token as used
  await prisma.emailOptOutToken.update({
    where: { token },
    data: { used: true },
  });

  // Process the opt-out
  if (tokenData.personId) {
    // Person-specific opt-out
    await prisma.emailOptOut.upsert({
      where: {
        userId_personId: {
          userId: tokenData.userId,
          personId: tokenData.personId,
        },
      },
      update: {
        source: 'link',
        updatedAt: new Date(),
      },
      create: {
        userId: tokenData.userId,
        personId: tokenData.personId,
        source: 'link',
      },
    });
  } else {
    // Global opt-out
    await prisma.user.update({
      where: { id: tokenData.userId },
      data: { optOutOfAllEmail: true },
    });
  }

  return tokenData;
}

export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.emailOptOutToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { used: true },
      ],
    },
  });

  return result.count;
}