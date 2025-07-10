import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';

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

    if (!hasPermission(session, 'comments', 'delete')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get comment for audit log
    const comment = await prisma.comment.findUnique({
      where: { id },
      include: {
        person: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
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
