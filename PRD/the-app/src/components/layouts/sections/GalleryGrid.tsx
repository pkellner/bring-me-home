'use client';

import Image from 'next/image';
import { useState } from 'react';
import { SerializedPerson } from '../LayoutRenderer';
import { generateImageUrl } from '@/lib/image-url';

interface GalleryGridProps {
  person: SerializedPerson;
}

export default function GalleryGrid({ person }: GalleryGridProps) {
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  
  // Use gallery images
  const galleryImages = person.images?.filter(img => img.imageType === 'gallery') || [];

  // Don't show gallery if no additional images
  if (galleryImages.length === 0) {
    return null;
  }

  return (
    <div className="gallery-section w-full">
      {/* Horizontal scrollable gallery with fixed height */}
      <div className="overflow-x-auto">
        <div className="flex gap-4 pb-4">
          {galleryImages.sort((a, b) => a.sequenceNumber - b.sequenceNumber).map((image, index) => (
            <div
              key={`gallery-image-${index}`}
              className="flex-shrink-0 cursor-pointer group"
              onClick={() => setSelectedImageId(image.id)}
            >
              <div className="relative h-48 hover:opacity-90 transition-opacity">
                <Image
                  src={generateImageUrl(image.id, { width: 300, height: 192, quality: 85 })}
                  alt={image.caption || `Photo ${index + 1} of ${person.firstName} ${person.lastName}`}
                  width={300}
                  height={192}
                  className="h-48 w-auto object-contain rounded-lg shadow-sm hover:shadow-md transition-shadow"
                  style={{ width: 'auto', height: 'auto', maxWidth: 'none' }}
                />
                {image.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs text-center line-clamp-1">
                      {image.caption}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox for selected image */}
      {selectedImageId && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImageId(null)}
        >
          <div className="relative max-w-7xl max-h-[90vh]">
            <Image
              src={generateImageUrl(selectedImageId, { width: 1200, height: 800, quality: 90 })}
              alt="Enlarged photo"
              width={1200}
              height={800}
              className="w-auto h-auto max-w-full max-h-[90vh] object-contain"
              style={{ width: 'auto', height: 'auto' }}
            />
            <button
              onClick={() => setSelectedImageId(null)}
              className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}