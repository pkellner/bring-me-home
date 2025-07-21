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
}

export default function PersonPageClient({ townSlug, personSlug, adminLinkDelay }: PersonPageClientProps) {
  const [data, setData] = useState<PersonPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    // Show spinner after 100ms to avoid flash for fast loads
    const spinnerTimer = setTimeout(() => {
      if (mounted && loading) {
        setShowSpinner(true);
      }
    }, 100);

    // Add 1 second delay as requested
    const fetchTimer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/person-data/${townSlug}/${personSlug}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch person data');
        }

        const personData: PersonPageData = await response.json();
        
        if (mounted) {
          console.log('PersonPageClient received data:', {
            hasPerson: !!personData.person,
            hasPermissions: !!personData.permissions,
            hasSupportMapMetadata: !!personData.supportMapMetadata,
            supportMapMetadata: personData.supportMapMetadata
          });
          setData(personData);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'An error occurred');
          setLoading(false);
        }
      }
    }, 1000); // 1 second delay

    return () => {
      mounted = false;
      clearTimeout(spinnerTimer);
      clearTimeout(fetchTimer);
    };
  }, [townSlug, personSlug, loading]);

  if (loading && showSpinner) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading person information...</p>
        </div>
      </div>
    );
  }

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
        sections: ['top-row', 'story', 'comments'],
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