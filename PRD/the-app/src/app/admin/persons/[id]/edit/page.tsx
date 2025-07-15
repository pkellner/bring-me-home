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
      personImages: {
        include: {
          image: true,
        },
        orderBy: [{ imageType: 'asc' }, { sequenceNumber: 'asc' }],
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

  // Transform personImages to the expected format
  const images = person.personImages?.map(pi => ({
    id: pi.image.id,
    imageType: pi.imageType,
    sequenceNumber: pi.sequenceNumber,
    caption: pi.image.caption,
    mimeType: pi.image.mimeType,
    size: pi.image.size,
    width: pi.image.width,
    height: pi.image.height,
    createdAt: pi.image.createdAt,
    updatedAt: pi.image.updatedAt,
  })) || [];

  const serializedPerson = {
    ...person,
    bondAmount: person.bondAmount ? person.bondAmount.toString() : null,
    images,
  };

  return (
    <>
      <PersonViewLinks townSlug={townSlug} personSlug={personSlug} />
      
      <PersonEditClient
        person={serializedPerson}
        towns={towns}
        session={session}
      />
    </>
  );
}
