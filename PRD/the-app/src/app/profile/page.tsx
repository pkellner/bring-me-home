import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ProfileClient from './ProfileClient';
import { getUserComments } from '@/app/actions/user-comments';
import { isSiteAdmin } from '@/lib/permissions';

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }
  
  const params = await searchParams;
  const isAdmin = isSiteAdmin(session);
  
  // Determine which user to show
  const targetUserId = params.userId && isAdmin ? params.userId : session.user.id;
  const isViewingOwnProfile = targetUserId === session.user.id;
  
  // Get full user data including roles and access
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
      townAccess: {
        include: {
          town: {
            select: {
              id: true,
              name: true,
              state: true,
              slug: true,
            },
          },
        },
      },
      personAccess: {
        include: {
          person: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              slug: true,
              town: {
                select: {
                  name: true,
                  state: true,
                  slug: true,
                },
              },
            },
          },
        },
      },
      emailOptOuts: {
        include: {
          person: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              slug: true,
              town: {
                select: {
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      },
    },
  });
  
  // Get all persons the user has shown support for (via comments)
  const supportedPersons = user?.email ? await prisma.person.findMany({
    where: {
      comments: {
        some: {
          email: user.email,
        },
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      slug: true,
      town: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  }) : [];
  
  if (!user) {
    redirect('/auth/signin');
  }
  
  // Get persons the user has access to (through roles or direct access)
  let managedPersonIds: string[] = [];
  
  // Site admins have access to all persons
  if (user.userRoles.some(ur => ur.role.name === 'site-admin')) {
    const allPersons = await prisma.person.findMany({
      select: { id: true }
    });
    managedPersonIds = allPersons.map(p => p.id);
  } else {
    // Town admins have access to persons in their towns
    if (user.userRoles.some(ur => ur.role.name === 'town-admin') && user.townAccess.length > 0) {
      const townIds = user.townAccess.map(ta => ta.townId);
      const townPersons = await prisma.person.findMany({
        where: { townId: { in: townIds } },
        select: { id: true }
      });
      managedPersonIds.push(...townPersons.map(p => p.id));
    }
    
    // Add persons from direct access
    managedPersonIds.push(...user.personAccess.map(pa => pa.personId));
    
    // Remove duplicates
    managedPersonIds = [...new Set(managedPersonIds)];
  }
  
  
  // Get user's comments
  const { comments, groupedByPerson } = await getUserComments(user.id);
  
  // Get comment verification tokens if admin viewing another user
  let commentTokens = null;
  if (isAdmin && !isViewingOwnProfile && user.email) {
    commentTokens = await prisma.commentVerificationToken.findMany({
      where: { 
        email: user.email,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }
  
  // Serialize the data for client component
  const serializedUser = {
    id: user.id,
    username: user.username,
    email: user.email || '',
    emailVerified: user.emailVerified ? user.emailVerified.toISOString() : null,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    createdAt: user.createdAt.toISOString(),
    lastLogin: user.lastLogin?.toISOString() || null,
    optOutOfAllEmail: user.optOutOfAllEmail,
    allowAnonymousComments: user.allowAnonymousComments,
    roles: user.userRoles.map(ur => ({
      id: ur.role.id,
      name: ur.role.name,
      description: ur.role.description || '',
    })),
    townAccess: user.townAccess.map(ta => ({
      id: ta.id,
      accessLevel: ta.accessLevel,
      notifyOnComment: ta.notifyOnComment,
      town: {
        id: ta.town.id,
        name: ta.town.name,
        state: ta.town.state,
        slug: ta.town.slug,
      },
    })),
    personAccess: user.personAccess.map(pa => ({
      id: pa.id,
      accessLevel: pa.accessLevel,
      notifyOnComment: pa.notifyOnComment,
      person: {
        id: pa.person.id,
        firstName: pa.person.firstName,
        lastName: pa.person.lastName,
        slug: pa.person.slug,
        townName: pa.person.town.name,
        townState: pa.person.town.state,
        townSlug: pa.person.town.slug,
      },
    })),
    emailSubscriptions: supportedPersons.map(person => ({
      personId: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      slug: person.slug,
      townName: person.town.name,
      townSlug: person.town.slug,
      isOptedOut: user.emailOptOuts.some(opt => opt.personId === person.id),
    })),
  };
  
  return <ProfileClient 
    user={serializedUser} 
    comments={comments}
    groupedByPerson={groupedByPerson}
    isAdmin={isAdmin}
    isViewingOwnProfile={isViewingOwnProfile}
    commentTokens={commentTokens ? commentTokens.map(token => ({
      id: token.id,
      email: token.email,
      tokenHash: token.tokenHash.substring(0, 8) + '...',
      isActive: token.isActive,
      lastUsedAt: token.lastUsedAt?.toISOString() || null,
      createdAt: token.createdAt.toISOString(),
    })) : null}
  />;
}