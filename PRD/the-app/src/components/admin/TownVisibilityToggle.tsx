'use client';

import { useState, useTransition } from 'react';
import { toggleTownVisibility } from '@/app/actions/towns';

interface TownVisibilityToggleProps {
  townId: string;
  initialIsActive: boolean;
  onUpdate?: (townId: string, isActive: boolean) => void;
}

export default function TownVisibilityToggle({
  townId,
  initialIsActive,
  onUpdate
}: TownVisibilityToggleProps) {
  const [isActive, setIsActive] = useState(initialIsActive);
  const [isPending, startTransition] = useTransition();

  const handleToggle = async () => {
    const newStatus = !isActive;
    
    // Optimistic update
    setIsActive(newStatus);
    if (onUpdate) {
      onUpdate(townId, newStatus);
    }

    startTransition(async () => {
      try {
        const result = await toggleTownVisibility(townId, newStatus);
        if (!result.success) {
          // Rollback on failure
          setIsActive(!newStatus);
          if (onUpdate) {
            onUpdate(townId, !newStatus);
          }
        }
      } catch (error) {
        // Rollback on error
        setIsActive(!newStatus);
        if (onUpdate) {
          onUpdate(townId, !newStatus);
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