'use client';

import { generateImageUrl } from './image-url';

export interface ImageWithUrl {
  id: string;
  imageUrl?: string;
  imageType?: string | null;
  caption?: string | null;
  sequenceNumber?: number;
  mimeType?: string;
  size?: number;
  width?: number | null;
  height?: number | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/**
 * Client-side function to get the appropriate image URL
 * Respects the server-generated imageUrl when available (which considers NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY)
 * Falls back to API URL generation for client-side operations
 */
export function getImageUrl(
  image: ImageWithUrl | undefined | null,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'jpeg' | 'webp' | 'png';
  }
): string | null {
  if (!image) return null;

  // If we have a server-generated imageUrl and no transformations requested, use it
  if (image.imageUrl && !options?.width && !options?.height && !options?.format) {
    return image.imageUrl;
  }

  // Otherwise, generate API URL (which will handle transformations)
  return generateImageUrl(image.id, options);
}