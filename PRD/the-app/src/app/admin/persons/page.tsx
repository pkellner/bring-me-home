import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, getUserAccessiblePersons } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PersonsGrid from './PersonsGrid';
import { getSiteTextConfig } from '@/lib/config';

export default async function PersonsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  if (!hasPermission(session, 'persons', 'read')) {
    redirect('/admin');
  }

  // Get accessible person IDs for the current user
  const accessiblePersonIds = getUserAccessiblePersons(session);
  
  const persons = await prisma.person.findMany({
    where: 
      accessiblePersonIds.includes('*') 
        ? {} // Site admin - no filtering needed
        : {
            id: {
              in: accessiblePersonIds
            }
          },
    include: {
      town: true,
      comments: {
        orderBy: {
          createdAt: 'desc',
        },
      },
      personAccess: {
        include: {
          user: true,
        },
      },
      personImages: {
        where: {
          isActive: true,
        },
        orderBy: [
          { isPrimary: 'desc' },
          { createdAt: 'asc' },
        ],
      },
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });

  // Convert Decimal bondAmount to string for client components
  const serializedPersons = persons.map(person => ({
    ...person,
    bondAmount: person.bondAmount ? person.bondAmount.toString() : null,
  }));

  const canCreate = hasPermission(session, 'persons', 'create');
  const canEdit = hasPermission(session, 'persons', 'update');
  const canDelete = hasPermission(session, 'persons', 'delete');

  // Check if user is site admin or town admin
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
  const isTownAdmin =
    userWithRoles?.userRoles.some(ur => ur.role.name === 'town-admin') || false;

  const config = await getSiteTextConfig();

  return (
    <PersonsGrid
      initialPersons={serializedPersons}
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
      isSiteAdmin={isSiteAdmin}
      isTownAdmin={isTownAdmin}
      gridTitle={config.admin_detained_persons_title || 'Detained Persons'}
      addButtonText={config.admin_add_person_button || 'Add Detained Person'}
    />
  );
}
