'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import Link from '@/components/OptimizedLink';
import { ArrowLeftIcon, GlobeAltIcon, PencilIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface PersonCommentsClientProps {
  person: {
    id: string;
    firstName: string;
    lastName: string;
    slug: string;
    town: {
      name: string;
      state: string;
      slug: string;
    };
  };
  townSlug: string;
  personSlug: string;
}

export default function PersonCommentsClient({
  person,
  townSlug,
  personSlug,
}: PersonCommentsClientProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    router.refresh();
    // Reset animation after a short delay
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [router]);

  return (
    <div className="mb-6 bg-white shadow-sm rounded-lg border border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Comments for {person.firstName} {person.lastName}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {person.town.name}, {person.town.state}
              </p>
            </div>
            <div className="relative">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="group relative inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-white to-gray-50 border border-gray-300 rounded-full shadow-sm hover:shadow-md hover:border-indigo-400 hover:from-indigo-50 hover:to-indigo-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Refresh comments"
              >
                <ArrowPathIcon 
                  className={`h-5 w-5 text-gray-700 group-hover:text-indigo-600 transition-all duration-200 ${
                    isRefreshing ? 'animate-spin' : 'group-hover:scale-110'
                  }`} 
                />
                <span className="sr-only">Refresh comments</span>
              </button>
              {/* Tooltip */}
              <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none shadow-lg z-10">
                Refresh
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-1">
                  <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900"></div>
                </div>
              </div>
            </div>
          </div>
        <div className="flex gap-2">
          <Link
            href={`/${townSlug}/${personSlug}`}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <GlobeAltIcon className="h-4 w-4 mr-2" />
            View Live Profile
          </Link>
          <Link
            href={`/admin/persons/${person.id}/edit`}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit Person
          </Link>
          <Link
            href={`/admin/comments/${townSlug}`}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            {person.town.name} Comments
          </Link>
        </div>
      </div>
    </div>
    </div>
  );
}