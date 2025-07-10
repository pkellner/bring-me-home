'use client';

import { useState, useTransition } from 'react';
import { togglePersonVisibility } from '@/app/actions/persons';

interface PersonVisibilityToggleProps {
  personId: string;
  initialIsActive: boolean;
  onUpdate?: (personId: string, isActive: boolean) => void;
}

export default function PersonVisibilityToggle({
  personId,
  initialIsActive,
  onUpdate,
}: PersonVisibilityToggleProps) {
  const [isActive, setIsActive] = useState(initialIsActive);
  const [isPending, startTransition] = useTransition();

  const handleToggle = async () => {
    const newStatus = !isActive;

    // Optimistic update
    setIsActive(newStatus);
    if (onUpdate) {
      onUpdate(personId, newStatus);
    }

    startTransition(async () => {
      try {
        const result = await togglePersonVisibility(personId, newStatus);
        if (!result.success) {
          // Rollback on failure
          setIsActive(!newStatus);
          if (onUpdate) {
            onUpdate(personId, !newStatus);
          }
        }
      } catch {
        // Rollback on error
        setIsActive(!newStatus);
        if (onUpdate) {
          onUpdate(personId, !newStatus);
        }
      }
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        isActive
          ? 'bg-green-100 text-green-800 hover:bg-green-200'
          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
      } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isActive ? 'Visible' : 'Hidden'}
    </button>
  );
}
