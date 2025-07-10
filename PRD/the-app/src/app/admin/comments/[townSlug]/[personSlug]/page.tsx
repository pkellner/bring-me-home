import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import CommentsGrid from '../../CommentsGrid';

interface PageProps {
  params: Promise<{ townSlug: string; personSlug: string }>;
}

export default async function PersonCommentsPage({ params }: PageProps) {
  const { townSlug, personSlug } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  if (!hasPermission(session, 'comments', 'read')) {
    redirect('/admin');
  }

  // Convert slugs to names
  const townName = townSlug.replace(/-/g, ' ');
  const [firstName, lastName] = personSlug
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1));

  // Find the person
  const person = await prisma.person.findFirst({
    where: {
      firstName: firstName,
      lastName: lastName,
      town: {
        name: townName,
      },
    },
    include: {
      town: true,
    },
  });

  if (!person) {
    redirect('/admin/comments');
  }

  // Check if user has access to this person or town
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
            townId: person.townId,
            accessLevel: 'admin',
          },
        },
        personAccess: {
          where: {
            personId: person.id,
            accessLevel: 'admin',
          },
        },
      },
    });

    const isSiteAdmin = userWithAccess?.userRoles.some(ur => ur.role.name === 'site-admin') || false;
    const hasTownAccess = (userWithAccess?.townAccess?.length ?? 0) > 0;
    const hasPersonAccess = (userWithAccess?.personAccess?.length ?? 0) > 0;

    if (!isSiteAdmin && !hasTownAccess && !hasPersonAccess) {
      redirect('/admin/comments');
    }
  }

  const rawComments = await prisma.comment.findMany({
    where: {
      personId: person.id,
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
          Comments for {person.firstName} {person.lastName}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          <a 
            href={`/${townSlug}/${personSlug}`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            View profile
          </a>
          {' • '}
          <a 
            href={`/admin/comments/${townSlug}`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            View all {person.town.name} comments
          </a>
        </p>
      </div>
      <CommentsGrid
        initialComments={comments}
        canApprove={canApprove}
        canDelete={canDelete}
        towns={towns}
        personId={person.id}
      />
    </div>
  );
}