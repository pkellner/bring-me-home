'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useTabs } from './TabsProvider';

export function UnsavedChangesIndicator() {
  const { hasChanges, activeTab } = useTabs();
  
  const getUnsavedTabs = () => {
    const unsaved: string[] = [];
    if (hasChanges.details) unsaved.push('Details');
    if (hasChanges['person-image']) unsaved.push('Person Image');
    if (hasChanges['gallery-images']) unsaved.push('Gallery Images');
    return unsaved;
  };

  const unsavedTabs = getUnsavedTabs();
  const hasAnyChanges = unsavedTabs.length > 0;
  const currentTabHasChanges = hasChanges[activeTab as keyof typeof hasChanges];

  if (!hasAnyChanges) return null;

  return (
    <div className="mb-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              Unsaved changes in: {unsavedTabs.join(', ')}
            </p>
            {currentTabHasChanges && (
              <p className="text-sm text-amber-700 mt-1">
                Click &quot;Update Person&quot; to save changes in the current tab.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}