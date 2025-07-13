import Image from 'next/image';
import { SerializedPerson } from '../LayoutRenderer';
import { generateImageUrl } from '@/lib/image-url';

interface HeroImageProps {
  person: SerializedPerson;
}

export default function HeroImage({ person }: HeroImageProps) {
  const profileImage = person.images?.find(img => img.imageType === 'profile');
  
  return (
    <div className="hero-image relative h-64 sm:h-80 md:h-96 w-full overflow-hidden rounded-lg">
      {profileImage ? (
        <Image
          src={generateImageUrl(profileImage.id, profileImage.updatedAt, { width: 1200, height: 600, quality: 90 })}
          alt={`${person.firstName} ${person.lastName}`}
          fill
          sizes="100vw"
          className="object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-gray-200">
          <span className="text-3xl text-theme-muted">No Photo Available</span>
        </div>
      )}
    </div>
  );
}