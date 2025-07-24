import PersonHistoryTimeline from '@/components/person-history/PersonHistoryTimeline';
import { SanitizedPersonHistory } from '@/types/sanitized';

interface HistoryProps {
  person: {
    id: string;
    firstName: string;
    lastName: string;
    personHistory?: SanitizedPersonHistory[];
  };
}

export default function History({ person }: HistoryProps) {
  if (!person.personHistory || person.personHistory.length === 0) {
    return null;
  }

  const personName = `${person.firstName} ${person.lastName}`;

  return (
    <PersonHistoryTimeline 
      history={person.personHistory}
      personId={person.id}
      personName={personName}
    />
  );
}