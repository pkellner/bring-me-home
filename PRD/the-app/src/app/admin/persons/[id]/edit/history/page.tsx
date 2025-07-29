import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPersonAccess, isSiteAdmin, isTownAdmin, isPersonAdmin } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { HistoryClient } from '../HistoryClient';
import { PersonViewLinks } from '../PersonViewLinks';
import { SanitizedPersonHistory } from '@/types/sanitized';

interface PersonHistoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function PersonHistoryPage({ params }: PersonHistoryPageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    notFound();
  }

  // Check if user has access to this person
  const hasAccess = await hasPersonAccess(session, id, 'write') || 
                    isTownAdmin(session) || 
                    isPersonAdmin(session);
  
  if (!hasAccess) {
    notFound();
  }

  // Fetch person with history
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
          name: true,
        },
      },
      personHistory: {
        orderBy: { date: 'desc' },
      },
    },
  });

  if (!person) {
    notFound();
  }

  // Sanitize history data to prevent circular references
  const sanitizedHistory: SanitizedPersonHistory[] = person.personHistory.map(history => ({
    id: history.id,
    title: history.title,
    description: history.description,
    date: history.date.toISOString(),
    visible: history.visible,
    sendNotifications: history.sendNotifications,
    createdByUsername: history.createdByUsername,
    createdByUserId: history.createdByUserId,
    createdAt: history.createdAt.toISOString(),
    updatedAt: history.updatedAt.toISOString(),
  }));

  const userIsSiteAdmin = isSiteAdmin(session);
  const userIsTownAdmin = isTownAdmin(session);
  const personName = `${person.firstName} ${person.lastName}`;
  const townSlug = person.town.slug;
  const townName = person.town.name;
  const personSlug = person.slug;

  return (
    <>
      <PersonViewLinks 
        townSlug={townSlug}
        personSlug={personSlug}
        personId={id}
      />
      <HistoryClient
        personId={id}
        personName={personName}
        townName={townName}
        initialHistory={sanitizedHistory}
        isSiteAdmin={userIsSiteAdmin}
        isTownAdmin={userIsTownAdmin}
        townSlug={townSlug}
        personSlug={personSlug}
      />
    </>
  );
}