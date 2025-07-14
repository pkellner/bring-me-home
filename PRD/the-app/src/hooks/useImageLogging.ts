'use client';

import { useEffect } from 'react';

export function useImageLogging(imageUrl: string | null, context: string, imageId?: string) {
  useEffect(() => {
    if (imageUrl) {
      const isS3Url = imageUrl.includes('amazonaws.com');
      const isPresignedUrl = imageUrl.includes('X-Amz-Signature');
      const isApiUrl = imageUrl.startsWith('/api/images/');
      
      console.log(`[Client] ${context}:`, {
        imageId,
        url: imageUrl,
        type: isS3Url ? 'S3' : isApiUrl ? 'API/Database' : 'Unknown',
        isPresignedUrl,
        urlPreview: imageUrl.substring(0, 100) + '...'
      });
    }
  }, [imageUrl, context, imageId]);
}