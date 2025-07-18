import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import CommentsGrid from '../../CommentsGrid';
import Link from 'next/link';
import { ArrowLeftIcon, GlobeAltIcon, PencilIcon } from '@heroicons/react/24/outline';

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

  // Find the person using slugs
  const person = await prisma.person.findFirst({
    where: {
      slug: personSlug,
      town: {
        slug: townSlug,
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
  let isSiteAdmin = false;
  let isPersonAdmin = false;
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

    isSiteAdmin = userWithAccess?.userRoles.some(ur => ur.role.name === 'site-admin') || false;
    const hasTownAccess = (userWithAccess?.townAccess?.length ?? 0) > 0;
    const hasPersonAccess = (userWithAccess?.personAccess?.length ?? 0) > 0;

    // Check if user has person-admin role
    const hasPersonAdminRole = userWithAccess?.userRoles.some(ur => ur.role.name === 'person-admin') || false;

    // User is a person admin if they have the person-admin role and access to this specific person
    isPersonAdmin = hasPersonAdminRole && hasPersonAccess;

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
  // Person admins can delete comments for their assigned persons (with age restrictions)
  const canDelete = hasPermission(session, 'comments', 'delete') || isPersonAdmin;

  // Get delete days threshold from environment variable
  const deleteDaysThreshold = parseInt(process.env.COMMENT_DELETE_DAYS_THRESHOLD || '1', 10);

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Comments for {person.firstName} {person.lastName}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {person.town.name}, {person.town.state}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/${townSlug}/${personSlug}`}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <GlobeAltIcon className="h-4 w-4 mr-2" />
              View Live Profile
            </Link>
            <Link
              href={`/admin/persons/${person.id}/edit`}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit Person
            </Link>
            <Link
              href={`/admin/comments/${townSlug}`}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              {person.town.name} Comments
            </Link>
          </div>
        </div>
      </div>
      <CommentsGrid
        initialComments={comments}
        canApprove={canApprove}
        canDelete={canDelete}
        towns={towns}
        personId={person.id}
        isSiteAdmin={isSiteAdmin}
        isPersonAdmin={isPersonAdmin}
        deleteDaysThreshold={deleteDaysThreshold}
      />
    </div>
  );
}