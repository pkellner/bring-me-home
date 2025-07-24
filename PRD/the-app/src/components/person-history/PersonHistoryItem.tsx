'use client';

import { useState } from 'react';
import { SanitizedPersonHistory } from '@/types/sanitized';
import { format } from 'date-fns';
import { formatDateForDisplay } from '@/lib/date-utils';
import PersonHistoryComments from './PersonHistoryComments';
import PersonHistoryCommentForm from './PersonHistoryCommentForm';

interface PersonHistoryItemProps {
  historyItem: SanitizedPersonHistory;
  personId: string;
  personName: string;
  commentCount: number;
  isLoadingComments: boolean;
  showAnimation?: boolean;
  animationDelay?: string;
}

export default function PersonHistoryItem({
  historyItem,
  personId,
  commentCount,
  isLoadingComments,
  showAnimation = false,
  animationDelay = '0ms',
}: PersonHistoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState(commentCount);

  // Update local count when prop changes
  useState(() => {
    setLocalCommentCount(commentCount);
  });

  const handleCommentAdded = () => {
    setLocalCommentCount(prev => prev + 1);
    setShowCommentForm(false);
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
              Posted by {historyItem.createdByUsername}
            </div>
          </div>
          <div className="text-gray-800 leading-relaxed whitespace-pre-wrap mb-4">
            {historyItem.description}
          </div>

          {/* Comment actions */}
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-gray-600 hover:text-indigo-600 transition-colors"
              disabled={isLoadingComments}
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
            </button>

            <button
              onClick={() => setShowCommentForm(!showCommentForm)}
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
        {(isExpanded || showCommentForm) && (
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
              <PersonHistoryComments
                personHistoryId={historyItem.id}
                onCommentAdded={() => setLocalCommentCount(prev => prev + 1)}
              />
            )}
          </div>
        )}
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