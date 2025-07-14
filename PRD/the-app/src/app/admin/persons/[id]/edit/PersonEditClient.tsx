'use client';

import { useState, useRef } from 'react';
import { PersonEditLayout } from './PersonEditLayout';
import PersonFormWithState, { PersonFormHandle } from '../../PersonFormWithState';
import { Person, Town, DetentionCenter, Story } from '@prisma/client';

type SerializedPerson = Omit<Person, 'bondAmount'> & {
  bondAmount: string | null;
  town: Town;
  detentionCenter?: DetentionCenter | null;
  stories?: Story[];
};

interface PersonEditClientProps {
  person: SerializedPerson;
  towns: Town[];
}

export function PersonEditClient({ person, towns }: PersonEditClientProps) {
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
        onChangeDetected={setHasChanges}
      />
    </PersonEditLayout>
  );
}