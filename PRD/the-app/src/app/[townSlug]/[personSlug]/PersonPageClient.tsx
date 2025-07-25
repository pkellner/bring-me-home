'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/OptimizedLink';
import LayoutRenderer, { type SerializedPerson } from '@/components/layouts/LayoutRenderer';
import Footer from '@/components/Footer';
import DelayedAdminLink from '@/components/person/DelayedAdminLink';
import type { PersonPageData } from '@/types/cache';

interface PersonPageClientProps {
  townSlug: string;
  personSlug: string;
  adminLinkDelay: number;
  spinnerDelay: number;
}

export default function PersonPageClient({ townSlug, personSlug, adminLinkDelay, spinnerDelay }: PersonPageClientProps) {
  const [data, setData] = useState<PersonPageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDataReady, setIsDataReady] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    let mounted = true;
    const abortController = new AbortController();
    
    // Reset states on prop changes
    setShowSpinner(false);
    setIsDataReady(false);
    setData(null);
    setError(null);
    
    // Set up spinner timer BEFORE starting fetch
    const spinnerTimer = setTimeout(() => {
      if (mounted) {
        setShowSpinner(true);
      }
    }, spinnerDelay);
    
    // Start fetching
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/person-data/${townSlug}/${personSlug}`, {
          signal: abortController.signal
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch person data');
        }

        const personData: PersonPageData = await response.json();
        
        if (mounted) {
          clearTimeout(spinnerTimer);
          setData(personData);
          setIsDataReady(true);
          setShowSpinner(false);
        }
      } catch (err) {
        if (mounted) {
          clearTimeout(spinnerTimer);
          // Don't set error for abort
          if (err instanceof Error && err.name !== 'AbortError') {
            setError(err.message);
            setIsDataReady(true);
          }
          setShowSpinner(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
      abortController.abort();
      clearTimeout(spinnerTimer);
    };
  }, [townSlug, personSlug, spinnerDelay]);

  // Still loading - show blank or spinner based on delay
  if (!isDataReady) {
    if (showSpinner) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading person information...</p>
          </div>
        </div>
      );
    }
    // If not ready but spinner delay hasn't passed, show blank page
    return <div className="min-h-screen bg-gray-50"></div>;
  }

  // Only show error after data fetch is complete
  if (error || !data || !data.person) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Person Not Found</h1>
          <p className="text-gray-600 mb-6">The person you are looking for could not be found.</p>
          <Link
            href={`/${townSlug}`}
            className="text-indigo-600 hover:text-indigo-500 font-medium"
          >
            Back to {townSlug}
          </Link>
        </div>
      </div>
    );
  }

  const { person, systemDefaults, permissions } = data;
  const serializedPerson = person as SerializedPerson;
  
  // Determine which layout and theme to use
  const layout = serializedPerson.layout ||
    serializedPerson.town.layout || {
      id: 'default',
      name: 'Standard Profile',
      template: JSON.stringify({
        type: 'custom-person',
        sections: ['top-row', 'story', 'history', 'comments'],
      }),
    };

  const theme = serializedPerson.theme ||
    serializedPerson.town.theme || {
      id: 'default',
      name: systemDefaults.theme || 'default',
      cssVars: null,
    };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link
                href={`/${townSlug}`}
                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
              >
                ← Back to {serializedPerson.town.name}
              </Link>
            </div>
            <nav className="flex items-center space-x-4">
              {permissions?.isAdmin && (
                <Link
                  href="/admin"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                >
                  Admin Panel
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
        <LayoutRenderer
          person={serializedPerson}
          layout={layout}
          theme={theme}
          isAdmin={permissions?.isAdmin || false}
          isSiteAdmin={permissions?.isSiteAdmin || false}
          isPersonAdmin={permissions?.isPersonAdmin || false}
          isTownAdmin={permissions?.isTownAdmin || false}
          supportMapMetadata={data.supportMapMetadata}
        />
      </main>

      {/* Footer */}
      <Footer
        townLayout={serializedPerson.town.layout?.name}
        townTheme={serializedPerson.town.theme?.name}
        townName={serializedPerson.town.name}
        personLayout={serializedPerson.layout?.name}
        personTheme={serializedPerson.theme?.name}
      />

      {/* Delayed Admin Link for Site Admins */}
      {permissions?.isSiteAdmin && (
        <DelayedAdminLink
          personId={serializedPerson.id}
          delaySeconds={adminLinkDelay}
        />
      )}
    </div>
  );
}