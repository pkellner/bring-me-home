'use client';

import { useState, useEffect } from 'react';
import { SanitizedPersonHistory } from '@/types/sanitized';
import { format } from 'date-fns';
import { formatDateForDisplay } from '@/lib/date-utils';
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
}

export default function PersonHistoryItem({
  historyItem,
  personId,
  commentCount,
  isLoadingComments,
  showAnimation = false,
  animationDelay = '0ms',
  isExpanded = false,
  onExpandedChange,
  townSlug,
  personSlug,
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
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {/* Main update content */}
        <div className="p-6">
          <div className="flex justify-between items-start mb-3">
            <div className="text-sm font-medium text-gray-700">
              {format(formatDateForDisplay(historyItem.date), 'MMMM d, yyyy')}
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
          <div className="text-gray-800 leading-relaxed whitespace-pre-wrap mb-4">
            {historyItem.description}
          </div>

          {/* Comment actions */}
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => {
                if (onExpandedChange && localCommentCount > 0) {
                  onExpandedChange(!isExpanded);
                }
              }}
              disabled={isLoadingComments || localCommentCount === 0}
              className={`flex items-center gap-1 transition-colors ${
                localCommentCount > 0 
                  ? 'text-gray-600 hover:text-indigo-600 cursor-pointer' 
                  : 'text-gray-400 cursor-default'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className={`w-3 h-3 ml-1 transition-transform duration-300 ${
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
              className="flex items-center gap-1 text-gray-600 hover:text-indigo-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add comment
            </button>
          </div>
        </div>

        {/* Expandable comment section */}
        <div 
          className="overflow-hidden transition-all duration-500 ease-in-out"
          style={{
            maxHeight: (isExpanded || showCommentForm) ? '2000px' : '0px',
            opacity: (isExpanded || showCommentForm) ? 1 : 0,
            transform: (isExpanded || showCommentForm) ? 'translateY(0)' : 'translateY(-10px)',
          }}
        >
          <div className="border-t border-gray-200 bg-gray-50">
            {showCommentForm && (
              <div className="p-6 border-b border-gray-200 bg-white">
                <PersonHistoryCommentForm
                  personId={personId}
                  personHistoryId={historyItem.id}
                  updateDescription={historyItem.description}
                  onSuccess={handleCommentAdded}
                  onCancel={() => setShowCommentForm(false)}
                />
              </div>
            )}

            {isExpanded && (
              <div className="relative">
                <PersonHistoryComments
                  personHistoryId={historyItem.id}
                  onCommentAdded={() => {
                    // Don't update count for new comments since they're unapproved
                    setRefreshTrigger(prev => prev + 1);
                  }}
                  refreshTrigger={refreshTrigger}
                />
                <button
                  onClick={() => {
                    if (onExpandedChange) {
                      onExpandedChange(false);
                    }
                  }}
                  className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                  title="Collapse comments"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
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