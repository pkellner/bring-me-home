import Image from 'next/image';
import StorySection from '@/components/person/StorySection';
import { SerializedPerson } from '../LayoutRenderer';

interface ArticleContentProps {
  person: SerializedPerson;
}

export default function ArticleContent({ person }: ArticleContentProps) {
  return (
    <div className="article-content space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">
          {person.firstName} {person.middleName ? `${person.middleName} ` : ''}
          {person.lastName}
        </h1>
        <p className="text-xl text-gray-600">
          {person.town.name}, {person.town.state}
        </p>
      </div>
      
      {/* Story section */}
      {person.stories && person.stories.length > 0 && (
        <div className="prose max-w-none">
          <StorySection
            stories={person.stories}
            storyType="personal"
            title="Personal Story"
          />
        </div>
      )}

      {/* Gallery of additional images */}
      {person.personImages && person.personImages.filter(img => !img.isPrimary && img.displayPublicly).length > 0 && (
        <div className="mt-8">
          <h3 className="text-2xl font-semibold mb-4">Photos</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {person.personImages
              .filter(img => !img.isPrimary && img.displayPublicly)
              .map((image, index) => (
                <div key={image.id} className="relative aspect-square overflow-hidden rounded-lg shadow-md">
                  <Image
                    src={image.imageUrl}
                    alt={`Photo ${index + 1}`}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}