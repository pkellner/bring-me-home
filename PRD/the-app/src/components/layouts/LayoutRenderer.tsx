'use client';

import { Person, Town, Comment } from '@prisma/client';
import Image from 'next/image';
import { formatDate } from '@/lib/utils';
import CommentSection from '@/components/person/CommentSection';

interface LayoutRendererProps {
  person: Person & {
    town: Town;
    comments: any[];
  };
  layout: {
    id: string;
    name: string;
    template: string;
  };
  theme?: {
    id: string;
    name: string;
    cssVars: string | null;
  };
}

export default function LayoutRenderer({ person, layout, theme }: LayoutRendererProps) {
  const template = JSON.parse(layout.template);
  
  // Apply theme CSS variables if provided
  const themeStyles = theme?.cssVars ? (
    <style dangerouslySetInnerHTML={{ __html: theme.cssVars }} />
  ) : null;

  // Common components that can be used in layouts
  const components = {
    'hero-image': () => (
      <div className="hero-image relative h-96 w-full overflow-hidden rounded-lg">
        {person.primaryPicture ? (
          <Image
            src={person.primaryPicture}
            alt={`${person.firstName} ${person.lastName}`}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gray-200">
            <span className="text-4xl text-gray-400">No Photo Available</span>
          </div>
        )}
      </div>
    ),
    
    'image': () => (
      <div className="image-section">
        {person.primaryPicture ? (
          <Image
            src={person.primaryPicture}
            alt={`${person.firstName} ${person.lastName}`}
            width={400}
            height={400}
            className="rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-96 w-full items-center justify-center rounded-lg bg-gray-200">
            <span className="text-2xl text-gray-400">No Photo Available</span>
          </div>
        )}
      </div>
    ),
    
    'info': () => (
      <div className="info-section space-y-4">
        <h1 className="text-3xl font-bold">
          {person.firstName} {person.middleName} {person.lastName}
        </h1>
        <div className="grid grid-cols-1 gap-2 text-sm">
          {person.dateOfBirth && (
            <div>
              <span className="font-semibold">Date of Birth:</span>{' '}
              {formatDate(person.dateOfBirth)}
            </div>
          )}
          {person.height && (
            <div>
              <span className="font-semibold">Height:</span> {person.height}
            </div>
          )}
          {person.weight && (
            <div>
              <span className="font-semibold">Weight:</span> {person.weight}
            </div>
          )}
          {person.eyeColor && (
            <div>
              <span className="font-semibold">Eye Color:</span> {person.eyeColor}
            </div>
          )}
          {person.hairColor && (
            <div>
              <span className="font-semibold">Hair Color:</span> {person.hairColor}
            </div>
          )}
          <div>
            <span className="font-semibold">Last Known Address:</span>{' '}
            {person.lastKnownAddress}
          </div>
          {person.lastSeenDate && (
            <div>
              <span className="font-semibold">Last Seen:</span>{' '}
              {formatDate(person.lastSeenDate)}
              {person.lastSeenLocation && ` at ${person.lastSeenLocation}`}
            </div>
          )}
        </div>
      </div>
    ),
    
    'story': () => person.story && (
      <div className="story-section">
        <h2 className="mb-4 text-2xl font-bold">Story</h2>
        <div className="prose max-w-none">
          <p className="whitespace-pre-wrap">{person.story}</p>
        </div>
      </div>
    ),
    
    'comments': () => (
      <div className="comments-section">
        <CommentSection personId={person.id} comments={person.comments} isAuthenticated={true} />
      </div>
    ),
    
    'basic-info': () => (
      <div className="basic-info text-center">
        <h1 className="mb-2 text-4xl font-bold">
          {person.firstName} {person.lastName}
        </h1>
        <p className="text-xl text-gray-600">{person.town.name}, {person.town.state}</p>
      </div>
    ),
    
    'sidebar-info': () => (
      <div className="sidebar-info rounded-lg bg-gray-50 p-6">
        <h3 className="mb-4 text-lg font-semibold">Information</h3>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="font-semibold">Name</dt>
            <dd>{person.firstName} {person.middleName} {person.lastName}</dd>
          </div>
          <div>
            <dt className="font-semibold">Location</dt>
            <dd>{person.town.name}, {person.town.state}</dd>
          </div>
          {person.dateOfBirth && (
            <div>
              <dt className="font-semibold">Born</dt>
              <dd>{formatDate(person.dateOfBirth)}</dd>
            </div>
          )}
        </dl>
      </div>
    ),
    
    'main-content': () => (
      <div className="main-content space-y-6">
        {components['image']()}
        {components['story']()}
      </div>
    ),
    
    'gallery-grid': () => (
      <div className="gallery-grid grid grid-cols-2 gap-4 md:grid-cols-3">
        {person.primaryPicture && (
          <div className="relative aspect-square overflow-hidden rounded-lg">
            <Image
              src={person.primaryPicture}
              alt="Primary"
              fill
              className="object-cover"
            />
          </div>
        )}
        {person.secondaryPic1 && (
          <div className="relative aspect-square overflow-hidden rounded-lg">
            <Image
              src={person.secondaryPic1}
              alt="Secondary 1"
              fill
              className="object-cover"
            />
          </div>
        )}
        {person.secondaryPic2 && (
          <div className="relative aspect-square overflow-hidden rounded-lg">
            <Image
              src={person.secondaryPic2}
              alt="Secondary 2"
              fill
              className="object-cover"
            />
          </div>
        )}
      </div>
    ),
  };

  // Render layout based on type
  const renderLayout = () => {
    switch (template.type) {
      case 'grid':
        return (
          <div className={`grid gap-6 md:grid-cols-${template.columns || 2}`}>
            {template.sections.map((section: string) => (
              <div key={section} className="layout-section">
                {components[section as keyof typeof components]?.()}
              </div>
            ))}
          </div>
        );
        
      case 'stack':
        return (
          <div className="space-y-6">
            {template.sections.map((section: string) => (
              <div key={section} className="layout-section">
                {components[section as keyof typeof components]?.()}
              </div>
            ))}
          </div>
        );
        
      case 'hero':
        return (
          <div className="space-y-6">
            {template.sections.map((section: string) => (
              <div key={section} className="layout-section">
                {components[section as keyof typeof components]?.()}
              </div>
            ))}
          </div>
        );
        
      case 'sidebar-left':
        return (
          <div className="grid gap-6 md:grid-cols-[300px_1fr]">
            <aside>
              {template.sections
                .filter((s: string) => s.includes('sidebar'))
                .map((section: string) => (
                  <div key={section} className="layout-section">
                    {components[section as keyof typeof components]?.()}
                  </div>
                ))}
            </aside>
            <main>
              {template.sections
                .filter((s: string) => !s.includes('sidebar'))
                .map((section: string) => (
                  <div key={section} className="layout-section mb-6">
                    {components[section as keyof typeof components]?.()}
                  </div>
                ))}
            </main>
          </div>
        );
        
      case 'sidebar-right':
        return (
          <div className="grid gap-6 md:grid-cols-[1fr_300px]">
            <main>
              {template.sections
                .filter((s: string) => !s.includes('sidebar'))
                .map((section: string) => (
                  <div key={section} className="layout-section mb-6">
                    {components[section as keyof typeof components]?.()}
                  </div>
                ))}
            </main>
            <aside>
              {template.sections
                .filter((s: string) => s.includes('sidebar'))
                .map((section: string) => (
                  <div key={section} className="layout-section">
                    {components[section as keyof typeof components]?.()}
                  </div>
                ))}
            </aside>
          </div>
        );
        
      case 'magazine':
        return (
          <div className="magazine-layout">
            <div className="grid gap-6 md:grid-cols-3">
              {template.sections.map((section: string) => (
                <div
                  key={section}
                  className={`layout-section ${
                    section === 'featured-image' ? 'md:col-span-2' : ''
                  }`}
                >
                  {components[section as keyof typeof components]?.()}
                </div>
              ))}
            </div>
          </div>
        );
        
      case 'minimal':
        return (
          <div className="minimal-layout mx-auto max-w-2xl space-y-8">
            {template.sections.map((section: string) => (
              <div key={section} className="layout-section">
                {components[section as keyof typeof components]?.()}
              </div>
            ))}
          </div>
        );
        
      case 'gallery':
        return (
          <div className="gallery-layout space-y-6">
            {template.sections.map((section: string) => (
              <div key={section} className="layout-section">
                {components[section as keyof typeof components]?.()}
              </div>
            ))}
          </div>
        );
        
      case 'full-width':
        return (
          <div className="full-width-layout">
            {template.sections.map((section: string) => (
              <div key={section} className="layout-section mb-8">
                {components[section as keyof typeof components]?.()}
              </div>
            ))}
          </div>
        );
        
      default:
        // Fallback to stack layout
        return (
          <div className="space-y-6">
            {template.sections.map((section: string) => (
              <div key={section} className="layout-section">
                {components[section as keyof typeof components]?.()}
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <>
      {themeStyles}
      <div className="layout-container">
        {renderLayout()}
      </div>
    </>
  );
}