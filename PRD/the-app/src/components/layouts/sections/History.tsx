import PersonHistoryTimeline from '@/components/person-history/PersonHistoryTimeline';
import { SanitizedPersonHistory } from '@/types/sanitized';

interface HistoryProps {
  person: {
    id: string;
    firstName: string;
    lastName: string;
    slug: string;
    personHistory?: SanitizedPersonHistory[];
    town: {
      slug: string;
    };
  };
  isPersonAdmin?: boolean;
  isTownAdmin?: boolean;
  isSiteAdmin?: boolean;
}

export default function History({ person, isPersonAdmin, isTownAdmin, isSiteAdmin }: HistoryProps) {
  if (!person.personHistory || person.personHistory.length === 0) {
    return null;
  }

  const personName = `${person.firstName} ${person.lastName}`;

  return (
    <PersonHistoryTimeline 
      history={person.personHistory}
      personId={person.id}
      personName={personName}
      townSlug={person.town.slug}
      personSlug={person.slug}
      isPersonAdmin={isPersonAdmin}
      isTownAdmin={isTownAdmin}
      isSiteAdmin={isSiteAdmin}
    />
  );
}