import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PersonsGrid from './PersonsGrid';

export default async function PersonsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  if (!hasPermission(session, 'persons', 'read')) {
    redirect('/admin');
  }

  const persons = await prisma.person.findMany({
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

  return (
    <PersonsGrid
      initialPersons={serializedPersons}
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );
}
