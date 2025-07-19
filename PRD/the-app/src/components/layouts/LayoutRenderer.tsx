'use client';

import * as sections from './sections';
import type { SanitizedTown, SanitizedComment, SanitizedDetentionCenter } from '@/types/sanitized';

// Extended types for LayoutRenderer specific needs
type SerializedComment = SanitizedComment & {
  createdAt: string;
  updatedAt: string;
  birthdate?: string | null;
  approvedAt?: string | null;
};

type SerializedDetentionCenter = SanitizedDetentionCenter & {
  thumbnailImageId?: string | null;
  imageId?: string | null; // Deprecated field for backward compatibility
  detentionCenterImage?: {
    id: string;
    detentionCenterId: string;
    imageId: string;
    createdAt: string;
    updatedAt: string;
    image?: {
      id: string;
      data: string;
      metadata: Record<string, unknown>;
      storageType: string;
      createdAt: string;
      updatedAt: string;
    };
  } | null;
  createdAt: string;
  updatedAt: string;
};

// Person type for public layout rendering - no Prisma imports!
export type SerializedPerson = {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  alienIdNumber: string | null;
  ssn: string | null;
  dateOfBirth: Date | string | null;
  placeOfBirth: string | null;
  height: string | null;
  weight: string | null;
  eyeColor: string | null;
  hairColor: string | null;
  lastKnownAddress: string;
  currentAddress: string | null;
  phoneNumber: string | null;
  emailAddress: string | null;
  story: string | null;
  lastSeenDate: Date | string | null;
  lastSeenLocation: string | null;
  isActive: boolean;
  isFound: boolean;
  status: string;
  layoutId: string | null;
  themeId: string | null;
  townId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  bondAmount: string | null;
  bondStatus: string | null;
  caseNumber: string | null;
  countryOfOrigin: string | null;
  courtLocation: string | null;
  detentionCenterId: string | null;
  detentionDate: Date | string | null;
  detentionStatus: string | null;
  internationalAddress: string | null;
  legalRepEmail: string | null;
  legalRepFirm: string | null;
  legalRepName: string | null;
  legalRepPhone: string | null;
  nextCourtDate: Date | string | null;
  releaseDate: Date | string | null;
  detentionStory: string | null;
  familyMessage: string | null;
  lastHeardFromDate: Date | string | null;
  notesFromLastContact: string | null;
  representedByLawyer: boolean;
  representedByNotes: string | null;
  slug: string;
  showDetentionInfo: boolean;
  showLastHeardFrom: boolean;
  showDetentionDate: boolean;
  showCommunitySupport: boolean;
  // Relations
  town: SanitizedTown & {
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
    imageUrl?: string;
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
  isSiteAdmin?: boolean;
}

const nonTemplateLayout = true;

export default function LayoutRenderer({
  person,
  layout,
  theme,
  isAdmin = false,
  isSiteAdmin = false,
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
    'comments': () => <sections.Comments person={person} isAdmin={isAdmin} isSiteAdmin={isSiteAdmin} />,
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
                  
                  {/* Call to Action - Send a Support Note */}
                  <div className="mt-6 w-full">
                    <button
                      onClick={() => {
                        const element = document.getElementById('comments');
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                      className="w-full group relative overflow-hidden rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 p-4 text-left transition-all duration-300 hover:shadow-md hover:border-indigo-300"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-base font-semibold text-gray-900">
                            Send a note of support to {person.firstName}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Your message can make a difference • Post anonymously or with your name
                          </p>
                        </div>
                        <div className="flex-shrink-0 ml-4">
                          <div className="flex items-center gap-2 text-indigo-600">
                            <span className="text-sm font-medium">Write a message</span>
                            <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </button>
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