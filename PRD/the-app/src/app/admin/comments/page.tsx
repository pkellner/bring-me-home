import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, getUserAccessiblePersons } from '@/lib/permissions';
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

  // If personId is provided, redirect to the new URL structure
  if (personId) {
    const person = await prisma.person.findUnique({
      where: { id: personId },
      include: {
        town: true,
      },
    });

    if (person) {
      // Redirect to the new URL structure
      redirect(`/admin/comments/${person.town.slug}/${person.slug}`);
    }
  }

  // Get accessible person IDs for the current user
  const accessiblePersonIds = getUserAccessiblePersons(session);
  
  // Build where clause based on person access
  const whereClause = personId 
    ? { personId } 
    : accessiblePersonIds.includes('*')
      ? {} // Site admin - no filtering needed
      : {
          personId: {
            in: accessiblePersonIds
          }
        };
        
  const rawComments = await prisma.comment.findMany({
    where: whereClause,
    include: {
      person: {
        include: {
          town: true,
        },
      },
      personHistory: {
        select: {
          id: true,
          description: true,
          date: true,
        },
      },
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
  const canDelete = hasPermission(session, 'comments', 'delete');
  
  // Check if user is site admin
  const userWithRoles = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  });

  const isSiteAdmin =
    userWithRoles?.userRoles.some(ur => ur.role.name === 'site-admin') || false;

  return (
    <CommentsGrid
      initialComments={comments}
      canApprove={canApprove}
      canDelete={canDelete}
      towns={towns}
      personId={personId}
      isSiteAdmin={isSiteAdmin}
    />
  );
}
