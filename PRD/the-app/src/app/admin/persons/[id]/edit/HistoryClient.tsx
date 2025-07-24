'use client';

import { PersonEditLayout } from './PersonEditLayout';
import PersonHistoryGrid from '@/components/admin/PersonHistoryGrid';
import { SanitizedPersonHistory } from '@/types/sanitized';

interface HistoryClientProps {
  personId: string;
  personName: string;
  initialHistory: SanitizedPersonHistory[];
  isSiteAdmin: boolean;
}

export function HistoryClient({
  personId,
  personName,
  initialHistory,
  isSiteAdmin,
}: HistoryClientProps) {
  // History tab doesn't have unsaved changes since it saves immediately
  const hasChanges = false;

  return (
    <PersonEditLayout
      personId={personId}
      personName={personName}
      hasChanges={hasChanges}
    >
      <PersonHistoryGrid 
        personId={personId}
        initialHistory={initialHistory}
        isSiteAdmin={isSiteAdmin}
      />
    </PersonEditLayout>
  );
}