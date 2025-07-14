'use client';

import { useState } from 'react';
import ImageUpload from './ImageUpload';

interface PersonImage {
  id: string;
  imageUrl: string;
  caption?: string | null;
  isPrimary: boolean;
}

interface PersonGalleryProps {
  images: PersonImage[];
  personName: string;
  personId?: string;
  canUpload?: boolean;
}

export default function PersonGallery({
  images,
  personName,
  personId,
  canUpload,
}: PersonGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<PersonImage | null>(null);

  if (images.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Photos</h2>
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                className="h-12 w-12"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No photos available
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              No photos have been uploaded for {personName} yet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Photos</h2>
            {canUpload && personId && (
              <ImageUpload personId={personId} personName={personName} />
            )}
          </div>
          <div className="flex flex-wrap gap-4">
            {images.map(image => (
              <div
                key={image.id}
                className="relative cursor-pointer group overflow-hidden rounded-lg"
                onClick={() => setSelectedImage(image)}
                style={{ width: '300px' }}
              >
                <div className="w-full h-[300px] bg-gray-200 overflow-hidden">
                  <img
                    src={image.imageUrl}
                    alt={image.caption || `Photo of ${personName}`}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
                {image.isPrimary && (
                  <div className="absolute top-2 left-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      Primary
                    </span>
                  </div>
                )}
                {/* Caption overlay that appears on hover */}
                {image.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-200 rounded-b-lg">
                    <p className="text-sm">{image.caption}</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity duration-200 rounded-lg pointer-events-none" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          onClick={() => setSelectedImage(null)}
        >
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" />

            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all w-full max-w-4xl">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedImage.caption || `Photo of ${personName}`}
                  </h3>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedImage(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      className="h-6 w-6"
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
                </div>

                <div className="max-h-96 flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={selectedImage.imageUrl}
                    alt={selectedImage.caption || `Photo of ${personName}`}
                    className="max-h-full max-w-full object-contain"
                    onClick={e => e.stopPropagation()}
                  />
                </div>

                {selectedImage.caption && (
                  <p className="mt-4 text-sm text-gray-600">
                    {selectedImage.caption}
                  </p>
                )}
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedImage(null);
                  }}
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
