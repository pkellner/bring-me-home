'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BellIcon } from '@heroicons/react/24/outline';

interface NotificationPreference {
  personId: string;
  personName: string;
  personSlug: string;
  townName: string;
  notifyOnNewComments: boolean;
  notifyFrequency: string;
}

interface PersonNotificationSettingsProps {
  userId: string;
  preferences: NotificationPreference[];
  isViewingOwnProfile: boolean;
  isAdmin: boolean;
}

export default function PersonNotificationSettings({
  userId,
  preferences,
  isViewingOwnProfile,
  isAdmin,
}: PersonNotificationSettingsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [settings, setSettings] = useState(preferences);

  const handleUpdate = async (personId: string, field: 'notifyOnNewComments' | 'notifyFrequency', value: boolean | string) => {
    // Update local state immediately
    setSettings(prev => prev.map(pref => 
      pref.personId === personId 
        ? { ...pref, [field]: value }
        : pref
    ));

    // If unchecking notifications, reset frequency to immediate
    if (field === 'notifyOnNewComments' && !value) {
      setSettings(prev => prev.map(pref => 
        pref.personId === personId 
          ? { ...pref, notifyFrequency: 'immediate' }
          : pref
      ));
    }

    // Send update to server
    startTransition(async () => {
      try {
        const response = await fetch('/api/profile/person-notifications', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: isViewingOwnProfile ? undefined : userId,
            personId,
            [field]: value,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update notification settings');
        }

        router.refresh();
      } catch (error) {
        console.error('Failed to update notification settings:', error);
        // Revert on error
        setSettings(preferences);
      }
    });
  };

  const canEdit = isViewingOwnProfile || isAdmin;

  if (settings.length === 0) {
    return null;
  }

  return (
    <div className="px-6 py-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <BellIcon className="h-5 w-5 mr-2 text-gray-500" />
        Notification Settings
      </h2>
      
      <div className="space-y-6">
        {settings.map((pref) => {
          const setting = settings.find(s => s.personId === pref.personId) || pref;
          
          return (
            <div key={pref.personId} className="border border-gray-200 rounded-lg p-4">
              <div className="mb-3">
                <h3 className="font-medium text-gray-900">
                  {pref.personName}
                </h3>
                <p className="text-sm text-gray-500">{pref.townName}</p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id={`notify-${pref.personId}`}
                    checked={setting.notifyOnNewComments}
                    onChange={(e) => handleUpdate(pref.personId, 'notifyOnNewComments', e.target.checked)}
                    disabled={isPending || !canEdit}
                    className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 mt-1"
                  />
                  <label htmlFor={`notify-${pref.personId}`} className="ml-3">
                    <div className="text-sm font-medium text-gray-900">
                      Notify me about new comments
                    </div>
                    <div className="text-sm text-gray-600">
                      Receive notifications when new comments need approval
                    </div>
                  </label>
                </div>
                
                {setting.notifyOnNewComments && (
                  <div className="ml-7 space-y-2">
                    <p className="text-sm font-medium text-gray-700">Frequency:</p>
                    
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={`frequency-${pref.personId}`}
                        value="immediate"
                        checked={setting.notifyFrequency === 'immediate'}
                        onChange={(e) => handleUpdate(pref.personId, 'notifyFrequency', e.target.value)}
                        disabled={isPending || !canEdit}
                        className="h-4 w-4 text-indigo-600 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Immediately</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={`frequency-${pref.personId}`}
                        value="hourly"
                        checked={setting.notifyFrequency === 'hourly'}
                        onChange={(e) => handleUpdate(pref.personId, 'notifyFrequency', e.target.value)}
                        disabled={isPending || !canEdit}
                        className="h-4 w-4 text-indigo-600 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Hourly digest</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={`frequency-${pref.personId}`}
                        value="daily"
                        checked={setting.notifyFrequency === 'daily'}
                        onChange={(e) => handleUpdate(pref.personId, 'notifyFrequency', e.target.value)}
                        disabled={isPending || !canEdit}
                        className="h-4 w-4 text-indigo-600 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Daily digest</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {!isViewingOwnProfile && (
          <div className="text-sm text-gray-500 italic mt-2">
            {isAdmin 
              ? `You are editing ${userId}'s notification settings`
              : `You are viewing ${userId}'s notification settings (read-only)`
            }
          </div>
        )}
      </div>
    </div>
  );
}