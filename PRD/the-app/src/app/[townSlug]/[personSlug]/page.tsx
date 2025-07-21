import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getCachedPersonData } from '@/lib/cache/person-cache';
import PersonPageClient from './PersonPageClient';

interface PersonPageProps {
  params: Promise<{ townSlug: string; personSlug: string }>;
}

export async function generateMetadata({
  params,
}: PersonPageProps): Promise<Metadata> {
  const { townSlug, personSlug } = await params;

  const cachedResult = await getCachedPersonData(townSlug, personSlug);
  const person = cachedResult.data?.person;

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


export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PersonPage({ params }: PersonPageProps) {
  const { townSlug, personSlug } = await params;
  
  // Check if person exists using cache
  const cachedResult = await getCachedPersonData(townSlug, personSlug);
  const personExists = cachedResult.data?.person;

  if (!personExists) {
    notFound();
  }

  // Get admin link delay from environment
  const adminLinkDelay = process.env.ADMIN_LINK_DELAY_SECONDS
    ? parseInt(process.env.ADMIN_LINK_DELAY_SECONDS)
    : 5;

  // Get spinner delay from environment
  const spinnerDelay = process.env.SPINNER_DELAY_MS
    ? parseInt(process.env.SPINNER_DELAY_MS)
    : 500;

  return (
    <PersonPageClient
      townSlug={townSlug}
      personSlug={personSlug}
      adminLinkDelay={adminLinkDelay}
      spinnerDelay={spinnerDelay}
    />
  );
}
