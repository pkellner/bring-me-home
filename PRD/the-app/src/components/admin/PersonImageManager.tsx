'use client';

import Image from 'next/image';

interface PersonImage {
  id?: string;
  imageUrl: string;
  thumbnailUrl?: string | null;
  caption?: string | null;
}

interface PersonImageManagerProps {
  primaryImage?: string | null;
  existingImages?: PersonImage[];
}

// Display-only component - no state or event handlers
export default function PersonImageManager({
  primaryImage,
  existingImages = [],
}: PersonImageManagerProps) {
  return (
    <div className="space-y-8">
      {/* Primary Image Section - Display Only */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Primary Picture of Person
        </h3>
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6">
          {primaryImage ? (
            <div className="space-y-4">
              <div className="relative w-48 h-48 mx-auto">
                <Image
                  src={primaryImage}
                  alt="Primary image"
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover rounded-lg"
                />
              </div>
              <p className="text-center text-sm text-gray-500">
                Current primary image
              </p>
            </div>
          ) : (
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="mt-4 text-sm text-gray-500">
                No primary image available
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Additional Images Section - Display Only */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Additional Pictures ({existingImages.length}/5)
          </h3>
        </div>

        {existingImages.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {existingImages.map((image, index) => (
              <div key={image.id || `image-${index}`} className="space-y-2">
                <div className="relative aspect-square">
                  <Image
                    src={image.imageUrl || image.thumbnailUrl || ''}
                    alt={image.caption || `Image ${index + 1}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                    className="object-cover rounded-lg"
                  />
                </div>
                {image.caption && (
                  <p className="text-sm text-gray-600 text-center">
                    {image.caption}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-500">
              No additional pictures
            </p>
          </div>
        )}
      </div>
    </div>
  );
}