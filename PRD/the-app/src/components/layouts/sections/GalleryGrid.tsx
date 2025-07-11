'use client';

import Image from 'next/image';
import { useState } from 'react';
import { SerializedPerson } from '../LayoutRenderer';

interface GalleryGridProps {
  person: SerializedPerson;
}

export default function GalleryGrid({ person }: GalleryGridProps) {
  const [showLargerPictures, setShowLargerPictures] = useState(false);
  // Use personImages, excluding the primary image
  const allImages = person.personImages?.filter(img => !img.isPrimary && img.displayPublicly) || [];

  // Don't show gallery if no additional images
  if (allImages.length === 0) {
    return null;
  }

  // Determine layout based on number of images - smaller images
  const getLayoutClass = () => {
    switch (allImages.length) {
      case 1:
        return "grid-cols-1 max-w-[200px] mx-auto";
      case 2:
        return "grid-cols-2 gap-4 max-w-md mx-auto";
      case 3:
        return "grid-cols-3 gap-4 max-w-2xl mx-auto";
      case 4:
        return "grid-cols-4 gap-4 max-w-3xl mx-auto";
      default:
        return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-5xl mx-auto";
    }
  };

  // Determine max width for images based on count
  const getImageMaxWidth = () => {
    switch (allImages.length) {
      case 1:
        return "max-w-[200px]";
      case 2:
        return "max-w-[200px]";
      case 3:
        return "max-w-[150px]";
      case 4:
        return "max-w-[125px]";
      default:
        return "max-w-[100px]";
    }
  };

  return (
    <div className="gallery-section w-full mt-6 mb-6">
      {/* Checkbox for toggling image size */}
      <div className="mb-4 flex items-center justify-end">
        <label className="flex items-center cursor-pointer space-x-2">
          <input
            type="checkbox"
            checked={showLargerPictures}
            onChange={(e) => setShowLargerPictures(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Show larger pictures</span>
        </label>
      </div>

      <div className={`gallery-grid grid ${getLayoutClass()}`}>
        {allImages.map((image, index) => (
          <div
            key={`secondary-image-${index}`}
            className={`relative group cursor-pointer ${showLargerPictures ? '' : getImageMaxWidth()} mx-auto`}
          >
            <div className="relative overflow-hidden rounded-lg bg-gray-50 shadow-sm hover:shadow-md transition-all duration-300">
              <Image
                src={image.imageUrl}
                alt={image.caption || `Photo ${index + 1} of ${person.firstName} ${person.lastName}`}
                width={showLargerPictures ? 600 : 300}
                height={showLargerPictures ? 800 : 400}
                className="w-full h-auto object-contain transition-transform duration-300 group-hover:scale-105"
                style={{
                  maxHeight: showLargerPictures
                    ? '500px'
                    : (allImages.length === 1 || allImages.length === 2 ? '200px' :
                       allImages.length === 3 ? '150px' :
                       allImages.length === 4 ? '125px' : '100px')
                }}
              />
              {image.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p className="text-white text-sm text-center line-clamp-2">
                    {image.caption}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}