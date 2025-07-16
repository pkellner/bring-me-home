import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import LayoutRenderer, {
  type SerializedPerson,
} from '@/components/layouts/LayoutRenderer';
import Footer from '@/components/Footer';
import DelayedAdminLink from '@/components/person/DelayedAdminLink';
import { getSystemLayoutTheme } from '@/app/actions/systemConfig';
import { generateImageUrlServerWithCdn } from '@/lib/image-url-server';

interface PersonPageProps {
  params: Promise<{ townSlug: string; personSlug: string }>;
}

export async function generateMetadata({
  params,
}: PersonPageProps): Promise<Metadata> {
  const { townSlug, personSlug } = await params;

  const person = await prisma.person.findFirst({
    where: {
      slug: personSlug,
      town: {
        slug: townSlug,
        isActive: true,
      },
      isActive: true,
    },
    select: {
      firstName: true,
      lastName: true,
      story: true,
      town: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!person) {
    return {
      title: 'Person Not Found',
      description: 'The requested person could not be found.',
    };
  }

  const personName = `${person.firstName} ${person.lastName}`;
  const title = `${personName} - Bring Me Home`;
  const description = person.story
    ? person.story.slice(0, 150) + '...'
    : `Help bring ${personName} from ${person.town.name} home to their family.`;

  // Use PRODUCTION_URL in production, otherwise use NEXT_PUBLIC_APP_URL
  const appUrl = process.env.NODE_ENV === 'production'
    ? (process.env.PRODUCTION_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://bring-me-home.com')
    : (process.env.NEXT_PUBLIC_APP_URL || 'https://bring-me-home.com');
    
  const personUrl = `${appUrl}/${townSlug}/${personSlug}`;
  
  // Use CloudFront URL for OG image if available
  const cdnUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_CDN_URL;
  const ogImageUrl = cdnUrl 
    ? `${cdnUrl}/${townSlug}/${personSlug}/opengraph-image`
    : `${appUrl}/${townSlug}/${personSlug}/opengraph-image`;

  return {
    title,
    description,
    metadataBase: new URL(appUrl),
    openGraph: {
      title: personName,
      description,
      url: personUrl,
      siteName: 'Bring Me Home',
      type: 'profile',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${personName} - ${person.town.name}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: personName,
      description,
      images: [ogImageUrl],
    },
    alternates: {
      canonical: personUrl,
    },
  };
}

async function getPersonData(townSlug: string, personSlug: string) {
  const person = await prisma.person.findFirst({
    where: {
      slug: personSlug,
      town: {
        slug: townSlug,
        isActive: true, // Only show persons from visible towns
      },
      isActive: true,
    },
    select: {
      // Include all scalar fields
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      alienIdNumber: true,
      ssn: true,
      dateOfBirth: true,
      placeOfBirth: true,
      height: true,
      weight: true,
      eyeColor: true,
      hairColor: true,
      lastKnownAddress: true,
      currentAddress: true,
      phoneNumber: true,
      emailAddress: true,
      story: true,
      detentionStory: true,
      familyMessage: true,
      lastSeenDate: true,
      lastSeenLocation: true,
      isActive: true,
      isFound: true,
      status: true,
      detentionCenterId: true,
      detentionDate: true,
      lastHeardFromDate: true,
      notesFromLastContact: true,
      releaseDate: true,
      detentionStatus: true,
      caseNumber: true,
      bondAmount: true,
      bondStatus: true,
      representedByLawyer: true,
      representedByNotes: true,
      legalRepName: true,
      legalRepPhone: true,
      legalRepEmail: true,
      legalRepFirm: true,
      nextCourtDate: true,
      courtLocation: true,
      internationalAddress: true,
      countryOfOrigin: true,
      layoutId: true,
      themeId: true,
      townId: true,
      slug: true,
      showDetentionInfo: true,
      showLastHeardFrom: true,
      showDetentionDate: true,
      showCommunitySupport: true,
      createdAt: true,
      updatedAt: true,
      // Include relations
      town: {
        include: {
          layout: true,
          theme: true,
        },
      },
      layout: true,
      theme: true,
      detentionCenter: {
        include: {
          detentionCenterImage: {
            include: {
              image: true,
            },
          },
        },
      },
      personImages: {
        include: {
          image: true,
        },
        orderBy: [{ imageType: 'asc' }, { sequenceNumber: 'asc' }],
      },
      comments: {
        where: {
          isActive: true,
        },
        select: {
          id: true,
          content: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          occupation: true,
          birthdate: true,
          streetAddress: true,
          city: true,
          state: true,
          zipCode: true,
          showOccupation: true,
          showBirthdate: true,
          showComment: true,
          showCityState: true,
          wantsToHelpMore: true,
          displayNameOnly: true,
          requiresFamilyApproval: true,
          isApproved: true,
          isActive: true,
          personId: true,
          type: true,
          visibility: true,
          familyVisibilityOverride: true,
          moderatorNotes: true,
          createdAt: true,
          updatedAt: true,
          approvedAt: true,
          approvedBy: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      stories: {
        where: {
          isActive: true,
        },
        orderBy: [
          {
            language: 'asc',
          },
          {
            storyType: 'asc',
          },
        ],
      },
    },
  });

  // Convert Decimal bondAmount to string for serialization
  if (person && person.bondAmount) {
    return {
      ...person,
      bondAmount: person.bondAmount.toString(),
    };
  }

  return person;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PersonPage({ params }: PersonPageProps) {
  const { townSlug, personSlug } = await params;
  const person = await getPersonData(townSlug, personSlug);
  const session = await getServerSession(authOptions);
  const systemDefaults = await getSystemLayoutTheme();

  if (!person) {
    notFound();
  }

  // Check if user has admin access
  let isAdmin = false;
  let isSiteAdmin = false;
  let isTownAdmin = false;
  let isPersonAdmin = false;

  if (session?.user?.id) {
    const userWithAccess = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
        townAccess: {
          where: {
            townId: person.townId,
            accessLevel: 'admin',
          },
        },
        personAccess: {
          where: {
            personId: person.id,
            accessLevel: 'admin',
          },
        },
      },
    });

    isSiteAdmin =
      userWithAccess?.userRoles.some(ur => ur.role.name === 'site-admin') ||
      session.user.roles?.some(role => role.name === 'site-admin') ||
      false;
    isTownAdmin = (userWithAccess?.townAccess?.length ?? 0) > 0;
    isPersonAdmin = (userWithAccess?.personAccess?.length ?? 0) > 0;

    isAdmin = isSiteAdmin || isTownAdmin || isPersonAdmin;
  }

  // Get admin link delay from environment
  const adminLinkDelay = process.env.ADMIN_LINK_DELAY_SECONDS
    ? parseInt(process.env.ADMIN_LINK_DELAY_SECONDS)
    : 5;

  // Ensure bondAmount is serialized for client component
  const serializedComments = (person.comments || []).map(comment => ({
    ...comment,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    birthdate: comment.birthdate ? comment.birthdate.toISOString() : null,
    approvedAt: comment.approvedAt ? comment.approvedAt.toISOString() : null,
  }));

  // Transform personImages to the expected format
  const images = await Promise.all(
    person.personImages?.map(async pi => {
      const imageUrl = await generateImageUrlServerWithCdn(pi.image.id, undefined, `/${townSlug}/${personSlug}`);

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
    stories: person.stories || [],
    comments: serializedComments,
    images,
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
                  {session.user.roles?.some(role =>
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
          isAdmin={isAdmin}
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
      {isSiteAdmin && (
        <DelayedAdminLink
          personId={serializedPerson.id}
          delaySeconds={adminLinkDelay}
        />
      )}
    </div>
  );
}
