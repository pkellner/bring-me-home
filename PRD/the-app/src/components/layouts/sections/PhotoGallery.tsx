'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { SerializedPerson } from '../LayoutRenderer';
import { getImageUrl } from '@/lib/image-url-client';

interface PhotoGalleryProps {
  person: SerializedPerson;
}

type GalleryImage = {
  id: string;
  imageType?: string | null;
  sequenceNumber: number;
  caption?: string | null;
  imageUrl?: string;
};

export default function PhotoGallery({ person }: PhotoGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  
  // Use useMemo to avoid dependency issues
  const galleryImages = useMemo(() => 
    person.images?.filter(img => img.imageType === 'gallery') || [],
    [person.images]
  );

  // Gallery images are already filtered, no need for additional logging
  useEffect(() => {
    // Images are ready to display
  }, [galleryImages, person.firstName, person.lastName]);

  if (galleryImages.length === 0) {
    return null;
  }

  return (
    <>
      <div className="w-full">
        <h3 className="text-xl font-semibold mb-4">Photo Gallery</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {galleryImages.sort((a, b) => a.sequenceNumber - b.sequenceNumber).map((image, index) => (
            <div
              key={image.id}
              className="relative cursor-pointer group overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-shadow"
              onClick={() => setSelectedImage(image)}
            >
              <div className="relative w-full aspect-square">
                <Image
                  src={getImageUrl(image, { width: 600, height: 600, quality: 90 }) || ''}
                  alt={image.caption || `Photo ${index + 1} of ${person.firstName} ${person.lastName}`}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
                {/* Caption overlay that appears on hover */}
                {image.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                    <p className="text-sm">{image.caption}</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity duration-200 pointer-events-none" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Image Modal */}
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
            >
              <svg
                className="h-8 w-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Image container - 70% of viewport */}
            <div className="relative max-w-[70vw] max-h-[70vh] flex items-center justify-center">
              <Image
                src={getImageUrl(selectedImage, { width: 1200, height: 800, quality: 90 }) || ''}
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
    </>
  );
}