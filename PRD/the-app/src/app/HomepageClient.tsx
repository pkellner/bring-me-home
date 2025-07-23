'use client';

import { useEffect, useState } from 'react';
import { useDataFetcher } from '@/hooks/useDataFetcher';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import PersonCard from '@/components/common/PersonCard';
import TownCard from '@/components/common/TownCard';
import CallToAction from '@/components/common/CallToAction';
import HeaderNavigation from '@/components/HeaderNavigation';
import FooterClient from '@/components/FooterClient';
import type { HomepageData } from '@/types/api-responses';

interface HomepageClientProps {
  spinnerDelay: number;
}

interface PageData extends HomepageData {
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

export default function HomepageClient({ spinnerDelay }: HomepageClientProps) {
  const { data, error, isDataReady, showSpinner, retry } = useDataFetcher<HomepageData>(
    '/api/homepage-data',
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
          <LoadingSpinner message="Loading homepage..." />
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
          error={error || 'Failed to load homepage'} 
          retry={retry}
        />
      </div>
    );
  }

  const { towns, recentPersons, totalDetained } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">
                {config?.site_title || 'Bring Me Home'}
              </h1>
            </div>
            <HeaderNavigation user={session?.user ? {
              ...session.user,
              username: session.user.username || '',
              firstName: undefined,
            } : null} />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-indigo-700">
        <div className="mx-auto max-w-7xl py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl font-extrabold text-white sm:text-5xl sm:tracking-tight lg:text-6xl">
              {config?.site_tagline || 'Help Bring Families Together'}
            </h2>
            <p className="mt-4 text-xl text-indigo-200">
              {config?.site_description ||
                'A platform dedicated to reuniting detained individuals with their families through community support and advocacy.'}
            </p>
            {totalDetained > 0 && (
              <p className="mt-6 text-lg text-indigo-100">
                Currently supporting{' '}
                <span className="font-bold text-white">{totalDetained}</span>{' '}
                detained {totalDetained === 1 ? 'person' : 'people'} across{' '}
                {towns.length}{' '}
                {towns.length === 1 ? 'community' : 'communities'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl py-12 px-4 sm:px-6 lg:px-8">
        {/* Towns Section */}
        <section className="mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">
            {config?.find_by_location_text || 'Find by Location'}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {towns.map(town => (
              <TownCard key={town.id} town={town} />
            ))}
          </div>
        </section>

        {/* Recent Missing Persons */}
        <section>
          <h3 className="text-2xl font-bold text-gray-900 mb-8">
            {config?.recently_added_text || 'Recently Added'}
          </h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recentPersons.map(person => (
              <PersonCard
                key={person.id}
                person={{
                  ...person,
                  dateOfBirth: null,
                  story: null,
                  detentionCenter: null,
                  _count: undefined
                }}
                townSlug={person.town.slug}
                config={config || {}}
                variant="compact"
              />
            ))}
          </div>
        </section>

        {/* Call to Action */}
        <CallToAction
          config={config || {}}
          variant="homepage"
          className="mt-16"
        />
      </main>

      {/* Footer */}
      <FooterClient config={config} />
    </div>
  );
}