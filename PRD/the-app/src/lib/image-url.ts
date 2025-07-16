/**
 * Generates a dynamic image URL with optional size parameters
 * This is a client-safe version that doesn't depend on Sharp
 * @param imageId - The image ID from the database
 * @param options - Optional parameters for image sizing
 * @returns The formatted image URL
 */
export function generateImageUrl(
  imageId: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'jpeg' | 'webp' | 'png';
  }
): string {
  // Build query parameters
  const params = new URLSearchParams();
  if (options?.width) params.append('w', options.width.toString());
  if (options?.height) params.append('h', options.height.toString());
  if (options?.quality) params.append('q', options.quality.toString());
  if (options?.format) params.append('f', options.format);
  
  const queryString = params.toString();
  return `/api/images/${imageId}${queryString ? `?${queryString}` : ''}`;
}

/**
 * Generates a CDN-aware image URL for client-side usage
 * @param imageId - The image ID from the database
 * @param options - Optional parameters for image sizing
 * @param cdnUrl - Optional CDN URL to use instead of local API
 * @param isAdminRoute - Whether the current route is an admin route
 * @returns The formatted image URL
 */
export function generateImageUrlWithCdn(
  imageId: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'jpeg' | 'webp' | 'png';
  },
  cdnUrl?: string,
  isAdminRoute?: boolean
): string {
  // Build query parameters
  const params = new URLSearchParams();
  if (options?.width) params.append('w', options.width.toString());
  if (options?.height) params.append('h', options.height.toString());
  if (options?.quality) params.append('q', options.quality.toString());
  if (options?.format) params.append('f', options.format);
  
  const queryString = params.toString();
  const imagePath = `/api/images/${imageId}${queryString ? `?${queryString}` : ''}`;
  
  // Use CDN URL if available and not in admin route
  if (cdnUrl && !isAdminRoute) {
    // Remove trailing slash from CDN URL if present
    const cleanCdnUrl = cdnUrl.replace(/\/$/, '');
    return `${cleanCdnUrl}${imagePath}`;
  }
  
  // Fall back to local API URL
  return imagePath;
}