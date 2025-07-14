import { prisma } from '@/lib/prisma';
import { generateS3PublicUrl, shouldServeFromS3 } from './image-url-s3';

/**
 * Server-side function to generate image URLs
 * Will return S3 public URLs when AWS_SERVER_IMAGES_FROM_S3_DIRECTLY is true
 * Otherwise returns API URLs
 * 
 * @param imageId - The image ID from the database
 * @param options - Optional parameters for image sizing
 * @returns Promise<string> - The image URL
 */
export async function generateImageUrlServer(
  imageId: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'jpeg' | 'webp' | 'png';
  }
): Promise<string> {
  // Check if we should serve from S3 and no transformations are requested
  const hasTransformations = options?.width || options?.height || options?.quality || options?.format;
  
  if (shouldServeFromS3() && !hasTransformations) {
    try {
      // Get the image from database to find S3 key
      const image = await prisma.imageStorage.findUnique({
        where: { id: imageId },
        select: { s3Key: true, storageType: true },
      });

      if (image?.storageType === 's3' && image.s3Key) {
        // Generate public S3 URL (bucket must have public read access)
        const s3Url = generateS3PublicUrl(image.s3Key);
        if (s3Url) {
          return s3Url;
        }
      }
    } catch (error) {
      console.error('Error generating S3 URL:', error);
    }
  }

  // Fall back to API URL
  const params = new URLSearchParams();
  if (options?.width) params.append('w', options.width.toString());
  if (options?.height) params.append('h', options.height.toString());
  if (options?.quality) params.append('q', options.quality.toString());
  if (options?.format) params.append('f', options.format);
  
  const queryString = params.toString();
  return `/api/images/${imageId}${queryString ? `?${queryString}` : ''}`;
}