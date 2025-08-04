'use client';

import { generateImageUrlWithCdn } from './image-url';

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

  // Check if the server-provided imageUrl contains a CDN URL
  let cdnUrl: string | undefined;
  let isAdminRoute = false;

  if (image.imageUrl) {
    // Extract CDN URL if the imageUrl starts with http/https
    const urlMatch = image.imageUrl.match(/^(https?:\/\/[^\/]+)/);
    if (urlMatch) {
      cdnUrl = urlMatch[1];
    }

    // Check if we're in an admin context based on current path
    if (typeof window !== 'undefined') {
      isAdminRoute = window.location.pathname.startsWith('/admin');
    }
  }

  // Generate URL with CDN support if available
  return generateImageUrlWithCdn(image.id, options, cdnUrl, isAdminRoute);
}