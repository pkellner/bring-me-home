import Link from '@/components/OptimizedLink';
import { SerializedPerson } from '../LayoutRenderer';

interface BasicInfoProps {
  person: SerializedPerson;
  isAdmin: boolean;
}

export default function BasicInfo({ person, isAdmin }: BasicInfoProps) {
  return (
    <div className="basic-info text-center">
      <h1 className="mb-2 text-4xl font-bold">
        {person.firstName} {person.middleName ? `${person.middleName} ` : ''}
        {person.lastName}
        {isAdmin && (
          <Link
            href={`/admin/persons/${person.id}/edit`}
            className="ml-3 text-sm font-normal text-indigo-600 hover:text-indigo-500"
          >
            [Edit Person]
          </Link>
        )}
      </h1>
      <p className="text-xl text-theme-secondary">
        Home Town: {person.town.name}, {person.town.state}
      </p>
    </div>
  );
}