import Image from 'next/image';
import { SerializedPerson } from '../LayoutRenderer';
import { generateImageUrl } from '@/lib/image-url';

interface FeaturedImageProps {
  person: SerializedPerson;
}

export default function FeaturedImage({ person }: FeaturedImageProps) {
  const profileImage = person.images?.find(img => img.imageType === 'primary');
  
  return (
    <div className="featured-image-section">
      {profileImage ? (
        <div className="relative rounded-lg overflow-hidden shadow-xl">
          <Image
            src={generateImageUrl(profileImage.id, { width: 800, height: 600, quality: 90 })}
            alt={`${person.firstName} ${person.lastName}`}
            width={800}
            height={600}
            className="w-full h-auto object-cover"
            priority
          />
          {profileImage.caption && (
            <div className="absolute top-2 left-2 bg-black/70 text-white px-3 py-1 rounded-md text-sm font-semibold">
              {profileImage.caption}
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-96 w-full items-center justify-center rounded-lg bg-gray-100">
          <span className="text-2xl text-theme-muted">No Photo Available</span>
        </div>
      )}
    </div>
  );
}