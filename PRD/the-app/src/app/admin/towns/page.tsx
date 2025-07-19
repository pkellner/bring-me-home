import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import TownsGrid from './TownsGrid';

export default async function TownsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  if (!hasPermission(session, 'towns', 'read')) {
    redirect('/admin');
  }

  const towns = await prisma.town.findMany({
    include: {
      persons: true,
      townAccess: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  // Convert Decimal bondAmount to string for client components
  const serializedTowns = towns.map(town => ({
    ...town,
    persons: town.persons.map(person => ({
      ...person,
      bondAmount: person.bondAmount ? person.bondAmount.toString() : null,
    })),
  }));

  const canCreate = hasPermission(session, 'towns', 'create');
  const canEdit = hasPermission(session, 'towns', 'update');
  const canDelete = hasPermission(session, 'towns', 'delete');

  return (
    <TownsGrid
      initialTowns={serializedTowns}
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );
}
