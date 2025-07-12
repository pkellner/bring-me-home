'use client';

interface Story {
  id: string;
  language: string;
  storyType: string;
  content: string;
}

interface StorySectionProps {
  story: Story;
  title: string;
}

export default function StorySection({
  story,
  title,
}: StorySectionProps) {
  return (
    <div className="story-section">
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      <div
        className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-a:underline"
        dangerouslySetInnerHTML={{ __html: story.content }}
      />
    </div>
  );
}