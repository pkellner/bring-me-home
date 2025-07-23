'use client';

import { useEffect, useState } from 'react';
import { useDataFetcher } from '@/hooks/useDataFetcher';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import PersonCard from '@/components/common/PersonCard';
import PageHeader from '@/components/common/PageHeader';
import CallToAction from '@/components/common/CallToAction';
import FooterClient from '@/components/FooterClient';
import { replaceTextPlaceholders } from '@/lib/config-utils';
import type { TownPageData } from '@/types/api-responses';

interface TownPageClientProps {
  townSlug: string;
  spinnerDelay: number;
}

interface PageData extends TownPageData {
  session?: {
    user: {
      id: string;
      username: string | null;
      email: string | null;
      roles?: Array<{ name: string }>;
    };
  } | null;
  config?: Record<string, string>;
}

export default function TownPageClient({ townSlug, spinnerDelay }: TownPageClientProps) {
  const { data, error, isDataReady, showSpinner, retry } = useDataFetcher<TownPageData>(
    `/api/town-data/${townSlug}`,
    { spinnerDelay }
  );

  const [session, setSession] = useState<PageData['session']>(null);
  const [config, setConfig] = useState<PageData['config']>({});

  // Fetch session and config data
  useEffect(() => {
    // Fetch session
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => setSession(data))
      .catch(() => setSession(null));

    // Fetch site config
    fetch('/api/configs')
      .then(res => res.json())
      .then(data => setConfig(data.siteText || {}))
      .catch(() => setConfig({}));
  }, []);

  // Still loading - show blank or spinner based on delay
  if (!isDataReady) {
    if (showSpinner) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <LoadingSpinner message="Loading town information..." />
        </div>
      );
    }
    // If not ready but spinner delay hasn't passed, show blank page
    return <div className="min-h-screen bg-gray-50"></div>;
  }

  // Error state
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <ErrorDisplay 
          error={error || 'Town not found'} 
          retry={retry}
        />
      </div>
    );
  }

  const town = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <PageHeader
        title={`${town.name}, ${town.state}`}
        backLink={{
          href: '/',
          text: config?.back_to_home_text || '← Back to Home'
        }}
        user={session?.user}
      />

      {/* Town Info Section */}
      <div className="bg-indigo-700">
        <div className="mx-auto max-w-7xl py-12 px-4 sm:py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              {replaceTextPlaceholders(
                config?.town_page_title ||
                  'Detained Community Members in {town}',
                { town: town.name }
              )}
            </h2>
            <p className="mt-4 text-lg text-indigo-200">
              {replaceTextPlaceholders(
                config?.town_page_subtitle ||
                  '{count} community member(s) need your support',
                { count: town.persons.length }
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl py-12 px-4 sm:px-6 lg:px-8">
        {town.persons.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {town.persons.map(person => (
              <PersonCard
                key={person.id}
                person={person}
                townSlug={townSlug}
                config={config || {}}
                variant="full"
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                className="h-12 w-12"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {config?.town_no_detainees_title ||
                'No detained individuals reported'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {replaceTextPlaceholders(
                config?.town_no_detainees_text ||
                  'There are currently no detained community members from {town} in the system.',
                { town: town.name }
              )}
            </p>
          </div>
        )}

        {/* Call to Action */}
        <CallToAction
          config={config || {}}
          variant="town"
          className="mt-16"
        />
      </main>

      {/* Footer */}
      <FooterClient
        config={config}
        townLayout={town.layout?.name}
        townTheme={town.theme?.name}
        townName={town.name}
      />
    </div>
  );
}