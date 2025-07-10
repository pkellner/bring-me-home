'use client';

import { useState, useTransition } from 'react';
import { toggleCommentStatus } from '@/app/actions/comments';

interface CommentStatusToggleProps {
  commentId: string;
  initialIsApproved: boolean;
  onUpdate?: (commentId: string, isApproved: boolean) => void;
}

export default function CommentStatusToggle({
  commentId,
  initialIsApproved,
  onUpdate,
}: CommentStatusToggleProps) {
  const [isApproved, setIsApproved] = useState(initialIsApproved);
  const [isPending, startTransition] = useTransition();

  const handleToggle = async () => {
    const newStatus = !isApproved;

    // Optimistic update
    setIsApproved(newStatus);
    if (onUpdate) {
      onUpdate(commentId, newStatus);
    }

    startTransition(async () => {
      try {
        const result = await toggleCommentStatus(commentId, newStatus);
        if (!result.success) {
          // Rollback on failure
          setIsApproved(!newStatus);
          if (onUpdate) {
            onUpdate(commentId, !newStatus);
          }
        }
      } catch {
        // Rollback on error
        setIsApproved(!newStatus);
        if (onUpdate) {
          onUpdate(commentId, !newStatus);
        }
      }
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`inline-flex items-center justify-center w-20 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        isApproved
          ? 'bg-green-100 text-green-800 hover:bg-green-200'
          : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
      } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isApproved ? 'Approved' : 'Pending'}
    </button>
  );
}
