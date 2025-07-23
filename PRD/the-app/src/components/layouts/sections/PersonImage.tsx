'use client';

import Image from 'next/image';
import { SerializedPerson } from '../LayoutRenderer';
import { getImageUrl } from '@/lib/image-url-client';
import { useImageLogging } from '@/hooks/useImageLogging';

interface PersonImageProps {
  person: SerializedPerson;
}

export default function PersonImage({ person }: PersonImageProps) {
  // Use primary image
  const profileImage = person.images?.find(img => img.imageType === 'primary');
  // Use pre-generated imageUrl when available, otherwise generate client-side
  const imageUrl = profileImage?.imageUrl || getImageUrl(profileImage, { width: 600, height: 600, quality: 90 });
  //console.log("/src/components/layouts/sections/PersonImage.tsx: imageUrl", imageUrl);

  useImageLogging(
    imageUrl,
    `PersonImage component - ${person.firstName} ${person.lastName}`,
    profileImage?.id
  );

  return (
    <div className="image-section flex justify-center">
      {profileImage ? (
        <div className="relative rounded-xl shadow-lg overflow-hidden">
          <Image
            src={imageUrl!}
            alt={`${person.firstName} ${person.lastName}`}
            width={600}
            height={600}
            className="max-w-full h-auto object-contain max-h-[600px]"
            style={{ width: 'auto', height: 'auto' }}
            priority
          />
          {profileImage.caption && (
            <div className="absolute top-2 left-2 bg-black/70 text-white px-3 py-1 rounded-md text-sm font-semibold">
              {profileImage.caption}
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-64 w-full max-w-md mx-auto items-center justify-center rounded-xl bg-gray-100 shadow-inner">
          <span className="text-xl text-theme-muted">No Photo Available</span>
        </div>
      )}
    </div>
  );
}