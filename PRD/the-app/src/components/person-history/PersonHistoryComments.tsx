'use client';

import { useState, useEffect } from 'react';
import { getCommentsByPersonHistoryId } from '@/app/actions/comments';
import { formatDistanceToNow } from 'date-fns';

interface PersonHistoryCommentsProps {
  personHistoryId: string;
  onCommentAdded?: () => void;
  refreshTrigger?: number;
}

interface Comment {
  id: string;
  firstName: string | null;
  lastName: string | null;
  content: string;
  showComment: boolean;
  displayNameOnly: boolean;
  showOccupation: boolean;
  showBirthdate: boolean;
  showCityState: boolean;
  occupation: string | null;
  birthdate: Date | null;
  city: string | null;
  state: string | null;
  createdAt: Date;
}

export default function PersonHistoryComments({
  personHistoryId,
  refreshTrigger = 0,
}: PersonHistoryCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllComments, setShowAllComments] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showButton, setShowButton] = useState(true);
  
  // Get initial show count from environment variable or default to 7
  const parsedCount = process.env.NEXT_PUBLIC_HISTORY_COMMENTS_INITIAL_SHOW_COUNT 
    ? parseInt(process.env.NEXT_PUBLIC_HISTORY_COMMENTS_INITIAL_SHOW_COUNT, 10) 
    : NaN;
  const initialShowCount = isNaN(parsedCount) ? 7 : parsedCount;

  useEffect(() => {
    const loadComments = async () => {
      setIsLoading(true);
      try {
        const fetchedComments = await getCommentsByPersonHistoryId(personHistoryId);
        setComments(fetchedComments);
      } catch (error) {
        console.error('Error loading comments:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadComments();
  }, [personHistoryId, refreshTrigger]);

  // Handle transition for show more animation
  useEffect(() => {
    if (showAllComments && showButton) {
      // Start the transition
      setIsTransitioning(true);
      
      // Fade out the button first
      const buttonTimer = setTimeout(() => {
        setShowButton(false);
      }, 300);

      // Clean up the transitioning state after animations complete
      const transitionTimer = setTimeout(() => {
        setIsTransitioning(false);
      }, 1000);

      return () => {
        clearTimeout(buttonTimer);
        clearTimeout(transitionTimer);
      };
    }
  }, [showAllComments, showButton]);


  const formatCommenterInfo = (comment: Comment) => {
    const parts = [];
    
    if (!comment.displayNameOnly) {
      if (comment.showOccupation && comment.occupation) {
        parts.push(comment.occupation);
      }
      if (comment.showBirthdate && comment.birthdate) {
        const age = Math.floor((Date.now() - new Date(comment.birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        parts.push(`Age ${age}`);
      }
      if (comment.showCityState && (comment.city || comment.state)) {
        const location = [comment.city, comment.state].filter(Boolean).join(', ');
        if (location) parts.push(location);
      }
    }
    
    return parts.length > 0 ? ` (${parts.join(', ')})` : '';
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-sm text-gray-500">Loading comments...</div>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="p-6">
        <div className="text-sm text-gray-500">No comments yet. Be the first to comment!</div>
      </div>
    );
  }

  // Determine which comments to show
  const commentsToShow = showAllComments ? comments : comments.slice(0, initialShowCount);
  const hasMoreComments = comments.length > initialShowCount;
  const hiddenCommentsCount = comments.length - initialShowCount;

  return (
    <div className="p-6">
      <div className="space-y-4">
        {commentsToShow.map((comment, index) => (
          <div 
            key={comment.id} 
            className={`bg-white rounded-md p-4 shadow-sm transition-all duration-700 ease-out ${
              showAllComments && index >= initialShowCount 
                ? 'opacity-0 translate-y-4' 
                : 'opacity-100 translate-y-0'
            }`}
            style={{
              ...(showAllComments && index >= initialShowCount && {
                animation: `fadeInUp 0.7s ease-out ${(index - initialShowCount) * 100 + 400}ms forwards`
              })
            }}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="font-medium text-gray-900">
                {comment.firstName || 'Anonymous'} {comment.lastName || ''}
                <span className="text-sm text-gray-500">
                  {formatCommenterInfo(comment)}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </div>
            </div>
            <div className="text-gray-700">
              {comment.showComment ? comment.content : (
                <span className="italic text-gray-500">Showing support</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Show More Button */}
      {hasMoreComments && showButton && (
        <div className={`text-center pt-4 transition-all duration-300 ease-out ${
          isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}>
          <button
            onClick={() => setShowAllComments(true)}
            className="inline-flex items-center px-4 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
          >
            Show {hiddenCommentsCount} more comment{hiddenCommentsCount !== 1 ? 's' : ''}
            <svg className="ml-2 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}

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