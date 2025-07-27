'use client';

import { useState, useTransition } from 'react';
import { Switch } from '@headlessui/react';

interface PersonHistoryVisibilityToggleProps {
  historyId: string;
  initialVisible: boolean;
  onUpdate: (historyId: string, visible: boolean) => void;
}

export default function PersonHistoryVisibilityToggle({
  historyId,
  initialVisible,
  onUpdate,
}: PersonHistoryVisibilityToggleProps) {
  const [visible, setVisible] = useState(initialVisible);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const newStatus = !visible;
    
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/person-history/${historyId}/visibility`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ visible: newStatus }),
        });

        if (response.ok) {
          setVisible(newStatus);
          onUpdate(historyId, newStatus);
        }
      } catch (error) {
        console.error('Failed to update visibility status:', error);
      }
    });
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <Switch
        checked={visible}
        onChange={handleToggle}
        disabled={isPending}
        className={`${
          visible ? 'bg-green-600' : 'bg-gray-200'
        } relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50`}
      >
        <span className="sr-only">
          {visible ? 'Visible to Public' : 'Hidden'}
        </span>
        <span
          className={`${
            visible ? 'translate-x-5' : 'translate-x-1'
          } inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
        />
      </Switch>
      <span className={`text-xs ${visible ? 'text-green-600' : 'text-gray-500'}`}>
        {visible ? 'Visible to Public' : 'Hidden'}
      </span>
    </div>
  );
}