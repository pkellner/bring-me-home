import { Metadata } from 'next';
import { getConfig } from '@/lib/config';

export async function generateSiteMetadata(): Promise<Metadata> {
  const [siteTitle, siteDescription] = await Promise.all([
    getConfig('site_title'),
    getConfig('site_description'),
  ]);

  // Use PRODUCTION_URL in production, otherwise use NEXT_PUBLIC_APP_URL
  const appUrl = process.env.NODE_ENV === 'production'
    ? (process.env.PRODUCTION_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://bring-me-home.com')
    : (process.env.NEXT_PUBLIC_APP_URL || 'https://bring-me-home.com');

  const title = siteTitle || 'Bring Me Home';
  const description =
    siteDescription ||
    'Support for ICE detainees - A platform dedicated to reuniting detained individuals with their families through community support and advocacy.';
  
  // Use CloudFront URL for OG image if available
  const cdnUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_CDN_URL;
  const ogImageUrl = cdnUrl ? `${cdnUrl}/opengraph-image` : '/opengraph-image';

  return {
    title: `${title} - Support for ICE detainees`,
    description,
    metadataBase: new URL(appUrl),
    icons: {
      icon: [
        { url: '/images/favicon/favicon.ico', sizes: 'any' },
        { url: '/images/favicon/favicon.svg', type: 'image/svg+xml' },
        { url: '/images/favicon/favicon-96x96.png', sizes: '96x96', type: 'image/png' }
      ],
      shortcut: '/images/favicon/favicon.ico',
      apple: '/images/favicon/apple-touch-icon.png',
      other: [
        {
          rel: 'mask-icon',
          url: '/images/favicon/favicon.svg',
          color: '#4f46e5'
        }
      ]
    },
    manifest: '/manifest.json',
    openGraph: {
      title,
      description,
      url: appUrl,
      siteName: title,
      type: 'website',
      images: [
        {
          url: ogImageUrl,
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
      images: [ogImageUrl],
    },
    alternates: {
      canonical: appUrl,
    },
  };
}
