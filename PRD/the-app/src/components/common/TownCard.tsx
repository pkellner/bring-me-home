import Link from '@/components/OptimizedLink';

export interface TownCardData {
  id: string;
  name: string;
  slug: string;
  state: string;
  _count: {
    persons: number;
  };
  statusCounts: {
    detained: number;
    released: number;
    deported: number;
    other: number;
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
      {(() => {
        const parts: string[] = [];

        if (town.statusCounts.detained > 0) {
          parts.push(`${town.statusCounts.detained} detained`);
        }
        if (town.statusCounts.released > 0) {
          parts.push(`${town.statusCounts.released} released`);
        }
        if (town.statusCounts.deported > 0) {
          parts.push(`${town.statusCounts.deported} deported`);
        }
        if (town.statusCounts.other > 0) {
          parts.push(`${town.statusCounts.other} other`);
        }

        const statusText = parts.join(', ');

        return (
          <p className="text-sm text-indigo-600 mt-2">
            {statusText || 'No persons listed'}
          </p>
        );
      })()}
    </Link>
  );
}