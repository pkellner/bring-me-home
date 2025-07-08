'use client';

import { useOptimistic, useTransition, memo } from 'react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface CommentStatusToggleProps {
  commentId: string;
  initialIsApproved: boolean;
  canApprove: boolean;
  onError: (error: string) => void;
  onSuccess?: (commentId: string, newStatus: boolean) => void;
}

async function updateCommentStatus(commentId: string) {
  const response = await fetch(`/api/admin/comments/${commentId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to update comment approval');
  }

  return await response.json();
}

function CommentStatusToggle({
  commentId,
  initialIsApproved,
  canApprove,
  onError,
  onSuccess,
}: CommentStatusToggleProps) {
  const [optimisticIsApproved, setOptimisticIsApproved] = useOptimistic(
    initialIsApproved,
    (currentState, newState: boolean) => newState
  );
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    if (!canApprove) return;

    const newStatus = !optimisticIsApproved;

    // Start the async operation with optimistic update inside transition
    startTransition(async () => {
      // Optimistically update the UI inside transition
      setOptimisticIsApproved(newStatus);

      try {
        await updateCommentStatus(commentId);
        // Notify parent component of successful update
        onSuccess?.(commentId, newStatus);
      } catch (error) {
        // Revert the optimistic update on error
        setOptimisticIsApproved(initialIsApproved);
        onError(
          error instanceof Error
            ? error.message
            : 'Failed to update comment approval'
        );
      }
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={!canApprove || isPending}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
        optimisticIsApproved
          ? 'bg-green-100 text-green-800 hover:bg-green-200'
          : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
      } ${
        canApprove && !isPending
          ? 'cursor-pointer hover:shadow-sm'
          : 'cursor-not-allowed opacity-60'
      } ${isPending ? 'animate-pulse' : ''}`}
      title={
        canApprove
          ? `Click to ${optimisticIsApproved ? 'disapprove' : 'approve'} this comment`
          : 'You do not have permission to change comment status'
      }
    >
      {optimisticIsApproved ? (
        <>
          <CheckCircleIcon className="h-3 w-3 mr-1" />
          Approved
        </>
      ) : (
        <>
          <XCircleIcon className="h-3 w-3 mr-1" />
          Pending
        </>
      )}
    </button>
  );
}

export default memo(CommentStatusToggle);
