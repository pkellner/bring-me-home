import Image from 'next/image';
import { SerializedPerson } from '../LayoutRenderer';

interface HeroImageProps {
  person: SerializedPerson;
}

export default function HeroImage({ person }: HeroImageProps) {
  const primaryImage = person.personImages?.find(img => img.isPrimary && img.displayPublicly);
  
  return (
    <div className="hero-image relative h-64 sm:h-80 md:h-96 w-full overflow-hidden rounded-lg">
      {primaryImage ? (
        <Image
          src={primaryImage.imageUrl}
          alt={`${person.firstName} ${person.lastName}`}
          fill
          className="object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-gray-200">
          <span className="text-3xl text-gray-400">No Photo Available</span>
        </div>
      )}
    </div>
  );
}