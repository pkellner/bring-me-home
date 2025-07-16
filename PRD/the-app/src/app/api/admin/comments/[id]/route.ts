import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission, hasRole } from '@/lib/permissions';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get comment first to check permissions
    const comment = await prisma.comment.findUnique({
      where: { id },
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check permissions
    const hasDeletePermission = hasPermission(session, 'comments', 'delete');
    const isPersonAdmin = hasRole(session, 'person-admin');

    // If person admin, check if they have access to this person and if comment is old enough
    let canDelete = hasDeletePermission;

    if (!canDelete && isPersonAdmin && session.user?.id) {
      // Check if user has admin access to this specific person
      const userWithAccess = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          personAccess: {
            where: {
              personId: comment.person.id,
              accessLevel: 'admin',
            },
          },
        },
      });

      if (userWithAccess?.personAccess?.length ?? 0 > 0) {
        // Check if comment is old enough (default 1 day)
        const deleteDaysThreshold = parseInt(process.env.COMMENT_DELETE_DAYS_THRESHOLD || '1', 10);
        const commentDate = new Date(comment.createdAt);
        const now = new Date();
        const daysDiff = (now.getTime() - commentDate.getTime()) / (1000 * 60 * 60 * 24);

        canDelete = daysDiff >= deleteDaysThreshold;
      }
    }

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the comment
    await prisma.comment.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE_COMMENT',
        entityType: 'Comment',
        entityId: id,
        newValues: JSON.stringify({
          commentId: id,
          personName: `${comment.person.firstName} ${comment.person.lastName}`,
          commenterName:
            comment.firstName && comment.lastName
              ? `${comment.firstName} ${comment.lastName}`
              : 'Anonymous',
          content: comment.content
            ? comment.content.substring(0, 100) + '...'
            : 'No content',
        }),
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
