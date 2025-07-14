'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Save, X } from 'lucide-react';

interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function UnsavedChangesDialog({
  isOpen,
  onSave,
  onDiscard,
  onCancel,
  isSaving = false
}: UnsavedChangesDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Solid background overlay */}
      <div className="fixed inset-0 bg-gray-900" />
      
      {/* Modal content */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header with warning color */}
        <div className="bg-amber-50 border-b border-amber-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Unsaved Changes
              </h3>
              <p className="text-sm text-gray-600 mt-0.5">
                You have changes that haven&apos;t been saved
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-gray-700">
            Do you want to save your changes before navigating away? 
            Any unsaved changes will be lost.
          </p>
        </div>

        {/* Footer with actions */}
        <div className="bg-gray-50 px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="ghost" 
              onClick={onCancel}
              className="sm:mr-auto"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            
            <Button 
              variant="outline" 
              onClick={onDiscard}
            >
              Discard Changes
            </Button>
            
            <Button 
              onClick={onSave} 
              disabled={isSaving}
              variant="default"
            >
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}