'use client';

import { useState, useRef } from 'react';
import { PersonEditLayout } from './PersonEditLayout';
import PersonFormWithState, { PersonFormHandle } from '../../PersonFormWithState';
import { Person, Town, DetentionCenter, Story } from '@prisma/client';
import { Session } from 'next-auth';

type ImageData = {
  id: string;
  imageType: string;
  sequenceNumber: number;
  caption?: string | null;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

type SerializedPerson = Omit<Person, 'bondAmount'> & {
  bondAmount: string | null;
  town: Town;
  detentionCenter?: DetentionCenter | null;
  stories?: Story[];
  images?: ImageData[];
};

interface PersonEditClientProps {
  person: SerializedPerson;
  towns: Town[];
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