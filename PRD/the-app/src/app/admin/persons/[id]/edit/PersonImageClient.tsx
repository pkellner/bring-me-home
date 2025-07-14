'use client';

import { useState, useRef } from 'react';
import { PersonEditLayout } from './PersonEditLayout';
import { PersonImageTab } from './PersonImageTab';

interface PersonImageClientProps {
  personId: string;
  personName: string;
}

export function PersonImageClient({ personId, personName }: PersonImageClientProps) {
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
      <PersonImageTabWithState
        personId={personId}
        onChangeDetected={setHasChanges}
        onSaveRegistered={(save) => { saveRef.current = save; }}
        onSavingChange={setIsSaving}
      />
    </PersonEditLayout>
  );
}

// Extended version of PersonImageTab that exposes state
function PersonImageTabWithState({
  personId,
  onChangeDetected,
  onSaveRegistered,
  onSavingChange
}: {
  personId: string;
  onChangeDetected: (hasChanges: boolean) => void;
  onSaveRegistered: (save: () => Promise<void>) => void;
  onSavingChange: (isSaving: boolean) => void;
}) {
  return (
    <PersonImageTab 
      personId={personId}
      onChangeDetected={onChangeDetected}
      onSaveRegistered={onSaveRegistered}
      onSavingChange={onSavingChange}
      hideButtons={true}
    />
  );
}