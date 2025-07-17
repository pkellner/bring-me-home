'use client';

import { useActionState, useEffect, useState } from 'react';
import { submitComment } from '@/app/actions/comments';
import SupportSection from './SupportSection';
import { usePathname } from 'next/navigation';
import { getCookie, deleteCookie } from '@/lib/cookies';

interface Comment {
  id: string;
  content: string;
  firstName?: string | null;
  lastName?: string | null;
  occupation?: string | null;
  birthdate?: Date | string | null;
  city?: string | null;
  state?: string | null;
  showOccupation?: boolean;
  showBirthdate?: boolean;
  showComment?: boolean;
  showCityState?: boolean;
  displayNameOnly?: boolean;
  createdAt: Date | string;
  isApproved: boolean;
}

interface CommentSectionProps {
  personId: string;
  comments: Comment[];
}

interface CommentFormState {
  success?: boolean;
  error?: string;
  errors?: Record<string, string[]>;
}

interface Stats {
  anonymousSupport: {
    total: number;
    last24Hours: number;
  };
  messages: {
    total: number;
    last24Hours: number;
  };
}

export default function CommentSection({
  personId,
  comments,
}: CommentSectionProps) {
  const [state, formAction, isPending] = useActionState<
    CommentFormState,
    FormData
  >(submitComment, { success: false });
  
  const [stats, setStats] = useState<Stats | null>(null);
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') || false;
  
  // Debug logging
  console.log('CommentSection Debug:', {
    pathname,
    isAdmin,
    personId,
    cookieValue: getCookie(`quick_supported_${personId}`)
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/persons/${personId}/support`);
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching support stats:', error);
      }
    };

    fetchStats();
    
    // Listen for support added events
    const handleSupportAdded = () => {
      fetchStats();
    };
    window.addEventListener('supportAdded', handleSupportAdded);
    
    return () => {
      window.removeEventListener('supportAdded', handleSupportAdded);
    };
  }, [personId]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDisplayName = (comment: Comment) => {
    if (!comment.firstName || !comment.lastName) {
      return 'Anonymous Supporter';
    }

    if (comment.displayNameOnly) {
      return `${comment.firstName} ${comment.lastName.charAt(0)}.`;
    }

    return `${comment.firstName} ${comment.lastName}`;
  };

  const calculateAge = (birthdate: Date | string | null | undefined) => {
    if (!birthdate) return null;
    const birth = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  };

  // Filter to only show approved comments
  const approvedComments = comments.filter(comment => comment.isApproved);

  return (
    <div id="comments" className="bg-white shadow rounded-lg scroll-mt-20">
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Community Support
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Messages of support from the community
          </p>
        </div>

        {/* Support Section - Shows both anonymous and named options */}
        <SupportSection
          personId={personId}
          onSubmit={formAction}
          isPending={isPending}
          state={state}
          stats={stats || undefined}
        />
        
        {/* DEBUG PANEL - Only shows when cookie is set */}
        {getCookie(`quick_supported_${personId}`) && (
          <>
            <button
              onClick={async () => {
                // Delete the database record
                try {
                  await fetch(`/api/persons/${personId}/support`, {
                    method: 'DELETE',
                  });
                } catch (error) {
                  console.error('Error deleting support record:', error);
                }
                
                // Clear the cookie
                deleteCookie(`quick_supported_${personId}`);
                
                // Reload to refresh the UI
                window.location.reload();
              }}
              className="mt-4 w-full bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 transition-colors"
            >
              Admin Only - Clear Anonymous Support Cookie & Database Record
            </button>
            {!isAdmin && (
              <p className="mt-1 text-xs text-gray-500">Note: This button is normally only shown for admins</p>
            )}
          </>
        )}

        {/* Comments List */}
        <div className="space-y-6">
          {approvedComments.length > 0 ? (
            approvedComments.map(comment => (
              <div
                key={comment.id}
                className="border-l-4 border-blue-400 pl-4 py-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div>
                      <div className="flex items-center flex-wrap gap-x-2">
                        <p className="text-sm font-medium text-gray-900">
                          {getDisplayName(comment)}
                        </p>
                        {comment.showOccupation && comment.occupation && (
                          <>
                            <span className="text-gray-400">•</span>
                            <p className="text-sm text-gray-600">
                              {comment.occupation}
                            </p>
                          </>
                        )}
                        {comment.showBirthdate && comment.birthdate && (
                          <>
                            <span className="text-gray-400">•</span>
                            <p className="text-sm text-gray-600">
                              Age {calculateAge(comment.birthdate)}
                            </p>
                          </>
                        )}
                        {comment.showCityState &&
                          comment.city &&
                          comment.state && (
                            <>
                              <span className="text-gray-400">•</span>
                              <p className="text-sm text-gray-600">
                                {comment.city}, {comment.state}
                              </p>
                            </>
                          )}
                        <span className="text-gray-400">•</span>
                        <p className="text-sm text-gray-500">
                          {formatDate(new Date(comment.createdAt))}
                        </p>
                      </div>
                    </div>
                    {comment.content && !comment.displayNameOnly && (comment.showComment ?? true) && (
                      <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                        {comment.content}
                      </div>
                    )}
                    {(comment.displayNameOnly || (comment.content && !(comment.showComment ?? true))) && (
                      <div className="mt-1 text-sm text-gray-500 italic">
                        Showing support
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No support messages yet
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Be the first to show your support for this person.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
