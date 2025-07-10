'use client';

import { useMemo, useState } from 'react';

interface Story {
  id: string;
  language: string;
  storyType: string;
  content: string;
}

interface StorySectionProps {
  stories: Story[];
  storyType: 'personal' | 'detention' | 'family';
  title: string;
}

const languageNames: Record<string, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  pt: 'Português',
  zh: '中文',
  ar: 'العربية',
  hi: 'हिन्दी',
  de: 'Deutsch',
  it: 'Italiano',
  ja: '日本語',
  ko: '한국어',
};

const languageFlags: Record<string, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷',
  pt: '🇧🇷',
  zh: '🇨🇳',
  ar: '🇸🇦',
  hi: '🇮🇳',
  de: '🇩🇪',
  it: '🇮🇹',
  ja: '🇯🇵',
  ko: '🇰🇷',
};

export default function StorySection({
  stories,
  storyType,
  title,
}: StorySectionProps) {
  const filteredStories = useMemo(
    () => stories.filter(story => story.storyType === storyType),
    [stories, storyType]
  );

  const availableLanguages = useMemo(
    () => [...new Set(filteredStories.map(story => story.language))],
    [filteredStories]
  );

  const [selectedLanguage, setSelectedLanguage] = useState(
    availableLanguages.includes('en') ? 'en' : availableLanguages[0] || 'en'
  );

  const currentStory = filteredStories.find(
    story => story.language === selectedLanguage
  );

  if (!currentStory) {
    return (
      <div className="story-section">
        <h2 className="mb-4 text-2xl font-bold">{title}</h2>
        <p className="text-gray-500 italic">
          No {title.toLowerCase()} has been added yet.
        </p>
      </div>
    );
  }

  return (
    <div className="story-section">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        {availableLanguages.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Language:</span>
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
              {availableLanguages.map(lang => (
                <button
                  key={lang}
                  onClick={() => setSelectedLanguage(lang)}
                  className={`
                    flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors
                    ${
                      selectedLanguage === lang
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                  title={languageNames[lang] || lang}
                >
                  <span className="text-base">
                    {languageFlags[lang] || '🌐'}
                  </span>
                  <span>{languageNames[lang] || lang.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-a:underline"
        dangerouslySetInnerHTML={{ __html: currentStory.content }}
      />
    </div>
  );
}
