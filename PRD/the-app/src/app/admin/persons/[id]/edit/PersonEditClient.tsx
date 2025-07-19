'use client';

import { useState, useRef } from 'react';
import { PersonEditLayout } from './PersonEditLayout';
import PersonFormWithState, { PersonFormHandle } from '../../PersonFormWithState';
import { Session } from 'next-auth';
import type {
  SerializedPerson,
  SanitizedTown
} from '@/types/sanitized';

interface PersonEditClientProps {
  person: SerializedPerson;
  towns: SanitizedTown[];
  session?: Session | null;
}

export function PersonEditClient({ person, towns, session }: PersonEditClientProps) {
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const formRef = useRef<PersonFormHandle>(null);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await formRef.current?.save();
    } finally {
      setIsSaving(false);
    }
  };

  const personName = `${person.firstName} ${person.lastName}`;

  return (
    <PersonEditLayout
      personId={person.id}
      personName={personName}
      hasChanges={hasChanges}
      onSave={handleSave}
      isSaving={isSaving}
    >
      <PersonFormWithState
        ref={formRef}
        person={person}
        towns={towns}
        session={session}
        onChangeDetected={setHasChanges}
      />
    </PersonEditLayout>
  );
}