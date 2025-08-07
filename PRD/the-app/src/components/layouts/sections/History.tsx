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
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function History({ person, isPersonAdmin, isTownAdmin, isSiteAdmin, searchParams }: HistoryProps) {
  const personName = `${person.firstName} ${person.lastName}`;
  const hasHistory = person.personHistory && person.personHistory.length > 0;

  // If no history exists, don't show the section at all
  if (!hasHistory) {
    return null;
  }

  // Show normal timeline with history
  return (
    <div id="history-section">
      <PersonHistoryTimeline 
      history={person.personHistory!}
      personId={person.id}
      personName={personName}
      townSlug={person.town.slug}
      personSlug={person.slug}
      isPersonAdmin={isPersonAdmin}
      isTownAdmin={isTownAdmin}
      isSiteAdmin={isSiteAdmin}
      searchParams={searchParams}
    />
    </div>
  );
}