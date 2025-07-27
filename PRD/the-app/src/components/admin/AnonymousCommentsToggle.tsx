'use client';

import { useState, useTransition } from 'react';
import { Switch } from '@headlessui/react';

interface AnonymousCommentsToggleProps {
  initialAllowAnonymousComments: boolean;
  email: string;
  token?: string | null;
  onUpdate?: (allowAnonymousComments: boolean) => void;
}

export default function AnonymousCommentsToggle({
  initialAllowAnonymousComments,
  email,
  token,
  onUpdate,
}: AnonymousCommentsToggleProps) {
  const [allowAnonymousComments, setAllowAnonymousComments] = useState(initialAllowAnonymousComments);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const newStatus = !allowAnonymousComments;
    
    startTransition(async () => {
      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['x-verification-token'] = token;
        }
        
        const response = await fetch('/api/profile/anonymous-comments', {
          method: 'POST',
          headers,
          body: JSON.stringify({ 
            allowAnonymousComments: newStatus,
            email: email 
          }),
        });

        if (response.ok) {
          setAllowAnonymousComments(newStatus);
          onUpdate?.(newStatus);
        }
      } catch (error) {
        console.error('Failed to update anonymous comments setting:', error);
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
      <Switch
        checked={allowAnonymousComments}
        onChange={handleToggle}
        disabled={isPending}
        className={`${
          allowAnonymousComments ? 'bg-green-600' : 'bg-red-600'
        } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50`}
      >
        <span className="sr-only">
          {allowAnonymousComments ? 'Allow anonymous comments' : 'Disallow anonymous comments'}
        </span>
        <span
          className={`${
            allowAnonymousComments ? 'translate-x-6' : 'translate-x-1'
          } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
        />
      </Switch>
      <span className={`text-sm font-medium ${allowAnonymousComments ? 'text-green-600' : 'text-red-600'}`}>
        {allowAnonymousComments ? 'Allowed' : 'Not allowed'}
      </span>
    </div>
  );
}