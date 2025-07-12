'use client';

import { useState } from 'react';
import RichTextEditor from '@/components/RichTextEditor';
import { Story } from '@prisma/client';

interface MultiLanguageStoryEditorProps {
  stories?: Story[];
  onChange: (
    stories: { language: string; storyType: string; content: string }[]
  ) => void;
}

const languageOptions = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
];

const storyTypes = [
  { type: 'personal', label: 'Personal Story' },
  { type: 'detention', label: 'Detention Circumstances' },
  { type: 'family', label: 'Message from Family' },
];

export default function MultiLanguageStoryEditor({
  stories = [],
  onChange,
}: MultiLanguageStoryEditorProps) {
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedStoryType, setSelectedStoryType] = useState('personal');
  
  // Initialize story contents from props
  const initialStoryContents = () => {
    const contents: Record<string, Record<string, string>> = {};
    stories.forEach(story => {
      if (!contents[story.language]) {
        contents[story.language] = {};
      }
      contents[story.language][story.storyType] = story.content;
    });
    return contents;
  };
  
  const [storyContents, setStoryContents] = useState<
    Record<string, Record<string, string>>
  >(initialStoryContents);

  const handleContentChange = (content: string) => {
    const newContents = {
      ...storyContents,
      [selectedLanguage]: {
        ...storyContents[selectedLanguage],
        [selectedStoryType]: content,
      },
    };
    setStoryContents(newContents);

    // Convert to array format for parent component
    const storiesArray: {
      language: string;
      storyType: string;
      content: string;
    }[] = [];
    Object.entries(newContents).forEach(([lang, types]) => {
      Object.entries(types).forEach(([type, content]) => {
        if (content && content.trim()) {
          storiesArray.push({ language: lang, storyType: type, content });
        }
      });
    });
    onChange(storiesArray);
  };

  const currentContent =
    storyContents[selectedLanguage]?.[selectedStoryType] || '';

  const getLanguagesWithContent = (storyType: string) => {
    return languageOptions.filter(
      lang =>
        storyContents[lang.code]?.[storyType] &&
        storyContents[lang.code][storyType].trim()
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Multi-Language Story Editor
        </h3>

        {/* Story Type Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Story Type
          </label>
          <div className="flex flex-wrap gap-2">
            {storyTypes.map(type => {
              const languagesWithContent = getLanguagesWithContent(type.type);
              return (
                <button
                  key={type.type}
                  type="button"
                  onClick={() => setSelectedStoryType(type.type)}
                  className={`
                    px-4 py-2 rounded-md text-sm font-medium transition-colors
                    ${
                      selectedStoryType === type.type
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  {type.label}
                  {languagesWithContent.length > 0 && (
                    <span className="ml-2 text-xs">
                      ({languagesWithContent.map(l => l.flag).join(' ')})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Language Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Language
          </label>
          <div className="flex flex-wrap gap-2">
            {languageOptions.map(lang => {
              const hasContent =
                storyContents[lang.code]?.[selectedStoryType]?.trim();
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setSelectedLanguage(lang.code)}
                  className={`
                    flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${
                      selectedLanguage === lang.code
                        ? 'bg-indigo-600 text-white'
                        : hasContent
                        ? 'bg-green-50 text-green-700 border border-green-300 hover:bg-green-100'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  <span className="text-base">{lang.flag}</span>
                  <span>{lang.name}</span>
                  {hasContent && selectedLanguage !== lang.code && (
                    <span className="text-xs">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-sm text-gray-500 mb-4">
          Currently editing:{' '}
          <span className="font-medium">
            {storyTypes.find(t => t.type === selectedStoryType)?.label}
          </span>{' '}
          in{' '}
          <span className="font-medium">
            {languageOptions.find(l => l.code === selectedLanguage)?.name}
          </span>
        </div>
      </div>

      {/* Rich Text Editor */}
      <div>
        <RichTextEditor
          value={currentContent}
          onChange={handleContentChange}
          placeholder={`Enter the ${selectedStoryType} story in ${languageOptions.find(
            l => l.code === selectedLanguage
          )?.name}...`}
          height={400}
        />
      </div>

      {/* Summary of translations */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          Translation Summary
        </h4>
        <div className="space-y-1 text-sm text-blue-700">
          {storyTypes.map(type => {
            const langs = getLanguagesWithContent(type.type);
            if (langs.length === 0) return null;
            return (
              <div key={type.type}>
                <span className="font-medium">{type.label}:</span>{' '}
                {langs.map(l => `${l.flag} ${l.name}`).join(', ')}
              </div>
            );
          })}
          {Object.keys(storyContents).length === 0 && (
            <div className="text-gray-500">No stories added yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
