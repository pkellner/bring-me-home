'use client';

import { usePathname } from 'next/navigation';
import { useEnvironment } from '@/contexts/EnvironmentContext';
import { generateImageUrlWithCdn } from '@/lib/image-url';

/**
 * Hook to generate CDN-aware image URLs
 * Automatically detects admin routes and uses appropriate URL
 */
export function useImageUrl() {
  const pathname = usePathname();
  const { env } = useEnvironment();
  
  const isAdminRoute = pathname?.startsWith('/admin') ?? false;
  const cdnUrl = env?.cloudfrontCdnUrl;
  
  const generateUrl = (
    imageId: string,
    options?: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'jpeg' | 'webp' | 'png';
    }
  ) => {
    return generateImageUrlWithCdn(imageId, options, cdnUrl, isAdminRoute);
  };
  
  return { generateUrl, isAdminRoute, cdnUrl };
}