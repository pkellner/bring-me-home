import Image from 'next/image';
import { SerializedPerson } from '../LayoutRenderer';

interface GalleryGridProps {
  person: SerializedPerson;
}

export default function GalleryGrid({ person }: GalleryGridProps) {
  // Use personImages, excluding the primary image
  const allImages = person.personImages?.filter(img => !img.isPrimary && img.displayPublicly) || [];
  
  // Don't show gallery if no additional images
  if (allImages.length === 0) {
    return null;
  }
  
  // Determine layout based on number of images - smaller images
  const getLayoutClass = () => {
    switch (allImages.length) {
      case 1:
        return "grid-cols-1 max-w-xs mx-auto";
      case 2:
        return "grid-cols-2 gap-3 max-w-sm mx-auto";
      case 3:
        return "grid-cols-3 gap-3 max-w-lg mx-auto";
      default:
        return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-4xl mx-auto";
    }
  };

  return (
    <div className="gallery-section w-full mt-6 mb-6">
      <h3 className="text-lg font-semibold mb-3">Additional Photos</h3>
      <div className={`gallery-grid grid ${getLayoutClass()}`}>
        {allImages.map((image, index) => (
          <div
            key={`secondary-image-${index}`}
            className="relative group cursor-pointer"
          >
            <div className="aspect-square overflow-hidden rounded-lg bg-gray-50 shadow-sm hover:shadow-md transition-all duration-300">
              <Image
                src={image.imageUrl}
                alt={`Photo ${index + 1} of ${person.firstName} ${person.lastName}`}
                width={150}
                height={150}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}