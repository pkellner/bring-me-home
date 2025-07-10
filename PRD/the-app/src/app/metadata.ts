import { Metadata } from 'next';
import { getConfig } from '@/lib/config';

export async function generateSiteMetadata(): Promise<Metadata> {
  const [siteTitle, siteDescription] = await Promise.all([
    getConfig('site_title'),
    getConfig('site_description'),
  ]);

  return {
    title: siteTitle || 'Bring Me Home - Support for ICE Detainees',
    description:
      siteDescription ||
      'A platform dedicated to reuniting detained individuals with their families through community support and advocacy.',
  };
}
