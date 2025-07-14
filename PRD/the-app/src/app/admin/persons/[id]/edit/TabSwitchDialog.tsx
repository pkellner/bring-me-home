'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TabSwitchDialogProps {
  isOpen: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  currentTabName: string;
}

export function TabSwitchDialog({ 
  isOpen, 
  onSave, 
  onDiscard, 
  onCancel,
  currentTabName 
}: TabSwitchDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center mb-4">
          <AlertTriangle className="h-6 w-6 text-amber-600 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">
            Unsaved Changes
          </h3>
        </div>
        
        <p className="text-gray-600 mb-6">
          You have unsaved changes in the {currentTabName} tab. What would you like to do?
        </p>
        
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onDiscard}
          >
            Discard Changes
          </Button>
          <Button
            variant="default"
            onClick={onSave}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}