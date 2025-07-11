import Image from 'next/image';
import { SerializedPerson } from '../LayoutRenderer';

interface PersonImageProps {
  person: SerializedPerson;
}

export default function PersonImage({ person }: PersonImageProps) {
  // Only use personImages for primary image
  const primaryImage = person.personImages?.find(img => img.isPrimary && img.displayPublicly);
  const imageUrl = primaryImage?.imageUrl;
  
  return (
    <div className="image-section flex justify-center">
      {imageUrl ? (
        <div className="relative rounded-xl shadow-lg overflow-hidden">
          <Image
            src={imageUrl}
            alt={`${person.firstName} ${person.lastName}`}
            width={600}
            height={600}
            className="max-w-full h-auto object-contain max-h-[600px]"
            style={{ width: 'auto', height: 'auto' }}
            priority
          />
        </div>
      ) : (
        <div className="flex h-64 w-full max-w-md mx-auto items-center justify-center rounded-xl bg-gray-100 shadow-inner">
          <span className="text-xl text-gray-400">No Photo Available</span>
        </div>
      )}
    </div>
  );
}