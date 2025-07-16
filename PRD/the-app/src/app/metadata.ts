import { Metadata } from 'next';
import { getConfig } from '@/lib/config';

export async function generateSiteMetadata(): Promise<Metadata> {
  const [siteTitle, siteDescription, appUrl] = await Promise.all([
    getConfig('site_title'),
    getConfig('site_description'),
    Promise.resolve(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'),
  ]);

  const title = siteTitle || 'Bring Me Home';
  const description =
    siteDescription ||
    'Support for ICE detainees - A platform dedicated to reuniting detained individuals with their families through community support and advocacy.';

  return {
    title: `${title} - Support for ICE detainees`,
    description,
    metadataBase: new URL(appUrl),
    openGraph: {
      title,
      description,
      url: appUrl,
      siteName: title,
      type: 'website',
      images: [
        {
          url: '/opengraph-image',
          width: 1200,
          height: 630,
          alt: `${title} - Support for ICE detainees`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/opengraph-image'],
    },
    alternates: {
      canonical: appUrl,
    },
  };
}
