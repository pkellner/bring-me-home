import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { PersonEditClient } from './PersonEditClient';
import Link from 'next/link';
import { ChatBubbleLeftRightIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

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
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <Link
            href={`/${townSlug}/${personSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <GlobeAltIcon className="h-4 w-4 mr-2" />
            View Profile
          </Link>
          <Link
            href={`/admin/comments/${townSlug}/${personSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
            View Comments
          </Link>
        </div>
      </div>

      <PersonEditClient
        person={serializedPerson}
        towns={towns}
      />
    </>
  );
}
