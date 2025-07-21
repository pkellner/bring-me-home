import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import CommentsGrid from '../CommentsGrid';
import Link from '@/components/OptimizedLink';
import { ArrowLeftIcon, GlobeAltIcon, UsersIcon } from '@heroicons/react/24/outline';

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

  // Find the town using slug
  const town = await prisma.town.findFirst({
    where: {
      slug: townSlug,
    },
  });

  if (!town) {
    redirect('/admin/comments');
  }

  // Check if user has access to this town
  let isSiteAdmin = false;
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

    isSiteAdmin = userWithAccess?.userRoles.some(ur => ur.role.name === 'site-admin') || false;
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

  // Serialize Decimal fields to strings and ensure dates are properly serialized
  const comments = rawComments.map(comment => ({
    ...comment,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    approvedAt: comment.approvedAt?.toISOString() || null,
    birthdate: comment.birthdate?.toISOString() || null,
    person: {
      ...comment.person,
      bondAmount: comment.person.bondAmount?.toString() || null,
      createdAt: comment.person.createdAt.toISOString(),
      updatedAt: comment.person.updatedAt.toISOString(),
      dateOfBirth: comment.person.dateOfBirth?.toISOString() || null,
      lastSeenDate: comment.person.lastSeenDate?.toISOString() || null,
      detentionDate: comment.person.detentionDate?.toISOString() || null,
      lastHeardFromDate: comment.person.lastHeardFromDate?.toISOString() || null,
      nextCourtDate: comment.person.nextCourtDate?.toISOString() || null,
      releaseDate: comment.person.releaseDate?.toISOString() || null,
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Comments for {town.name}, {town.state}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Showing all comments for people in {town.name}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/${townSlug}`}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <GlobeAltIcon className="h-4 w-4 mr-2" />
              View Live Site
            </Link>
            <Link
              href="/admin/persons"
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <UsersIcon className="h-4 w-4 mr-2" />
              Manage Persons
            </Link>
            <Link
              href="/admin/comments"
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              All Comments
            </Link>
          </div>
        </div>
      </div>
      <CommentsGrid
        initialComments={comments}
        canApprove={canApprove}
        canDelete={canDelete}
        towns={towns}
        isSiteAdmin={isSiteAdmin}
      />
    </div>
  );
}