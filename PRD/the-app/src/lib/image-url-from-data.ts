import { generateS3PresignedUrl, shouldServeFromS3 } from './image-url-s3';

/**
 * generateImageUrlFromData
 * 
 * Generates image URLs WITHOUT making any database queries.
 * Uses pre-fetched image data to determine the appropriate URL.
 * 
 * This function is designed to be used when image data is already available
 * (e.g., from a person query that includes image relations), eliminating
 * the need for additional database queries per image.
 * 
 * @param imageData - Pre-fetched image data including storageType and s3Key
 * @param options - Optional transformation parameters
 * @param pathname - The current pathname to determine if it's an admin route
 * @returns Promise<string> - The image URL (CDN, S3, or API)
 */
export async function generateImageUrlFromData(
  imageData: {
    id: string;
    storageType: string;
    s3Key?: string | null;
  },
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'jpeg' | 'webp' | 'png';
  },
  pathname?: string
): Promise<string> {
  // Check if we're in an admin route
  const isAdminRoute = pathname?.startsWith('/admin') ?? false;
  
  // Get CDN URL from environment
  const cdnUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_CDN_URL;
  
  // Check if we should serve from S3 and no transformations are requested
  const hasTransformations = options?.width || options?.height || options?.quality || options?.format;
  const serveFromS3 = shouldServeFromS3();
  
  // Decision tree (same logic as generateImageUrlServer but without the database query)
  
  // 1. If storage type is 'database', always use API URL
  if (imageData.storageType === 'database') {
    const params = new URLSearchParams();
    if (options?.width) params.append('w', options.width.toString());
    if (options?.height) params.append('h', options.height.toString());
    if (options?.quality) params.append('q', options.quality.toString());
    if (options?.format) params.append('f', options.format);
    
    const queryString = params.toString();
    const apiPath = `/api/images/${imageData.id}${queryString ? `?${queryString}` : ''}`;
    
    // Use CDN if available and not in admin route
    if (cdnUrl && !isAdminRoute) {
      const cleanCdnUrl = cdnUrl.replace(/\/$/, '');
      return `${cleanCdnUrl}${apiPath}`;
    }
    
    return apiPath;
  }
  
  // 2. If storage type is 's3' and direct S3 serving is disabled, use API URL
  if (imageData.storageType === 's3' && !serveFromS3) {
    const params = new URLSearchParams();
    if (options?.width) params.append('w', options.width.toString());
    if (options?.height) params.append('h', options.height.toString());
    if (options?.quality) params.append('q', options.quality.toString());
    if (options?.format) params.append('f', options.format);
    
    const queryString = params.toString();
    const apiPath = `/api/images/${imageData.id}${queryString ? `?${queryString}` : ''}`;
    
    // Use CDN if available and not in admin route
    if (cdnUrl && !isAdminRoute) {
      const cleanCdnUrl = cdnUrl.replace(/\/$/, '');
      return `${cleanCdnUrl}${apiPath}`;
    }
    
    return apiPath;
  }
  
  // 3. If storage type is 's3' and direct S3 serving is enabled
  if (imageData.storageType === 's3' && serveFromS3 && imageData.s3Key) {
    // 3a. If transformations are requested, must use API URL
    if (hasTransformations) {
      const params = new URLSearchParams();
      if (options?.width) params.append('w', options.width.toString());
      if (options?.height) params.append('h', options.height.toString());
      if (options?.quality) params.append('q', options.quality.toString());
      if (options?.format) params.append('f', options.format);
      
      const queryString = params.toString();
      const apiPath = `/api/images/${imageData.id}${queryString ? `?${queryString}` : ''}`;
      
      // Use CDN if available and not in admin route
      if (cdnUrl && !isAdminRoute) {
        const cleanCdnUrl = cdnUrl.replace(/\/$/, '');
        return `${cleanCdnUrl}${apiPath}`;
      }
      
      return apiPath;
    }
    
    // 3b. No transformations, serve directly from S3
    try {
      const s3Url = await generateS3PresignedUrl(imageData.s3Key, 3600); // 1 hour expiry
      if (s3Url) {
        return s3Url;
      }
    } catch (error) {
      console.error('[IMAGE URL ERROR] Failed to generate S3 URL:', error);
    }
  }
  
  // Fallback to API URL
  const params = new URLSearchParams();
  if (options?.width) params.append('w', options.width.toString());
  if (options?.height) params.append('h', options.height.toString());
  if (options?.quality) params.append('q', options.quality.toString());
  if (options?.format) params.append('f', options.format);
  
  const queryString = params.toString();
  const apiPath = `/api/images/${imageData.id}${queryString ? `?${queryString}` : ''}`;
  
  // Use CDN if available and not in admin route
  if (cdnUrl && !isAdminRoute) {
    const cleanCdnUrl = cdnUrl.replace(/\/$/, '');
    return `${cleanCdnUrl}${apiPath}`;
  }
  
  return apiPath;
}