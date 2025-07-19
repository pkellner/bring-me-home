'use client';

import React, { useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { PersonEditNavigation } from './PersonEditNavigation';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';

interface PersonEditLayoutProps {
  personId: string;
  personName: string;
  hasChanges?: boolean;
  onSave?: () => Promise<void>;
  isSaving?: boolean;
  children: ReactNode;
}

export function PersonEditLayout({
  personId,
  personName,
  hasChanges = false,
  onSave,
  isSaving = false,
  children
}: PersonEditLayoutProps) {

  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);



  const handleNavigate = (href: string) => {
    setPendingNavigation(href);
    setShowDialog(true);
  };

  const handleSaveAndNavigate = async () => {
    if (onSave) {
      await onSave();
    }
    if (pendingNavigation) {
      router.push(pendingNavigation);
    }
    setShowDialog(false);
    setPendingNavigation(null);
  };

  const handleDiscardAndNavigate = () => {
    if (pendingNavigation) {
      router.push(pendingNavigation);
    }
    setShowDialog(false);
    setPendingNavigation(null);
  };

  const handleCancel = () => {
    setShowDialog(false);
    setPendingNavigation(null);
  };



  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Person</h1>
          <p className="mt-1 text-sm text-gray-600">{personName}</p>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <PersonEditNavigation
              personId={personId}
              hasChanges={hasChanges}
              onSave={onSave}
              isSaving={isSaving}
              onNavigate={handleNavigate}
            />

            {children}
          </div>
        </div>
      </div>

      <UnsavedChangesDialog
        isOpen={showDialog}
        onSave={handleSaveAndNavigate}
        onDiscard={handleDiscardAndNavigate}
        onCancel={handleCancel}
        isSaving={isSaving}
      />
    </>
  );
}