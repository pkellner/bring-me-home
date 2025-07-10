import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import CommentsGrid from './CommentsGrid';

interface CommentsPageProps {
  searchParams: Promise<{ personId?: string }>;
}

export default async function CommentsPage({ searchParams }: CommentsPageProps) {
  const session = await getServerSession(authOptions);
  const { personId } = await searchParams;

  if (!session) {
    redirect('/auth/signin');
  }

  if (!hasPermission(session, 'comments', 'read')) {
    redirect('/admin');
  }

  // If personId is provided, check if user has access to this person
  if (personId) {
    const userWithAccess = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
        personAccess: {
          where: {
            personId: personId,
            accessLevel: 'admin',
          },
        },
      },
    });

    const person = await prisma.person.findUnique({
      where: { id: personId },
      include: {
        town: true,
      },
    });

    if (person) {
      // Check if user has admin access to the person's town
      const townAccess = await prisma.townAccess.findFirst({
        where: {
          userId: session.user.id,
          townId: person.townId,
          accessLevel: 'admin',
        },
      });

      const isSiteAdmin = userWithAccess?.userRoles.some(ur => ur.role.name === 'site-admin') || false;
      const hasPersonAccess = (userWithAccess?.personAccess?.length ?? 0) > 0;
      const hasTownAccess = !!townAccess;

      if (!isSiteAdmin && !hasPersonAccess && !hasTownAccess) {
        redirect('/admin');
      }
    }
  }

  const whereClause = personId ? { personId } : {};
  const rawComments = await prisma.comment.findMany({
    where: whereClause,
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

  // Serialize Decimal fields to strings
  const comments = rawComments.map(comment => ({
    ...comment,
    person: {
      ...comment.person,
      bondAmount: comment.person.bondAmount?.toString() || null,
    },
  }));

  const towns = await prisma.town.findMany({
    where: {
      isActive: true,
    },
    orderBy: [{ state: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      state: true,
    },
  });

  const canApprove = hasPermission(session, 'comments', 'update');
  const canDelete = hasPermission(session, 'comments', 'delete');

  return (
    <CommentsGrid
      initialComments={comments}
      canApprove={canApprove}
      canDelete={canDelete}
      towns={towns}
      personId={personId}
    />
  );
}
