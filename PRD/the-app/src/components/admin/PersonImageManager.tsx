'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { TrashIcon } from '@heroicons/react/24/outline';

interface PersonImage {
  id?: string;
  imageUrl: string;
  thumbnailUrl?: string | null;
  caption?: string | null;
  file?: File;
  isNew?: boolean;
  toDelete?: boolean;
}

interface PersonImageManagerProps {
  primaryImage?: string | null;
  existingImages?: PersonImage[];
  onChange: (
    primaryImage: File | null,
    additionalImages: PersonImage[]
  ) => void;
}

export default function PersonImageManager({
  primaryImage,
  existingImages = [],
  onChange,
}: PersonImageManagerProps) {
  const [primaryFile, setPrimaryFile] = useState<File | null>(null);
  const [primaryPreview, setPrimaryPreview] = useState<string | null>(
    primaryImage || null
  );
  const [additionalImages, setAdditionalImages] =
    useState<PersonImage[]>(existingImages);

  useEffect(() => {
    onChange(primaryFile, additionalImages);
  }, [primaryFile, additionalImages, onChange]);

  const handlePrimaryImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPrimaryFile(file);
    setPrimaryPreview(URL.createObjectURL(file));
  };

  const handleAdditionalImagesSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files) return;

    const currentCount = additionalImages.filter(img => !img.toDelete).length;
    const remainingSlots = 5 - currentCount;
    const filesToAdd = Math.min(files.length, remainingSlots);

    if (filesToAdd < files.length) {
      alert(
        `You can only have 5 additional images. Adding ${filesToAdd} of ${files.length} selected images.`
      );
    }

    const newImages: PersonImage[] = [];

    for (let i = 0; i < filesToAdd; i++) {
      const file = files[i];
      const imageUrl = URL.createObjectURL(file);

      newImages.push({
        imageUrl,
        file,
        isNew: true,
        caption: '',
      });
    }

    setAdditionalImages([...additionalImages, ...newImages]);
  };

  const removeAdditionalImage = (index: number) => {
    const newImages = [...additionalImages];

    if (newImages[index].id) {
      // Mark existing image for deletion
      newImages[index] = { ...newImages[index], toDelete: true };
    } else {
      // Remove new image completely
      newImages.splice(index, 1);
    }

    setAdditionalImages(newImages);
  };

  const updateCaption = (index: number, caption: string) => {
    const newImages = [...additionalImages];
    newImages[index] = {
      ...newImages[index],
      caption,
    };
    setAdditionalImages(newImages);
  };

  const activeAdditionalImages = additionalImages.filter(img => !img.toDelete);

  return (
    <div className="space-y-8">
      {/* Primary Image Section */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Primary Picture of Person
        </h3>
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6">
          {primaryPreview ? (
            <div className="space-y-4">
              <div className="relative w-48 h-48 mx-auto">
                <Image
                  src={primaryPreview}
                  alt="Primary image"
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
              <div className="text-center">
                <label
                  htmlFor="primary-image-upload"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
                >
                  Change Primary Picture
                </label>
                <input
                  id="primary-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePrimaryImageSelect}
                  className="sr-only"
                />
              </div>
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
              <label
                htmlFor="primary-image-upload"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
              >
                Upload Primary Picture
              </label>
              <input
                id="primary-image-upload"
                type="file"
                accept="image/*"
                onChange={handlePrimaryImageSelect}
                className="sr-only"
              />
              <p className="mt-2 text-sm text-gray-500">
                This will be the main picture shown for this person
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Additional Images Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Additional Pictures ({activeAdditionalImages.length}/5)
          </h3>
          {activeAdditionalImages.length < 5 && (
            <label
              htmlFor="additional-images-upload"
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
            >
              Add Pictures
            </label>
          )}
          <input
            id="additional-images-upload"
            type="file"
            multiple
            accept="image/*"
            onChange={handleAdditionalImagesSelect}
            className="sr-only"
          />
        </div>

        {activeAdditionalImages.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {additionalImages.map((image, index) => {
              if (image.toDelete) return null;

              return (
                <div key={image.id || `new-${index}`} className="space-y-2">
                  <div className="relative aspect-square">
                    <Image
                      src={image.imageUrl || image.thumbnailUrl || ''}
                      alt={image.caption || `Image ${index + 1}`}
                      fill
                      className="object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeAdditionalImage(index)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
                      title="Remove image"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={image.caption || ''}
                    onChange={e => updateCaption(index, e.target.value)}
                    placeholder="Caption (optional)"
                    className="w-full text-sm px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              );
            })}
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
              No additional pictures yet. You can add up to 5 pictures.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
