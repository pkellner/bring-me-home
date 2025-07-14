import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { PersonEditClient } from './PersonEditClient';
import { PersonViewLinks } from './PersonViewLinks';

export default async function EditPersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || !hasPermission(session, 'persons', 'update')) {
    redirect('/admin');
  }

  const person = await prisma.person.findUnique({
    where: { id },
    include: {
      town: true,
      detentionCenter: true,
      stories: {
        where: { isActive: true },
        orderBy: [{ language: 'asc' }, { storyType: 'asc' }],
      },
    },
  });

  if (!person) {
    redirect('/admin/persons');
  }

  const towns = await prisma.town.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  // Get slugs for navigation
  const townSlug = person.town.slug;
  const personSlug = person.slug;

  const serializedPerson = {
    ...person,
    bondAmount: person.bondAmount ? person.bondAmount.toString() : null,
  };

  return (
    <>
      <PersonViewLinks townSlug={townSlug} personSlug={personSlug} />
      
      <PersonEditClient
        person={serializedPerson}
        towns={towns}
      />
    </>
  );
}
