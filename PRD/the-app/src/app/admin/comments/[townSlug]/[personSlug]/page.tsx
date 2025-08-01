import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import CommentsGrid from '../../CommentsGrid';
import PersonCommentsClient from './PersonCommentsClient';

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

  // Get all PersonHistory records for this person to create numbering
  const personHistories = await prisma.personHistory.findMany({
    where: {
      personId: person.id,
    },
    orderBy: {
      date: 'asc', // Order by date ascending to assign numbers chronologically
    },
    select: {
      id: true,
      date: true,
    },
  });

  // Create a map of personHistoryId to number
  const personHistoryNumberMap: Record<string, number> = {};
  personHistories.forEach((history, index) => {
    personHistoryNumberMap[history.id] = index + 1;
  });

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
      personHistory: true,
      user: {
        select: {
          id: true,
          allowAnonymousComments: true,
          emailVerified: true,
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
    personHistory: comment.personHistory ? {
      ...comment.personHistory,
      date: comment.personHistory.date.toISOString(),
      createdAt: comment.personHistory.createdAt.toISOString(),
      updatedAt: comment.personHistory.updatedAt.toISOString(),
    } : null,
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
      <PersonCommentsClient
        person={{
          id: person.id,
          firstName: person.firstName,
          lastName: person.lastName,
          slug: person.slug,
          town: {
            name: person.town.name,
            state: person.town.state,
            slug: person.town.slug,
          },
        }}
        townSlug={townSlug}
        personSlug={personSlug}
      />
      <CommentsGrid
        initialComments={comments}
        canApprove={canApprove}
        canDelete={canDelete}
        towns={towns}
        personId={person.id}
        isSiteAdmin={isSiteAdmin}
        isPersonAdmin={isPersonAdmin}
        deleteDaysThreshold={deleteDaysThreshold}
        personHistoryNumberMap={personHistoryNumberMap}
      />
    </div>
  );
}