import Link from 'next/link';
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
  const canManageHistory = isPersonAdmin || isTownAdmin || isSiteAdmin;

  // If no history exists but user can manage, show button-only section
  if (!hasHistory && canManageHistory) {
    return (
      <div id="history-section" className="space-y-6">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <h2 className="text-2xl font-light tracking-wide text-gray-800">
            Updates on {personName}
          </h2>
          <Link
            href={`/admin/persons/${person.id}/edit/history`}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            [Manage and Add Updates]
          </Link>
        </div>
        <div className="text-gray-500 text-center py-8">
          No updates have been posted yet.
        </div>
      </div>
    );
  }

  // If no history and user can't manage, don't show section at all
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