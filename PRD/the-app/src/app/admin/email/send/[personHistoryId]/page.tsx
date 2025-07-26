import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { isSiteAdmin } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import EmailSendClient from './EmailSendClient';
import { getPersonFollowers } from '@/app/actions/email-notifications';

export default async function EmailSendPage({
  params,
}: {
  params: Promise<{ personHistoryId: string }>;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !isSiteAdmin(session)) {
    redirect('/admin');
  }
  
  const { personHistoryId } = await params;
  
  // Get the person history update with all related data
  const update = await prisma.personHistory.findUnique({
    where: { id: personHistoryId },
    include: {
      person: {
        include: {
          town: true,
          personImages: {
            where: { imageType: 'primary' },
            include: { image: true },
            take: 1,
          },
        },
      },
    },
  });
  
  if (!update) {
    notFound();
  }
  
  // Get all followers for this person (including both regular comments and history comments)
  const followers = await getPersonFollowers(update.personId, true);
  
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Send Email Update</h1>
      <EmailSendClient 
        update={{
          id: update.id,
          personId: update.personId,
          description: update.description,
          date: update.date.toISOString(),
          person: {
            id: update.person.id,
            firstName: update.person.firstName,
            lastName: update.person.lastName,
            slug: update.person.slug,
            town: {
              name: update.person.town.name,
              state: update.person.town.state,
              slug: update.person.town.slug,
            },
            primaryImageUrl: update.person.personImages[0]?.image 
              ? `/api/images/${update.person.personImages[0].image.id}`
              : null,
          },
        }}
        followers={followers.map(f => ({
          id: f.id,
          email: f.email || '',
          firstName: f.firstName,
          lastName: f.lastName,
        }))}
      />
    </div>
  );
}