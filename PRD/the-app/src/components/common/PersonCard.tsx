import Link from '@/components/OptimizedLink';
import Image from 'next/image';
import { Building2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { stripHtml } from '@/lib/stripHtml';

export interface PersonCardData {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  imageUrl: string | null;
  lastSeenDate: Date | null;
  dateOfBirth: Date | null;
  story: string | null;
  detentionCenter: {
    name: string;
    city: string;
    state: string;
  } | null;
  _count?: {
    comments: number;
  };
}

interface PersonCardProps {
  person: PersonCardData;
  townSlug: string;
  config: {
    detained_at_label?: string;
    last_seen_label?: string;
    view_profile_button?: string;
  };
  variant?: 'full' | 'compact';
}

export default function PersonCard({ 
  person, 
  townSlug, 
  config,
  variant = 'full'
}: PersonCardProps) {
  const age = person.dateOfBirth
    ? Math.floor(
        (new Date().getTime() - new Date(person.dateOfBirth).getTime()) /
        (1000 * 60 * 60 * 24 * 365.25)
      )
    : null;

  const storyPreview = person.story
    ? (() => {
        const plainText = stripHtml(person.story);
        return plainText.substring(0, 150) + (plainText.length > 150 ? '...' : '');
      })()
    : null;

  return (
    <div className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow overflow-hidden h-full flex flex-col">
      {/* Image Section */}
      <div className="h-64 bg-gray-200 relative">
        {person.imageUrl ? (
          <Image
            src={person.imageUrl}
            alt={`${person.firstName} ${person.lastName}`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={false}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <svg
              className="h-16 w-16"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">
              {person.firstName} {person.lastName}
            </h3>
            {person.detentionCenter && (
              <div className="flex items-start gap-1 mt-1">
                <Building2 className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                <p className="text-sm font-bold text-red-600">
                  {config.detained_at_label || 'Detained at'}{' '}
                  {person.detentionCenter.name} (
                  {person.detentionCenter.city},{' '}
                  {person.detentionCenter.state})
                </p>
              </div>
            )}
          </div>
          {age !== null && (
            <span className="bg-gray-100 text-gray-800 text-sm px-2 py-1 rounded">
              Age {age}
            </span>
          )}
        </div>

        {person.lastSeenDate && (
          <p className="text-sm text-gray-600 mb-3">
            <span className="font-medium">
              {config.last_seen_label || 'Detained since'}:
            </span>{' '}
            {formatDate(person.lastSeenDate)}
          </p>
        )}

        {variant === 'full' && storyPreview && (
          <div className="mb-4 flex-1">
            <p className="text-gray-700 text-sm line-clamp-3">
              {storyPreview}
            </p>
          </div>
        )}

        <div className="border-t pt-4 space-y-3 mt-auto">
          {variant === 'full' && person._count && (
            <div className="flex items-center justify-between text-sm">
              <div className="text-gray-600">
                <span className="font-medium">
                  {person._count.comments}
                </span>{' '}
                {person._count.comments !== 1 ? 'supporters' : 'supporter'}{' '}
                showing solidarity
              </div>
            </div>
          )}

          <Link
            href={`/${townSlug}/${person.slug}`}
            className="block w-full text-center bg-indigo-600 text-white px-4 py-3 rounded-md font-medium hover:bg-indigo-700 transition-colors"
          >
            {variant === 'full' ? (
              <>
                <div className="text-base">
                  {config.view_profile_button || 'View Full Story & Show Support'}
                </div>
                <div className="text-xs mt-1 opacity-90">
                  Read their story and leave a message of support
                </div>
              </>
            ) : (
              <span>View Details →</span>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}