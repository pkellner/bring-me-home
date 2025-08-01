import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PersonImageClient } from '../PersonImageClient';
import { PersonViewLinks } from '../PersonViewLinks';

export const metadata: Metadata = {
  title: 'Edit Person Image',
  description: 'Edit person primary image',
};

export default async function PersonImagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  const person = await prisma.person.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      slug: true,
      town: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (!person) {
    redirect('/admin/persons');
  }

  const personName = `${person.firstName} ${person.lastName}`;
  const townSlug = person.town.slug;
  const personSlug = person.slug;

  return (
    <>
      <PersonViewLinks townSlug={townSlug} personSlug={personSlug} personId={id} />
      
      <PersonImageClient 
        personId={id}
        personName={personName}
      />
    </>
  );
}