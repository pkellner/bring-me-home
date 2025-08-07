'use client';

import { useState, useEffect } from 'react';
import { SanitizedPersonHistory } from '@/types/sanitized';
import { format } from 'date-fns';
import PersonHistoryComments from './PersonHistoryComments';
import PersonHistoryCommentForm from './PersonHistoryCommentForm';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { getAllCommentsByPersonHistoryId } from '@/app/actions/comments';

interface PersonHistoryItemProps {
  historyItem: SanitizedPersonHistory;
  personId: string;
  personName: string;
  commentCount: number;
  isLoadingComments: boolean;
  showAnimation?: boolean;
  animationDelay?: string;
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  townSlug?: string;
  personSlug?: string;
  shouldTriggerAddComment?: boolean;
  magicToken?: string | null;
}

export default function PersonHistoryItem({
  historyItem,
  personId,
  personName: _personName, // eslint-disable-line @typescript-eslint/no-unused-vars
  commentCount,
  isLoadingComments,
  showAnimation = false,
  animationDelay = '0ms',
  isExpanded = false,
  onExpandedChange,
  townSlug,
  personSlug,
  shouldTriggerAddComment = false,
  magicToken = null,
}: PersonHistoryItemProps) {
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState(commentCount);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [unapprovedCount, setUnapprovedCount] = useState(0);
  const { data: session } = useSession();

  // Check if user has permission to moderate comments
  const canModerateComments = session?.user?.roles?.some(
    role => ['site-admin', 'town-admin', 'person-admin'].includes(role.name)
  ) || false;

  // Update local count when prop changes
  useEffect(() => {
    setLocalCommentCount(commentCount);
  }, [commentCount]);

  // Auto-trigger comment form when URL parameters indicate it
  useEffect(() => {
    if (shouldTriggerAddComment && isExpanded) {
      setShowCommentForm(true);
    }
  }, [shouldTriggerAddComment, isExpanded]);

  // Load unapproved comment count if user can moderate
  useEffect(() => {
    if (canModerateComments && townSlug && personSlug) {
      const loadUnapprovedCount = async () => {
        try {
          const comments = await getAllCommentsByPersonHistoryId(historyItem.id);
          const unapproved = comments.filter(c => !c.isApproved).length;
          setUnapprovedCount(unapproved);
        } catch (error) {
          console.error('Error loading unapproved comment count:', error);
        }
      };
      loadUnapprovedCount();
    }
  }, [canModerateComments, historyItem.id, refreshTrigger, townSlug, personSlug]);

  const handleCommentAdded = () => {
    // Don't increment the count since new comments are unapproved
    // The count should only show approved comments
    setShowCommentForm(false);
    setRefreshTrigger(prev => prev + 1);
    // For admins, refresh the unapproved count
    if (canModerateComments) {
      setUnapprovedCount(prev => prev + 1);
    }
  };

  return (
    <div
      id={`update-${historyItem.id}`}
      className={`transition-all duration-700 ease-out ${
        showAnimation 
          ? 'opacity-0 translate-y-4' 
          : 'opacity-100 translate-y-0'
      }`}
      style={{
        ...(showAnimation && {
          animation: `fadeInUp 0.7s ease-out ${animationDelay} forwards`
        })
      }}
    >
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
        <div className="p-8">
          {/* Update header */}
          <div className="mb-6">
            <div className="flex justify-between items-start mb-4">
              <div className="text-sm font-medium text-gray-600">
                {format(new Date(historyItem.createdAt), 'MMMM d, yyyy \'at\' h:mm a')}
              </div>
              <div className="text-xs text-gray-500">
                {canModerateComments && unapprovedCount > 0 && townSlug && personSlug ? (
                  <Link
                    href={`/admin/comments/${townSlug}/${personSlug}#${historyItem.id}`}
                    className="text-red-600 hover:text-red-700 font-medium"
                  >
                    {unapprovedCount} comment{unapprovedCount !== 1 ? 's' : ''} unapproved
                  </Link>
                ) : (
                  <>Posted by {historyItem.createdByUsername}</>
                )}
              </div>
            </div>
            
            {/* Update title */}
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {historyItem.title}
              {!historyItem.visible && (
                <span className="ml-2 text-base font-extrabold text-red-600">
                  (Not Visible to Public)
                </span>
              )}
            </h3>
          </div>

          {/* Update description - Full content */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 mb-6 border border-gray-200">
            <div
              className="text-gray-800 leading-relaxed prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline prose-ul:list-disc prose-ol:list-decimal"
              dangerouslySetInnerHTML={{ __html: historyItem.description }}
            />
          </div>

          {/* Comment stats bar */}
          <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
            <button
              onClick={() => {
                if (onExpandedChange && localCommentCount > 0) {
                  onExpandedChange(!isExpanded);
                }
              }}
              disabled={isLoadingComments || localCommentCount === 0}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                localCommentCount > 0 
                  ? 'text-gray-700 hover:text-indigo-600 cursor-pointer' 
                  : 'text-gray-400 cursor-default'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              {isLoadingComments ? (
                <span className="text-gray-400">Loading...</span>
              ) : (
                <span>{localCommentCount} {localCommentCount === 1 ? 'comment' : 'comments'}</span>
              )}
              {localCommentCount > 0 && (
                <svg
                  className={`w-4 h-4 ml-1 transition-transform duration-300 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            <button
              onClick={() => {
                setShowCommentForm(!showCommentForm);
                // Expand the section when adding a comment
                if (!showCommentForm && onExpandedChange) {
                  onExpandedChange(true);
                }
              }}
              className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add comment
            </button>
          </div>
        </div>

        {/* Comments section (expanded) */}
        {isExpanded && (
          <div className="border-t border-gray-200 bg-gray-50">
            <div className="p-6">
              {/* Show comment form if active */}
              {showCommentForm && (
                <div className="mb-6" id={`comment-form-${historyItem.id}`}>
                  <PersonHistoryCommentForm
                    personId={personId}
                    updateTitle={historyItem.title}
                    onSuccess={handleCommentAdded}
                    onCancel={() => setShowCommentForm(false)}
                    magicToken={magicToken}
                  />
                </div>
              )}

              {/* Show existing comments */}
              <PersonHistoryComments
                personHistoryId={historyItem.id}
                refreshTrigger={refreshTrigger}
              />
            </div>
          </div>
        )}
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(1rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}