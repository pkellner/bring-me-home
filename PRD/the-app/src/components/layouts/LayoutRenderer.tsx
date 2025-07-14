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
  images?: Array<{
    id: string;
    imageType?: string | null;
    sequenceNumber: number;
    caption?: string | null;
    updatedAt: Date | string;
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
    'photo-gallery': () => <sections.PhotoGallery person={person} />,
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

            {/* Photo Gallery section - full width */}
            <div className="layout-section w-full">
              {components['photo-gallery']()}
            </div>

            {/* Stories section - full width */}
            <div className="layout-section w-full">
              <sections.StoryWithLanguageToggle person={person} />
            </div>

            {/* Community support section - full width */}
            {person.showCommunitySupport && (
              <div className="layout-section w-full">
                {components['comments']()}
              </div>
            )}
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
        <div className="layout-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-16">
            {/* Hero Section - Featured person photo and essential info */}
            <div className="layout-section w-full">
              <div className="grid gap-8 lg:gap-12 lg:grid-cols-[auto_1fr] items-start">
                {/* Main person photo - smaller and well-proportioned */}
                <div className="relative group">
                  <div className="w-64 max-h-96 overflow-hidden rounded-2xl shadow-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center [&_img]:!w-auto [&_img]:!h-auto [&_img]:!max-w-full [&_img]:!max-h-96 [&_img]:!object-contain [&>.image-section]:flex [&>.image-section]:items-center [&>.image-section]:justify-center [&>.image-section>div]:contents">
                    {components['image']()}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"></div>
                </div>

                {/* Person info with better typography */}
                <div className="space-y-6">
                  <div className="prose prose-lg max-w-none">
                    {components['info']()}
                  </div>
                </div>
              </div>
            </div>



            {/* Stories Section - with integrated language toggle */}
            <div className="layout-section w-full">
              <sections.StoryWithLanguageToggle person={person} />
            </div>

            {/* Photo Gallery - elegant grid layout */}
            <div className="layout-section w-full">
              <div className="space-y-6">
                <h2 className="text-2xl font-light tracking-wide text-gray-800 border-b border-gray-200 pb-3">
                  Photo Gallery
                </h2>
                <div className="[&>.gallery-section]:mt-0">
                  {components['gallery-grid']()}
                </div>
              </div>
            </div>

            {/* Community Support - modern comment section */}
            {person.showCommunitySupport && (
              <div className="layout-section w-full">
                <div className="space-y-6">
                  <h2 className="text-2xl font-light tracking-wide text-gray-800 border-b border-gray-200 pb-3">
                    Community Support
                  </h2>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8">
                    {components['comments']()}
                  </div>
                </div>
              </div>
            )}
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