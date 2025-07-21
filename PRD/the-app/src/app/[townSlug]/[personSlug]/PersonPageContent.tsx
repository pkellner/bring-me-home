import Link from 'next/link';
import LayoutRenderer, { type SerializedPerson } from '@/components/layouts/LayoutRenderer';
import Footer from '@/components/Footer';
import DelayedAdminLink from '@/components/person/DelayedAdminLink';
import { generateImageUrlServerWithCdn } from '@/lib/image-url-server';

interface PersonPageContentProps {
  person: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  comments: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  session: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  systemDefaults: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  permissions: {
    isSiteAdmin: boolean;
    isAdmin: boolean;
  };
  townSlug: string;
  personSlug: string;
}

export default async function PersonPageContent({
  person,
  comments,
  session,
  systemDefaults,
  permissions,
  townSlug,
  personSlug,
}: PersonPageContentProps) {
  // Get admin link delay from environment
  const adminLinkDelay = process.env.ADMIN_LINK_DELAY_SECONDS
    ? parseInt(process.env.ADMIN_LINK_DELAY_SECONDS)
    : 5;

  // Serialize comments for client component
  const serializedComments = (comments || []).map(comment => ({
    ...comment,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt ? comment.updatedAt.toISOString() : comment.createdAt.toISOString(),
    birthdate: comment.birthdate ? comment.birthdate.toISOString() : null,
    approvedAt: comment.approvedAt ? comment.approvedAt.toISOString() : null,
  }));

  // Sanitize stories to remove circular references
  const serializedStories = (person.stories || []).map((story: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
    id: story.id,
    language: story.language,
    storyType: story.storyType,
    content: story.content,
    isActive: story.isActive,
    personId: story.personId,
    createdAt: story.createdAt.toISOString(),
    updatedAt: story.updatedAt.toISOString(),
  }));

  // Transform personImages to the expected format
  const images = await Promise.all(
    person.personImages?.map(async (pi: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const imageUrl = await generateImageUrlServerWithCdn(
        pi.image.id,
        undefined,
        `/${townSlug}/${personSlug}`
      );

      return {
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
        imageUrl,
      };
    }) || []
  );

  // Exclude personImages to avoid circular reference
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { personImages, ...personWithoutImages } = person;

  const serializedPerson = {
    ...personWithoutImages,
    bondAmount: person.bondAmount ? person.bondAmount.toString() : null,
    stories: serializedStories,
    comments: serializedComments,
    images,
    // Serialize all date fields to ISO strings to prevent hydration mismatches
    detentionDate: person.detentionDate ? person.detentionDate.toISOString() : null,
    lastSeenDate: person.lastSeenDate ? person.lastSeenDate.toISOString() : null,
    lastHeardFromDate: person.lastHeardFromDate ? person.lastHeardFromDate.toISOString() : null,
    dateOfBirth: person.dateOfBirth ? person.dateOfBirth.toISOString() : null,
    releaseDate: person.releaseDate ? person.releaseDate.toISOString() : null,
    nextCourtDate: person.nextCourtDate ? person.nextCourtDate.toISOString() : null,
    createdAt: person.createdAt.toISOString(),
    updatedAt: person.updatedAt.toISOString(),
  } as unknown as SerializedPerson;

  // Determine which layout and theme to use
  const layout = serializedPerson.layout ||
    serializedPerson.town.layout || {
      id: 'default',
      name: 'Standard Profile',
      template: JSON.stringify({
        type: 'custom-person',
        sections: ['top-row', 'story', 'comments'],
      }),
    };

  const theme = serializedPerson.theme ||
    serializedPerson.town.theme || {
      id: 'default',
      name: systemDefaults.theme || 'default',
      cssVars: null,
    };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link
                href={`/${townSlug}`}
                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
              >
                ← Back to {serializedPerson.town.name}
              </Link>
            </div>
            <nav className="flex items-center space-x-4">
              {session && (
                <>
                  <span className="text-sm text-gray-700">
                    Welcome, {session.user.firstName || session.user.username}
                  </span>
                  {session.user.roles?.some((role: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
                    ['site-admin', 'town-admin', 'person-admin'].includes(
                      role.name
                    )
                  ) && (
                    <Link
                      href="/admin"
                      className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                    >
                      Admin Panel
                    </Link>
                  )}
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
        <LayoutRenderer
          person={serializedPerson}
          layout={layout}
          theme={theme}
          isAdmin={permissions.isAdmin}
          isSiteAdmin={permissions.isSiteAdmin}
        />
      </main>

      {/* Footer */}
      <Footer
        townLayout={serializedPerson.town.layout?.name}
        townTheme={serializedPerson.town.theme?.name}
        townName={serializedPerson.town.name}
        personLayout={serializedPerson.layout?.name}
        personTheme={serializedPerson.theme?.name}
      />

      {/* Delayed Admin Link for Site Admins */}
      {permissions.isSiteAdmin && (
        <DelayedAdminLink
          personId={serializedPerson.id}
          delaySeconds={adminLinkDelay}
        />
      )}
    </div>
  );
}