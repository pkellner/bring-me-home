import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import CommentsGrid from './CommentsGrid';

export default async function CommentsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  if (!hasPermission(session, 'comments', 'read')) {
    redirect('/admin');
  }

  const comments = await prisma.comment.findMany({
    include: {
      person: {
        include: {
          town: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const canApprove = hasPermission(session, 'comments', 'update');
  const canDelete = hasPermission(session, 'comments', 'delete');

  return (
    <CommentsGrid
      initialComments={comments}
      canApprove={canApprove}
      canDelete={canDelete}
    />
  );
}
