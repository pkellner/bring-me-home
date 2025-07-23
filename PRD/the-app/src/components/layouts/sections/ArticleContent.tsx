'use client';

import Image from 'next/image';
import { SerializedPerson } from '../LayoutRenderer';
import { useImageUrl } from '@/hooks/useImageUrl';

interface ArticleContentProps {
  person: SerializedPerson;
}

export default function ArticleContent({ person }: ArticleContentProps) {
  const { generateUrl } = useImageUrl();
  // Find the first personal story with content
  const personalStory = person.stories?.find(story => {
    if (story.storyType !== 'personal' || !story.content) return false;
    const text = story.content.replace(/<[^>]*>/g, '').trim();
    return text.length > 0;
  });

  return (
    <div className="article-content space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">
          {person.firstName} {person.middleName ? `${person.middleName} ` : ''}
          {person.lastName}
        </h1>
        <p className="text-xl text-theme-secondary">
          {person.town.name}, {person.town.state}
        </p>
      </div>
      
      {/* Story section */}
      {personalStory && (
        <div className="prose max-w-none">
          <h2 className="text-2xl font-semibold mb-4">Personal Story</h2>
          <div
            dangerouslySetInnerHTML={{ __html: personalStory.content }}
          />
        </div>
      )}

      {/* Gallery of additional images */}
      {person.images && person.images.filter(img => img.imageType === 'gallery').length > 0 && (
        <div className="mt-8">
          <h3 className="text-2xl font-semibold mb-4">Photos</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {person.images
              .filter(img => img.imageType === 'gallery')
              .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
              .map((image, index) => (
                <div key={image.id} className="relative aspect-square overflow-hidden rounded-lg shadow-md">
                  <Image
                    src={image.imageUrl || generateUrl(image.id, { width: 600, height: 600, quality: 85 })}
                    alt={image.caption || `Photo ${index + 1}`}
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