'use client';

import { useState, useEffect } from 'react';
import * as sections from './sections';
import type { SanitizedTown, SanitizedComment, SanitizedDetentionCenter, SanitizedPersonHistory } from '@/types/sanitized';
import { format } from 'date-fns';

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
  personHistory?: SanitizedPersonHistory[];
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
  isPersonAdmin?: boolean;
  isTownAdmin?: boolean;
  supportMapMetadata?: {
    hasIpAddresses: boolean;
    messageLocationCount: number;
    supportLocationCount: number;
  };
}

const nonTemplateLayout = true;

export default function LayoutRenderer({
  person,
  layout,
  theme,
  isAdmin = false,
  isSiteAdmin = false,
  isPersonAdmin = false,
  isTownAdmin = false,
  supportMapMetadata,
}: LayoutRendererProps) {
  const template = JSON.parse(layout.template);
  
  // State for support stats and comment counts
  const [supportStats, setSupportStats] = useState<{ anonymousSupport: { total: number }, messages: { total: number } } | null>(null);
  const [historyCommentCounts, setHistoryCommentCounts] = useState<Map<string, number>>(new Map());

  // Fetch support stats
  useEffect(() => {
    const fetchSupportStats = async () => {
      try {
        const response = await fetch(`/api/persons/${person.id}/support`);
        if (response.ok) {
          const data = await response.json();
          setSupportStats(data);
        }
      } catch (error) {
        console.error('Error fetching support stats:', error);
      }
    };

    fetchSupportStats();
  }, [person.id]);

  // Fetch comment counts for history items
  useEffect(() => {
    const fetchCommentCounts = async () => {
      if (!person.personHistory || person.personHistory.length === 0) return;
      
      try {
        const { getCommentCountsByPersonHistoryIds } = await import('@/app/actions/comments');
        const historyIds = person.personHistory.map(h => h.id);
        const counts = await getCommentCountsByPersonHistoryIds(historyIds);
        setHistoryCommentCounts(counts);
      } catch (error) {
        console.error('Error fetching comment counts:', error);
      }
    };

    fetchCommentCounts();
  }, [person.personHistory]);

  // Check for recent history notes (within 24 hours)
  const getRecentHistoryNote = () => {
    if (!person.personHistory || person.personHistory.length === 0) return null;
    
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    // Sort by date descending and find the most recent note within 24 hours
    const recentNotes = person.personHistory
      .filter(note => note.visible && new Date(note.date) > twentyFourHoursAgo)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return recentNotes.length > 0 ? recentNotes[0] : null;
  };

  const recentNote = getRecentHistoryNote();

  // Function to truncate text with ellipsis
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

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
    'comments': () => <sections.Comments person={person} isAdmin={isAdmin} isSiteAdmin={isSiteAdmin} supportMapMetadata={supportMapMetadata} />,
    'basic-info': () => <sections.BasicInfo person={person} isAdmin={isAdmin} />,
    'sidebar-info': () => <sections.SidebarInfo person={person} />,
    'gallery-grid': () => <sections.GalleryGrid person={person} />,
    'photo-gallery': () => <sections.PhotoGallery person={person} />,
    'featured-image': () => <sections.FeaturedImage person={person} />,
    'article-content': () => <sections.ArticleContent person={person} />,
    'sidebar': () => <sections.Sidebar person={person} isAdmin={isAdmin} />,
    'main-content': () => <sections.MainContent person={person} />,
    'history': () => <sections.History person={person} isPersonAdmin={isPersonAdmin} isTownAdmin={isTownAdmin} isSiteAdmin={isSiteAdmin} />,
  };

  // Render layout based on type
  const renderLayout = () => {
    switch (template.type) {
      case 'grid':
        // Sections that should always be full width
        const fullWidthSections = ['gallery-grid', 'story', 'history', 'comments', 'top-row'];

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

            {/* History section - full width */}
            <div className="layout-section w-full" id="history-section">
              {components['history']()}
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
                            {supportStats && (supportStats.anonymousSupport.total + supportStats.messages.total) > 0 && (
                              <span className="block text-right text-indigo-700 font-medium">
                                {supportStats.anonymousSupport.total + supportStats.messages.total} {(supportStats.anonymousSupport.total + supportStats.messages.total) === 1 ? 'Person' : 'People'} Supporting
                              </span>
                            )}
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
                  
                  {/* Recent Updates Notification */}
                  {recentNote && (
                    <div className="mt-4 w-full">
                      <button
                        onClick={() => {
                          const element = document.getElementById('history-section');
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }}
                        className="w-full group relative overflow-hidden rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 text-left transition-all duration-300 hover:shadow-md hover:border-amber-300"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0 pr-4">
                            <h4 className="text-base font-semibold text-gray-900 mb-1">
                              Recent Update
                            </h4>
                            <p className="text-sm text-gray-700 truncate md:whitespace-normal md:line-clamp-2">
                              &ldquo;{truncateText(recentNote.description, 80)}&rdquo;
                            </p>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-xs text-gray-500">
                                {format(new Date(recentNote.date), 'MMM d, yyyy • h:mm a')}
                              </p>
                              {historyCommentCounts.get(recentNote.id) !== undefined && historyCommentCounts.get(recentNote.id)! > 0 && (
                                <p className="text-xs text-gray-600 font-medium">
                                  {historyCommentCounts.get(recentNote.id)} comment{historyCommentCounts.get(recentNote.id) !== 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0 ml-4">
                            <div className="flex items-center gap-2 text-amber-600">
                              <span className="text-sm font-medium whitespace-nowrap">See recent updates</span>
                              <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>



            {/* Stories Section - with integrated language toggle */}
            <div className="layout-section w-full">
              <sections.StoryWithLanguageToggle person={person} />
            </div>

            {/* History section - full width */}
            <div className="layout-section w-full" id="history-section">
              {components['history']()}
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