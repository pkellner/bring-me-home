'use client';

import { useMemo, useState } from 'react';
import StorySection from '@/components/person/StorySection';
import { SerializedPerson } from '../LayoutRenderer';

interface StoryProps {
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

export default function Story({ person }: StoryProps) {
  // Get all available languages across all story types  
  const availableLanguages = useMemo(() => {
    const languages = new Set(person.stories?.map(story => story.language) || []);
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

  // Filter stories by language and check if they have content
  const storiesByType = useMemo(() => {
    const filtered = person.stories?.filter(s => s.language === selectedLanguage) || [];
    
    const personal = filtered.find(s => s.storyType === 'personal');
    const detention = filtered.find(s => s.storyType === 'detention');
    const family = filtered.find(s => s.storyType === 'family');

    // Helper to check if story has real content
    const hasContent = (story: { content: string } | undefined) => {
      if (!story || !story.content) return false;
      const text = story.content.replace(/<[^>]*>/g, '').trim();
      return text.length > 0;
    };

    return {
      personal: hasContent(personal) ? personal : null,
      detention: hasContent(detention) ? detention : null,
      family: hasContent(family) ? family : null,
    };
  }, [person.stories, selectedLanguage]);

  if (!person.stories || person.stories.length === 0) {
    return (
      <div className="story-section">
        <p className="text-theme-muted italic">No story has been added yet.</p>
      </div>
    );
  }

  const showLanguageToggle = availableLanguages.length > 1;

  return (
    <div className="space-y-8">
      {/* Language toggle if multiple languages */}
      {showLanguageToggle && (
        <div className="flex items-center gap-2 justify-end -mt-12 mb-6">
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

      {/* Personal Story */}
      {storiesByType.personal && (
        <StorySection
          story={storiesByType.personal}
          title="Personal Story"
        />
      )}

      {/* Detention Circumstances */}
      {storiesByType.detention && (
        <StorySection
          story={storiesByType.detention}
          title="Detention Circumstances"
        />
      )}

      {/* Message from Family */}
      {storiesByType.family && (
        <StorySection
          story={storiesByType.family}
          title="Message from Family"
        />
      )}

      {/* If no stories have content in the selected language */}
      {!storiesByType.personal && !storiesByType.detention && !storiesByType.family && (
        <p className="text-theme-muted italic">No stories available in {languageNames[selectedLanguage] || selectedLanguage}.</p>
      )}
    </div>
  );
}