import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import CommentsGrid from '../CommentsGrid';

interface PageProps {
  params: Promise<{ townSlug: string }>;
}

export default async function TownCommentsPage({ params }: PageProps) {
  const { townSlug } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  if (!hasPermission(session, 'comments', 'read')) {
    redirect('/admin');
  }

  // Convert slug to town name
  const townName = townSlug.replace(/-/g, ' ');
  
  // Find the town
  const town = await prisma.town.findFirst({
    where: {
      name: townName,
    },
  });

  if (!town) {
    redirect('/admin/comments');
  }

  // Check if user has access to this town
  if (session.user?.id) {
    const userWithAccess = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
        townAccess: {
          where: {
            townId: town.id,
            accessLevel: 'admin',
          },
        },
      },
    });

    const isSiteAdmin = userWithAccess?.userRoles.some(ur => ur.role.name === 'site-admin') || false;
    const hasTownAccess = (userWithAccess?.townAccess?.length ?? 0) > 0;

    if (!isSiteAdmin && !hasTownAccess) {
      redirect('/admin/comments');
    }
  }

  const rawComments = await prisma.comment.findMany({
    where: {
      person: {
        townId: town.id,
      },
    },
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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Comments for {town.name}, {town.state}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Showing all comments for people in {town.name}
        </p>
      </div>
      <CommentsGrid
        initialComments={comments}
        canApprove={canApprove}
        canDelete={canDelete}
        towns={towns}
      />
    </div>
  );
}