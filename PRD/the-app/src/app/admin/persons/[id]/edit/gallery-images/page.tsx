import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { GalleryImagesTab } from '../GalleryImagesTab';

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
    where: { id: id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  });

  if (!person) {
    redirect('/admin/persons');
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-6">
        <Link href={`/admin/persons/${id}/edit`}>
          <Button variant="ghost" size="sm">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Person Details
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          {person.firstName} {person.lastName} - Gallery Images
        </h1>
        <p className="text-gray-600 mt-2">
          Manage multiple gallery images for this person
        </p>
      </div>

      <div className="mb-6 flex gap-4">
        <Link href={`/admin/persons/${id}/edit`}>
          <Button variant="outline">Person Details</Button>
        </Link>
        <Link href={`/admin/persons/${id}/edit/person-image`}>
          <Button variant="outline">Primary Image</Button>
        </Link>
        <Button variant="default" disabled>Gallery Images</Button>
      </div>

      <GalleryImagesTab personId={id} />
    </div>
  );
}