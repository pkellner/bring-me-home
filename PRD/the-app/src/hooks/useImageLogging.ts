'use client';

import { useEffect } from 'react';

export function useImageLogging(imageUrl: string | null, context: string, imageId?: string) {
  useEffect(() => {
    // Image logging disabled in production
  }, [imageUrl, context, imageId]);
}