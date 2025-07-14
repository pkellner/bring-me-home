'use client';

import Image from 'next/image';
import { useState } from 'react';
import { SerializedPerson } from '../LayoutRenderer';
import { generateImageUrl } from '@/lib/image-url';

interface GalleryGridProps {
  person: SerializedPerson;
}

type GalleryImage = {
  id: string;
  imageType?: string | null;
  sequenceNumber: number;
  caption?: string | null;
  imageUrl?: string;
};

export default function GalleryGrid({ person }: GalleryGridProps) {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  
  // Use gallery images
  const galleryImages = person.images?.filter(img => img.imageType === 'gallery') || [];

  // Don't show gallery if no additional images
  if (galleryImages.length === 0) {
    return null;
  }

  return (
    <div className="gallery-section w-full">
      {/* Responsive grid gallery */}
      <div className="flex flex-wrap gap-6">
        {galleryImages.sort((a, b) => a.sequenceNumber - b.sequenceNumber).map((image, index) => (
          <div
            key={`gallery-image-${index}`}
            className="relative cursor-pointer group rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 bg-white p-2"
            onClick={() => setSelectedImage(image)}
          >
            <div className="relative w-[200px] h-[200px] bg-gray-50 rounded overflow-hidden">
              <Image
                src={image.imageUrl || generateImageUrl(image.id, { width: 400, height: 400, quality: 90 })}
                alt={image.caption || `Photo ${index + 1} of ${person.firstName} ${person.lastName}`}
                fill
                className="object-contain group-hover:scale-105 transition-transform duration-300"
                sizes="200px"
              />
              {/* Caption overlay that appears on hover */}
              {image.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-black/50 text-white p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <p className="text-sm font-medium">{image.caption}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox for selected image */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
            {/* Close button */}
            <button
              onClick={e => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
              aria-label="Close"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Image container - 70% of viewport */}
            <div className="relative max-w-[70vw] max-h-[70vh] flex items-center justify-center">
              <Image
                src={selectedImage.imageUrl || generateImageUrl(selectedImage.id, { width: 1200, height: 800, quality: 90 })}
                alt={selectedImage.caption || `Photo of ${person.firstName} ${person.lastName}`}
                width={1200}
                height={800}
                className="max-w-full max-h-full object-contain"
                style={{ maxWidth: '70vw', maxHeight: '70vh' }}
              />
            </div>

            {/* Caption below image */}
            {selectedImage.caption && (
              <div className="mt-4 max-w-[70vw] text-center">
                <p className="text-white text-lg">
                  {selectedImage.caption}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}