'use client';

import { useState, useTransition } from 'react';
import { Switch } from '@headlessui/react';

interface CommentHideToggleProps {
  commentId: string;
  initialHideRequested: boolean;
  onUpdate: (commentId: string, hideRequested: boolean) => void;
  token?: string | null;
}

export default function CommentHideToggle({
  commentId,
  initialHideRequested,
  onUpdate,
  token,
}: CommentHideToggleProps) {
  const [hideRequested, setHideRequested] = useState(initialHideRequested);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const newStatus = !hideRequested;
    
    startTransition(async () => {
      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['x-verification-token'] = token;
        }
        
        const response = await fetch(`/api/comments/${commentId}/hide`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ hideRequested: newStatus }),
        });

        if (response.ok) {
          setHideRequested(newStatus);
          onUpdate(commentId, newStatus);
        }
      } catch (error) {
        console.error('Failed to update comment visibility:', error);
      }
    });
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <Switch
        checked={!hideRequested}
        onChange={handleToggle}
        disabled={isPending}
        className={`${
          !hideRequested ? 'bg-green-600' : 'bg-red-600'
        } relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50`}
      >
        <span className="sr-only">
          {!hideRequested ? 'Visible' : 'Hidden'}
        </span>
        <span
          className={`${
            !hideRequested ? 'translate-x-5' : 'translate-x-1'
          } inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
        />
      </Switch>
      <span className={`text-xs font-medium ${!hideRequested ? 'text-green-600' : 'text-red-600'}`}>
        {!hideRequested ? 'Visible' : 'Hidden'}
      </span>
    </div>
  );
}