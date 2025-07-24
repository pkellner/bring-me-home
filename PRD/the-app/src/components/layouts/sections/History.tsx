import PersonHistorySection from '@/components/person/PersonHistorySection';
import { SanitizedPersonHistory } from '@/types/sanitized';

interface HistoryProps {
  person: {
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
    <PersonHistorySection 
      history={person.personHistory}
      personName={personName}
    />
  );
}