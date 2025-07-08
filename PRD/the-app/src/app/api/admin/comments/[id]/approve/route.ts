import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, 'comments', 'update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get current comment
    const comment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Toggle approval status
    const updatedComment = await prisma.comment.update({
      where: { id },
      data: {
        isApproved: !comment.isApproved,
        updatedAt: new Date(),
      },
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            town: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: updatedComment.isApproved
          ? 'APPROVE_COMMENT'
          : 'DISAPPROVE_COMMENT',
        entityType: 'Comment',
        entityId: id,
        newValues: JSON.stringify({
          commentId: id,
          newStatus: updatedComment.isApproved ? 'approved' : 'pending',
          previousStatus: comment.isApproved ? 'approved' : 'pending',
        }),
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({
      success: true,
      comment: updatedComment,
    });
  } catch (error) {
    console.error('Error toggling comment approval:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
