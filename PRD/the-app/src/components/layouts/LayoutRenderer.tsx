'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
    theme?: { id: string; name: string; cssVars: string | null } | null;
  };
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
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function LayoutRenderer({
  person,
  theme,
  isAdmin = false,
  isSiteAdmin = false,
  isPersonAdmin = false,
  isTownAdmin = false,
  supportMapMetadata,
  searchParams,
}: LayoutRendererProps) {
  const router = useRouter();
  
  // Check for update parameter to scroll to specific update
  const targetUpdateId = searchParams?.update ? String(searchParams.update) : null;
  const shouldAddComment = searchParams?.addComment === 'true';
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
  
  // Handle scrolling to specific update and comment section
  useEffect(() => {
    if (targetUpdateId) {
      // First scroll to the specific update
      setTimeout(() => {
        const updateElement = document.getElementById(`update-${targetUpdateId}`);
        if (updateElement) {
          updateElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Highlight the update briefly
          updateElement.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
          setTimeout(() => {
            updateElement.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
          }, 3000);
        }
        
        // If we should also show the comment form, scroll to it after a delay
        // BUT only if we're not already scrolling to a specific update
        if (shouldAddComment && !targetUpdateId) {
          setTimeout(() => {
            const commentsElement = document.getElementById('comments');
            if (commentsElement) {
              commentsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 1000);
        }
      }, 500);
    }
  }, [targetUpdateId, shouldAddComment]);

  // Check if history section will be shown (either has history or user can manage)
  const hasHistory = person.personHistory && person.personHistory.length > 0;
  const canManageHistory = isPersonAdmin || isTownAdmin || isSiteAdmin;
  const willShowHistorySection = hasHistory || canManageHistory;

  const getRecentHistoryNote = () => {
    if (!person.personHistory || person.personHistory.length === 0) return null;

    // For admins, show all notes; for others, only visible ones
    const notesToConsider = canManageHistory 
      ? person.personHistory 
      : person.personHistory.filter(note => note.visible);

    // Sort by date descending and get the most recent
    const recentNotes = notesToConsider
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return recentNotes.length > 0 ? recentNotes[0] : null;
  };

  const recentNote = getRecentHistoryNote();



  // Apply theme CSS variables if provided
  const themeStyles = theme?.cssVars ? (
    <style dangerouslySetInnerHTML={{ __html: theme.cssVars }} />
  ) : null;

  // Map of component names to component functions
  const components = {
    'image': () => <sections.PersonImage person={person} />,
    'info': () => <sections.PersonInfo person={person} isAdmin={isAdmin} />,
    'comments': () => <sections.Comments person={person} isAdmin={isAdmin} isSiteAdmin={isSiteAdmin} supportMapMetadata={supportMapMetadata} searchParams={searchParams} />,
    'gallery-grid': () => <sections.GalleryGrid person={person} />,
    'history': () => <sections.History person={person} isPersonAdmin={isPersonAdmin} isTownAdmin={isTownAdmin} isSiteAdmin={isSiteAdmin} searchParams={searchParams} />,
  };

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

                {/* Recent Updates Notification - Show when history section is visible */}
                {recentNote && willShowHistorySection && (
                  <div className="mt-4 w-full">
                    <button
                      onClick={() => {
                        // Navigate to the history section with the update expanded and comment form open
                        const currentUrl = new URL(window.location.href);
                        currentUrl.searchParams.set('update', recentNote.id);
                        currentUrl.searchParams.set('addComment', 'true');
                        
                        // Use router.push to navigate without full page reload
                        router.push(currentUrl.pathname + currentUrl.search);
                        
                        // Scroll to the specific update after a short delay
                        setTimeout(() => {
                          const element = document.getElementById(`history-item-${recentNote.id}`);
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }, 100);
                      }}
                      className="w-full group relative overflow-hidden rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 text-left transition-all duration-300 hover:shadow-md hover:border-amber-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-4">
                          <h4 className="text-base font-semibold text-gray-900 mb-1">
                            Recent Update{!recentNote.visible && canManageHistory && ' (Not Visible)'}
                          </h4>
                          <p className="text-sm text-gray-700 truncate md:whitespace-normal md:line-clamp-2">
                            &ldquo;{recentNote.title}&rdquo;
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
                            <span className="text-sm font-medium">Write a comment about update</span>
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