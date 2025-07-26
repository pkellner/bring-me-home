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

// Create or get existing verification token for an email
export async function getOrCreateVerificationToken(email: string): Promise<{
  token: string;
  isNew: boolean;
}> {
  // Check for existing active token
  const existing = await prisma.commentVerificationToken.findFirst({
    where: {
      email,
      isActive: true,
    },
  });

  if (existing) {
    // Token exists but we don't have the plain token
    // For existing tokens, we'll need to regenerate
    // In practice, we'd store encrypted tokens, but for this implementation
    // we'll generate a new one
    return { token: '', isNew: false };
  }

  // Generate new token
  const token = generateVerificationToken();
  const tokenHash = hashToken(token);

  // Store token
  await prisma.commentVerificationToken.create({
    data: {
      email,
      tokenHash,
    },
  });

  return { token, isNew: true };
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