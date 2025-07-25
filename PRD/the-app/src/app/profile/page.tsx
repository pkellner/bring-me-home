import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ProfileClient from './ProfileClient';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }
  
  // Get full user data including roles and access
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
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
  
  // Serialize the data for client component
  const serializedUser = {
    id: user.id,
    username: user.username,
    email: user.email || '',
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    createdAt: user.createdAt.toISOString(),
    lastLogin: user.lastLogin?.toISOString() || null,
    optOutOfAllEmail: user.optOutOfAllEmail,
    roles: user.userRoles.map(ur => ({
      id: ur.role.id,
      name: ur.role.name,
      description: ur.role.description || '',
    })),
    townAccess: user.townAccess.map(ta => ({
      id: ta.id,
      accessLevel: ta.accessLevel,
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
  
  return <ProfileClient user={serializedUser} />;
}