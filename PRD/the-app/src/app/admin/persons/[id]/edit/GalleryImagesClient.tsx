'use client';

import { useState, useRef } from 'react';
import { PersonEditLayout } from './PersonEditLayout';
import { GalleryImagesTab } from './GalleryImagesTab';

interface GalleryImagesClientProps {
  personId: string;
  personName: string;
}

export function GalleryImagesClient({ personId, personName }: GalleryImagesClientProps) {
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveRef = useRef<(() => Promise<void>) | null>(null);

  const handleSave = async () => {
    if (saveRef.current) {
      await saveRef.current();
    }
  };

  return (
    <PersonEditLayout
      personId={personId}
      personName={personName}
      hasChanges={hasChanges}
      onSave={handleSave}
      isSaving={isSaving}
    >
      <GalleryImagesTab
        personId={personId}
        onChangeDetected={setHasChanges}
        onSaveRegistered={(save) => { saveRef.current = save; }}
        onSavingChange={setIsSaving}
        hideButtons={true}
      />
    </PersonEditLayout>
  );
}