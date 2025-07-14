import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { GalleryImagesClient } from '../GalleryImagesClient';

export const metadata: Metadata = {
  title: 'Edit Gallery Images',
  description: 'Manage gallery images for person',
};

export default async function GalleryImagesPage({
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
    },
  });

  if (!person) {
    redirect('/admin/persons');
  }

  const personName = `${person.firstName} ${person.lastName}`;

  return (
    <GalleryImagesClient 
      personId={id}
      personName={personName}
    />
  );
}