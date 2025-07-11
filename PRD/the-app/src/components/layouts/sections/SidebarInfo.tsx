import { formatDate } from '@/lib/utils';
import { SerializedPerson } from '../LayoutRenderer';

interface SidebarInfoProps {
  person: SerializedPerson;
}

export default function SidebarInfo({ person }: SidebarInfoProps) {
  return (
    <div className="sidebar-info rounded-lg bg-gray-50 p-6">
      <h3 className="mb-4 text-lg font-semibold">Information</h3>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="font-semibold">Name</dt>
          <dd>
            {person.firstName}{' '}
            {person.middleName ? `${person.middleName} ` : ''}
            {person.lastName}
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Home Town</dt>
          <dd>
            {person.town.name}, {person.town.state}
          </dd>
        </div>
        {person.detentionDate && (
          <div>
            <dt className="font-semibold">Detained Since</dt>
            <dd>{formatDate(person.detentionDate)}</dd>
          </div>
        )}
        {person.lastHeardFromDate && (
          <div>
            <dt className="font-semibold">Last Contact</dt>
            <dd>{formatDate(person.lastHeardFromDate)}</dd>
          </div>
        )}
        <div>
          <dt className="font-semibold">Legal Representation</dt>
          <dd>{person.representedByLawyer ? 'Yes' : 'No'}</dd>
        </div>
      </dl>
    </div>
  );
}