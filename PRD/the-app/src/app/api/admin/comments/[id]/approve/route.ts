import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission, hasPersonAccess, isSiteAdmin } from '@/lib/permissions';
import { approveBulkComments } from '@/app/actions/comments';

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

    // Get current comment with person info
    const comment = await prisma.comment.findUnique({
      where: { id },
      include: {
        person: true,
      },
    });

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check if user has access to this person (unless they're a site admin)
    if (!isSiteAdmin(session) && comment.personId && !hasPersonAccess(session, comment.personId, 'write')) {
      return NextResponse.json({ error: 'No access to this person' }, { status: 403 });
    }

    console.log(`[API APPROVE] Processing approval toggle for comment ${id}, current status: ${comment.isApproved}`);

    // If comment is currently not approved and we're approving it, use approveBulkComments
    // to handle email verification
    if (!comment.isApproved) {
      console.log(`[API APPROVE] Approving comment ${id} using approveBulkComments`);
      const result = await approveBulkComments([id]);
      
      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Failed to approve comment' }, { status: 500 });
      }

      // Get the updated comment
      const updatedComment = await prisma.comment.findUnique({
        where: { id },
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

      return NextResponse.json({
        success: true,
        comment: updatedComment,
      });
    }

    // If we're disapproving (toggling from approved to not approved), just update directly
    console.log(`[API APPROVE] Disapproving comment ${id}`);
    const updatedComment = await prisma.comment.update({
      where: { id },
      data: {
        isApproved: false,
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
