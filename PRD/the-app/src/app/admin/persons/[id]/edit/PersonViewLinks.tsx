'use client';

import Link from '@/components/OptimizedLink';
import { GlobeAltIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

interface PersonViewLinksProps {
  townSlug: string;
  personSlug: string;
}

export function PersonViewLinks({ townSlug, personSlug }: PersonViewLinksProps) {
  return (
    <div className="flex gap-2 mb-6">
      <Link
        href={`/${townSlug}/${personSlug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <GlobeAltIcon className="h-4 w-4 mr-2" />
        View Profile
      </Link>
      <Link
        href={`/admin/comments/${townSlug}/${personSlug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
        View Comments
      </Link>
    </div>
  );
}