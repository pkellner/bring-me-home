import Link from '@/components/OptimizedLink';

export interface TownCardData {
  id: string;
  name: string;
  slug: string;
  state: string;
  _count: {
    persons: number;
  };
}

interface TownCardProps {
  town: TownCardData;
  className?: string;
}

export default function TownCard({ town, className = '' }: TownCardProps) {
  return (
    <Link
      href={`/${town.slug}`}
      className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 border border-gray-200 block ${className}`}
    >
      <h4 className="text-lg font-semibold text-gray-900">
        {town.name}
      </h4>
      <p className="text-sm text-gray-600">{town.state}</p>
      <p className="text-sm text-indigo-600 mt-2">
        {town._count.persons} detained person
        {town._count.persons !== 1 ? 's' : ''}
      </p>
    </Link>
  );
}