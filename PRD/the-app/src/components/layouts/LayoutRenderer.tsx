'use client';

import { Comment, Person, Town } from '@prisma/client';
import * as sections from './sections';

type SerializedComment = Comment & {
  createdAt: string;
  updatedAt: string;
  birthdate?: string | null;
  approvedAt?: string | null;
};

type SerializedDetentionCenter = {
  id: string;
  name: string;
  facilityType: string;
  operatedBy?: string | null;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phoneNumber?: string | null;
  faxNumber?: string | null;
  emailAddress?: string | null;
  website?: string | null;
  capacity?: number | null;
  currentPopulation?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  isActive: boolean;
  isICEFacility: boolean;
  notes?: string | null;
  transportInfo?: string | null;
  visitingHours?: string | null;
  thumbnailImageId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SerializedPerson = Omit<Person, 'bondAmount'> & {
  bondAmount: string | null;
  town: Town & {
    layout?: { id: string; name: string; template: string } | null;
    theme?: { id: string; name: string; cssVars: string | null } | null;
  };
  layout?: { id: string; name: string; template: string } | null;
  theme?: { id: string; name: string; cssVars: string | null } | null;
  comments: SerializedComment[];
  detentionCenter?: SerializedDetentionCenter;
  stories?: Array<{
    id: string;
    language: string;
    storyType: string;
    content: string;
  }>;
  personImages?: Array<{
    id: string;
    imageUrl: string;
    thumbnailUrl?: string | null;
    caption?: string | null;
    isPrimary: boolean;
    displayPublicly: boolean;
    isActive: boolean;
  }>;
};

interface LayoutRendererProps {
  person: SerializedPerson;
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
  isAdmin?: boolean;
}

const nonTemplateLayout = true;

export default function LayoutRenderer({
  person,
  layout,
  theme,
  isAdmin = false,
}: LayoutRendererProps) {
  const template = JSON.parse(layout.template);

  // Apply theme CSS variables if provided
  const themeStyles = theme?.cssVars ? (
    <style dangerouslySetInnerHTML={{ __html: theme.cssVars }} />
  ) : null;

  // Map of component names to component functions
  const components = {
    'top-row': () => <sections.TopRow person={person} isAdmin={isAdmin} />,
    'info': () => <sections.PersonInfo person={person} isAdmin={isAdmin} />,
    'image': () => <sections.PersonImage person={person} />,
    'hero-image': () => <sections.HeroImage person={person} />,
    'story': () => <sections.Story person={person} />,
    'comments': () => <sections.Comments person={person} isAdmin={isAdmin} />,
    'basic-info': () => <sections.BasicInfo person={person} isAdmin={isAdmin} />,
    'sidebar-info': () => <sections.SidebarInfo person={person} />,
    'gallery-grid': () => <sections.GalleryGrid person={person} />,
    'featured-image': () => <sections.FeaturedImage person={person} />,
    'article-content': () => <sections.ArticleContent person={person} />,
    'sidebar': () => <sections.Sidebar person={person} isAdmin={isAdmin} />,
    'main-content': () => <sections.MainContent person={person} />,
  };

  // Render layout based on type
  const renderLayout = () => {
    switch (template.type) {
      case 'grid':
        // Sections that should always be full width
        const fullWidthSections = ['gallery-grid', 'story', 'comments', 'top-row'];

        // Separate sections into grid and full-width
        const gridSections = template.sections.filter((s: string) => !fullWidthSections.includes(s));
        const fullSections = template.sections.filter((s: string) => fullWidthSections.includes(s));

        const gridCols = template.columns === 3 ? 'md:grid-cols-3' :
                        template.columns === 4 ? 'md:grid-cols-4' :
                        'md:grid-cols-2';

        return (
          <div className="space-y-8">
            {/* Grid sections (image, info, etc.) */}
            {gridSections.length > 0 && (
              <div className={`grid gap-6 ${gridCols}`}>
                {gridSections.map((section: string) => {
                  const component = components[section as keyof typeof components]?.();
                  if (!component) return null;
                  return (
                    <div key={section} className="layout-section">
                      {component}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full width sections (gallery, story, comments) */}
            {fullSections.map((section: string) => {
              const component = components[section as keyof typeof components]?.();
              if (!component) return null;
              return (
                <div key={section} className="layout-section w-full">
                  {component}
                </div>
              );
            })}
          </div>
        );

      case 'custom-person':
        // Custom layout with top row containing image, info, and additional photos
        return (
          <div className="space-y-8">
            {/* Top row with image, info, and additional photos */}
            <div className="layout-section w-full">
              {components['top-row']()}
            </div>

            {/* Stories section - full width */}
            <div className="layout-section w-full">
              {components['story']()}
            </div>

            {/* Community support section - full width */}
            <div className="layout-section w-full">
              {components['comments']()}
            </div>
          </div>
        );

      case 'stack':
        return (
          <div className="space-y-6">
            {template.sections.map((section: string) => {
              const component = components[section as keyof typeof components]?.();
              if (!component) return null;
              return (
                <div key={section} className="layout-section">
                  {component}
                </div>
              );
            })}
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

  // Check if we should use non-template layout
  if (nonTemplateLayout) {
    return (
      <>
        {themeStyles}
        <div className="layout-container">
          <div className="space-y-8">
            {/* Top row - person photo and info */}
            <div className="layout-section w-full">
              <div className="grid gap-6 md:grid-cols-2">
                <div>{components['image']()}</div>
                <div>{components['info']()}</div>
              </div>
            </div>

            {/* Additional photos - smaller */}
            <div className="layout-section w-full">
              <div className="scale-75 origin-left">
                {components['gallery-grid']()}
              </div>
            </div>

            {/* Stories - one per row */}
            <div className="layout-section w-full">
              {components['story']()}
            </div>

            {/* Community support section */}
            <div className="layout-section w-full">
              {components['comments']()}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {themeStyles}
      <div className="layout-container">{renderLayout()}</div>
    </>
  );
}