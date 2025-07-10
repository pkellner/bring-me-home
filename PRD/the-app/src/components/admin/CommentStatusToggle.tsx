'use client';

import { useState, useTransition } from 'react';
import { Switch } from '@headlessui/react';

interface CommentStatusToggleProps {
  commentId: string;
  initialIsApproved: boolean;
  onUpdate: (commentId: string, isApproved: boolean) => void;
}

export default function CommentStatusToggle({
  commentId,
  initialIsApproved,
  onUpdate,
}: CommentStatusToggleProps) {
  const [isApproved, setIsApproved] = useState(initialIsApproved);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const newStatus = !isApproved;
    
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/comments/${commentId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isApproved: newStatus }),
        });

        if (response.ok) {
          setIsApproved(newStatus);
          onUpdate(commentId, newStatus);
        }
      } catch (error) {
        console.error('Failed to update comment status:', error);
      }
    });
  };

  return (
    <div className="flex items-center">
      <Switch
        checked={isApproved}
        onChange={handleToggle}
        disabled={isPending}
        className={`${
          isApproved ? 'bg-green-600' : 'bg-gray-200'
        } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50`}
      >
        <span className="sr-only">
          {isApproved ? 'Approved' : 'Pending'}
        </span>
        <span
          className={`${
            isApproved ? 'translate-x-6' : 'translate-x-1'
          } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
        />
      </Switch>
      <span className={`ml-2 text-sm ${isApproved ? 'text-green-600' : 'text-gray-500'}`}>
        {isApproved ? 'Approved' : 'Pending'}
      </span>
    </div>
  );
}