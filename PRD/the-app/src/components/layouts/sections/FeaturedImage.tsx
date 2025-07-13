import Image from 'next/image';
import { SerializedPerson } from '../LayoutRenderer';

interface FeaturedImageProps {
  person: SerializedPerson;
}

export default function FeaturedImage({ person }: FeaturedImageProps) {
  const primaryImage = person.personImages?.find(img => img.isPrimary && img.displayPublicly);
  
  return (
    <div className="featured-image-section">
      {primaryImage ? (
        <div className="relative rounded-lg overflow-hidden shadow-xl">
          <Image
            src={primaryImage.imageUrl}
            alt={`${person.firstName} ${person.lastName}`}
            width={800}
            height={600}
            className="w-full h-auto object-cover"
            priority
          />
        </div>
      ) : (
        <div className="flex h-96 w-full items-center justify-center rounded-lg bg-gray-100">
          <span className="text-2xl text-theme-muted">No Photo Available</span>
        </div>
      )}
    </div>
  );
}