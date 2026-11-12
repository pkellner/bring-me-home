import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Generate a secure token
export function generateVerificationToken(): string {
  // Generate 32 bytes of random data
  const buffer = crypto.randomBytes(32);
  // Convert to URL-safe base64
  return buffer.toString('base64url');
}

// Hash a token for storage
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Issues a fresh token for an email. There is one token per email, so this
// replaces the previous one: links in earlier emails to this address stop working.
export async function issueVerificationToken(email: string): Promise<string> {
  const token = generateVerificationToken();
  const tokenHash = hashToken(token);

  await prisma.commentVerificationToken.upsert({
    where: { email },
    update: {
      tokenHash,
      lastUsedAt: new Date(),
      isActive: true,
    },
    create: {
      email,
      tokenHash,
    },
  });

  return token;
}

// Verify a token
export async function verifyToken(token: string) {
  const tokenHash = hashToken(token);
  
  console.log('[verifyToken] Looking for token with hash:', tokenHash);
  
  const verificationToken = await prisma.commentVerificationToken.findFirst({
    where: {
      tokenHash,
      isActive: true,
    },
  });

  if (!verificationToken) {
    console.log('[verifyToken] No active token found with hash:', tokenHash);
    
    // Check if token exists but is inactive
    const inactiveToken = await prisma.commentVerificationToken.findFirst({
      where: { tokenHash },
    });
    
    if (inactiveToken) {
      console.log('[verifyToken] Found inactive token:', {
        id: inactiveToken.id,
        email: inactiveToken.email,
        isActive: inactiveToken.isActive,
        revokedAt: inactiveToken.revokedAt,
      });
    }
    
    return null;
  }

  console.log('[verifyToken] Found active token for email:', verificationToken.email);

  // Update usage stats
  await prisma.commentVerificationToken.update({
    where: { id: verificationToken.id },
    data: {
      lastUsedAt: new Date(),
      usageCount: { increment: 1 },
    },
  });

  return verificationToken;
}

// Generate verification URLs
export function generateVerificationUrls(baseUrl: string, token: string, personSlug: string, townSlug: string, commentId?: string) {
  const verifyBaseUrl = `${baseUrl}/verify/comments`;
  
  return {
    verificationUrl: commentId 
      ? `${baseUrl}/${townSlug}/${personSlug}#comment-${commentId}`
      : `${baseUrl}/${townSlug}/${personSlug}`,
    hideUrl: `${verifyBaseUrl}?token=${token}&action=hide`,
    manageUrl: `${verifyBaseUrl}?token=${token}&action=manage`,
  };
}