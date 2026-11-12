import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/comment-verification';
import { normalizeEmail } from '@/lib/normalize-identity';

// Returns the address as stored for the proof that matched (a signed-in account
// whose email is verified, or an active comment-verification token), or null.
// Accounts can be registered with any address, so an unverified one proves nothing.
export async function authorizeCommentEmail(
  email: string,
  token: string | null
): Promise<string | null> {
  const wanted = normalizeEmail(email);

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, emailVerified: true },
    });
    if (user?.email && user.emailVerified && normalizeEmail(user.email) === wanted) {
      return user.email;
    }
  }

  if (token) {
    const verificationToken = await verifyToken(token);
    if (verificationToken && normalizeEmail(verificationToken.email) === wanted) {
      return verificationToken.email;
    }
  }

  return null;
}
