'use client';

import { useMemo, useState } from 'react';
import { SerializedPerson } from '../LayoutRenderer';

interface StoryWithLanguageToggleProps {
  person: SerializedPerson;
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

export default function StoryWithLanguageToggle({ person }: StoryWithLanguageToggleProps) {
  // Get all available languages across all story types
  const availableLanguages = useMemo(() => {
    if (!person.stories || person.stories.length === 0) return [];
    const languages = new Set(person.stories.map(story => story.language));
    return Array.from(languages).sort((a, b) => {
      // Sort with English first, then alphabetically
      if (a === 'en') return -1;
      if (b === 'en') return 1;
      return a.localeCompare(b);
    });
  }, [person.stories]);

  const [selectedLanguage, setSelectedLanguage] = useState(
    availableLanguages.includes('en') ? 'en' : availableLanguages[0] || 'en'
  );

  // Helper to check if story has real content
  const hasContent = (story: { content: string } | undefined) => {
    if (!story || !story.content) return false;
    const text = story.content.replace(/<[^>]*>/g, '').trim();
    return text.length > 0;
  };

  // Filter stories by language and type
  const storiesByType = useMemo(() => {
    if (!person.stories) return { personal: null, detention: null, family: null };
    
    const filtered = person.stories.filter(s => s.language === selectedLanguage);
    
    const personal = filtered.find(s => s.storyType === 'personal');
    const detention = filtered.find(s => s.storyType === 'detention');
    const family = filtered.find(s => s.storyType === 'family');

    return {
      personal: hasContent(personal) ? personal : null,
      detention: hasContent(detention) ? detention : null,
      family: hasContent(family) ? family : null,
    };
  }, [person.stories, selectedLanguage]);

  if (!person.stories || person.stories.length === 0) {
    return (
      <div>
        <div className="border-b border-gray-200 pb-3 mb-6">
          <h2 className="text-2xl font-light tracking-wide text-theme-primary">
            Their Story
          </h2>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <p className="text-theme-muted italic">No story has been added yet.</p>
        </div>
      </div>
    );
  }

  const showLanguageToggle = availableLanguages.length > 1;

  return (
    <div>
      <div className="border-b border-gray-200 pb-3 mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-light tracking-wide text-theme-primary">
          Their Story
        </h2>
        {showLanguageToggle && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-theme-secondary">Language:</span>
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
                        : 'text-theme-primary hover:bg-gray-100'
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
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="space-y-8">
          {/* Personal Story */}
          {storiesByType.personal && (
            <div className="story-section">
              <h3 className="text-xl font-semibold mb-4">Personal Story</h3>
              <div
                className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-a:underline"
                dangerouslySetInnerHTML={{ __html: storiesByType.personal.content }}
              />
            </div>
          )}

          {/* Detention Circumstances */}
          {storiesByType.detention && (
            <div className="story-section">
              <h3 className="text-xl font-semibold mb-4">Detention Circumstances</h3>
              <div
                className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-a:underline"
                dangerouslySetInnerHTML={{ __html: storiesByType.detention.content }}
              />
            </div>
          )}

          {/* Message from Family */}
          {storiesByType.family && (
            <div className="story-section">
              <h3 className="text-xl font-semibold mb-4">Message from Family</h3>
              <div
                className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-a:underline"
                dangerouslySetInnerHTML={{ __html: storiesByType.family.content }}
              />
            </div>
          )}

          {/* If no stories have content in the selected language */}
          {!storiesByType.personal && !storiesByType.detention && !storiesByType.family && (
            <p className="text-theme-muted italic">No stories available in {languageNames[selectedLanguage] || selectedLanguage}.</p>
          )}
        </div>
      </div>
    </div>
  );
}