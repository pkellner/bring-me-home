'use client';

import { useActionState } from 'react';
import { submitComment } from '@/app/actions/comments';
import AnonymousCommentForm from './AnonymousCommentForm';

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

export default function CommentSection({
  personId,
  comments,
}: CommentSectionProps) {
  const [state, formAction, isPending] = useActionState<
    CommentFormState,
    FormData
  >(submitComment, { success: false });

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
            Community Support ({approvedComments.length})
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Messages of support from the community
          </p>
        </div>

        {/* Anonymous Comment Form - Always visible */}
        <AnonymousCommentForm
          personId={personId}
          onSubmit={formAction}
          isPending={isPending}
          state={state}
        />

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
                    {comment.content && !comment.displayNameOnly && (
                      <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                        {comment.content}
                      </div>
                    )}
                    {comment.displayNameOnly && (
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
