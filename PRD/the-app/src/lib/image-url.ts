/**
 * Generates a dynamic image URL with optional size parameters
 * This is a client-safe version that doesn't depend on Sharp
 * @param imageId - The image ID from the database
 * @param updatedAt - The updated timestamp for cache busting
 * @param options - Optional parameters for image sizing
 * @returns The formatted image URL
 */
export function generateImageUrl(
  imageId: string,
  updatedAt: Date | string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'jpeg' | 'webp' | 'png';
  }
): string {
  // Convert updatedAt to ISO string and replace characters for URL safety
  const timestamp = typeof updatedAt === 'string' 
    ? updatedAt 
    : updatedAt.toISOString();
  const urlSafeTimestamp = timestamp.replace(/[:.]/g, '-');
  
  // Build query parameters
  const params = new URLSearchParams();
  if (options?.width) params.append('w', options.width.toString());
  if (options?.height) params.append('h', options.height.toString());
  if (options?.quality) params.append('q', options.quality.toString());
  if (options?.format) params.append('f', options.format);
  
  const queryString = params.toString();
  return `/api/images/${imageId}/${urlSafeTimestamp}${queryString ? `?${queryString}` : ''}`;
}