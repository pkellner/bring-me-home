import StorySection from '@/components/person/StorySection';
import { SerializedPerson } from '../LayoutRenderer';

interface StoryProps {
  person: SerializedPerson;
}

export default function Story({ person }: StoryProps) {
  if (!person.stories || person.stories.length === 0) {
    return (
      <div className="story-section">
        <h2 className="mb-4 text-2xl font-bold">Story</h2>
        <p className="text-gray-500 italic">No story has been added yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <StorySection
        stories={person.stories}
        storyType="personal"
        title="Personal Story"
      />
      {person.stories.some(s => s.storyType === 'detention') && (
        <StorySection
          stories={person.stories}
          storyType="detention"
          title="Detention Circumstances"
        />
      )}
      {person.stories.some(s => s.storyType === 'family') && (
        <StorySection
          stories={person.stories}
          storyType="family"
          title="Message from Family"
        />
      )}
    </div>
  );
}