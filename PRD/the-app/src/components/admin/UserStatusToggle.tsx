'use client';

import { useState, useTransition } from 'react';
import { Switch } from '@headlessui/react';
import { toggleUserStatus } from '@/app/actions/users';

interface UserStatusToggleProps {
  userId: string;
  initialIsActive: boolean;
  onUpdate: (userId: string, isActive: boolean) => void;
}

export default function UserStatusToggle({
  userId,
  initialIsActive,
  onUpdate,
}: UserStatusToggleProps) {
  const [isActive, setIsActive] = useState(initialIsActive);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const newStatus = !isActive;
    
    startTransition(async () => {
      try {
        const result = await toggleUserStatus(userId, newStatus);
        
        if (result.success) {
          setIsActive(newStatus);
          onUpdate(userId, newStatus);
        }
      } catch (error) {
        console.error('Failed to update user status:', error);
      }
    });
  };

  return (
    <div className="flex items-center">
      <Switch
        checked={isActive}
        onChange={handleToggle}
        disabled={isPending}
        className={`${
          isActive ? 'bg-green-600' : 'bg-gray-200'
        } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50`}
      >
        <span className="sr-only">
          {isActive ? 'Active' : 'Inactive'}
        </span>
        <span
          className={`${
            isActive ? 'translate-x-6' : 'translate-x-1'
          } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
        />
      </Switch>
      <span className={`ml-2 text-sm ${isActive ? 'text-green-600' : 'text-gray-500'}`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    </div>
  );
}