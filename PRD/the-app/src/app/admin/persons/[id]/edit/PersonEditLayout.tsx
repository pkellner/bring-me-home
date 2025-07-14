'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
  const pathname = usePathname();
  const [showDialog, setShowDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Handle navigation clicks
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      if (!link) return;
      
      const href = link.getAttribute('href');
      if (!href) return;
      
      // Check if it's a navigation between our edit pages
      const isEditPageNav = href.includes(`/admin/persons/${personId}/edit`);
      const isCurrentPage = href === pathname;
      
      if (isEditPageNav && !isCurrentPage && hasChanges) {
        e.preventDefault();
        setPendingNavigation(href);
        setShowDialog(true);
      }
    };

    // Add event listener to navigation links only
    const navElement = document.querySelector('nav');
    if (navElement) {
      navElement.addEventListener('click', handleLinkClick, true);
      return () => navElement.removeEventListener('click', handleLinkClick, true);
    }
  }, [hasChanges, pathname, personId]);

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