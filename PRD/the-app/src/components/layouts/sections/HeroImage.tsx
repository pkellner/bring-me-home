'use client';

import Image from 'next/image';
import { SerializedPerson } from '../LayoutRenderer';
import { useImageUrl } from '@/hooks/useImageUrl';

interface HeroImageProps {
  person: SerializedPerson;
}

export default function HeroImage({ person }: HeroImageProps) {
  const { generateUrl } = useImageUrl();
  const profileImage = person.images?.find(img => img.imageType === 'primary');
  
  return (
    <div className="hero-image relative h-64 sm:h-80 md:h-96 w-full overflow-hidden rounded-lg">
      {profileImage ? (
        <>
          <Image
            src={generateUrl(profileImage.id, { width: 1200, height: 600, quality: 90 })}
            alt={`${person.firstName} ${person.lastName}`}
            fill
            sizes="100vw"
            className="object-cover"
          />
          {profileImage.caption && (
            <div className="absolute top-2 left-2 bg-black/70 text-white px-3 py-1 rounded-md text-sm font-semibold">
              {profileImage.caption}
            </div>
          )}
        </>
      ) : (
        <div className="flex h-full items-center justify-center bg-gray-200">
          <span className="text-3xl text-theme-muted">No Photo Available</span>
        </div>
      )}
    </div>
  );
}