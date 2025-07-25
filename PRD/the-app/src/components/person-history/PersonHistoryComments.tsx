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

  return (
    <div className="p-6 space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="bg-white rounded-md p-4 shadow-sm">
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
  );
}