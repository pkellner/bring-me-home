import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { fetchPersonMetadata, loadPersonPageData } from './data-fetchers';
import PersonPageContent from './PersonPageContent';

interface PersonPageProps {
  params: Promise<{ townSlug: string; personSlug: string }>;
}

// Check if caching is enabled (defaults to false)
const USE_CACHE = process.env.PERSON_PAGE_USE_CACHE === 'true';

export async function generateMetadata({
  params,
}: PersonPageProps): Promise<Metadata> {
  const { townSlug, personSlug } = await params;

  const person = await fetchPersonMetadata(townSlug, personSlug, USE_CACHE);

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

// Dynamic settings - if not using cache, force dynamic rendering
export const dynamic = 'force-dynamic'; // Always dynamic since we check USE_CACHE at runtime
export const revalidate = 0;

export default async function PersonPage({ params }: PersonPageProps) {
  const { townSlug, personSlug } = await params;
  
  // Load all data using the appropriate method
  const data = await loadPersonPageData(townSlug, personSlug, USE_CACHE);
  
  if (!data) {
    notFound();
  }

  return (
    <PersonPageContent
      person={data.person}
      comments={data.comments}
      session={data.session}
      systemDefaults={data.systemDefaults}
      permissions={data.permissions}
      townSlug={townSlug}
      personSlug={personSlug}
    />
  );
}