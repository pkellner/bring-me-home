import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { verifyToken } from '@/lib/comment-verification';
import { normalizeEmail, normalizeOptionalEmail } from '@/lib/normalize-identity';

interface ContextProps {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: ContextProps
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    
    // Get the comment first
    const comment = await prisma.comment.findUnique({
      where: { id },
      select: { email: true },
    });

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Check authorization: either admin or has valid token for this email.
    // Emails are compared in their normal form; a comment without an email matches no one.
    const isAdmin = session && hasPermission(session, 'comments', 'update');
    const commentEmail = normalizeOptionalEmail(comment.email);
    
    // Check if user has a valid token for this email
    let hasValidToken = false;
    const token = request.headers.get('x-verification-token');
    if (token) {
      const verificationToken = await verifyToken(token);
      if (verificationToken && commentEmail !== null && normalizeEmail(verificationToken.email) === commentEmail) {
        hasValidToken = true;
      }
    }

    if (!isAdmin && !hasValidToken) {
      // Check if the logged-in user owns this email
      if (!session || commentEmail === null || normalizeOptionalEmail(session.user.email) !== commentEmail) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const body = await request.json();
    const { hideRequested } = body;

    // Update the comment
    const updatedComment = await prisma.comment.update({
      where: { id },
      data: {
        hideRequested: hideRequested,
        hideRequestedAt: hideRequested ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      hideRequested: updatedComment.hideRequested,
    });
  } catch (error) {
    console.error('Error updating comment visibility:', error);
    return NextResponse.json(
      { error: 'Failed to update comment visibility' },
      { status: 500 }
    );
  }
}