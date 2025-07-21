'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import LayoutRenderer, {
  type SerializedPerson,
} from '@/components/layouts/LayoutRenderer';
import Footer from '@/components/Footer';
import DelayedAdminLink from '@/components/person/DelayedAdminLink';

interface PersonPageProps {
  params: Promise<{ townSlug: string; personSlug: string }>;
}

interface SystemDefaults {
  theme: string | null;
}

interface UserAccess {
  isSiteAdmin: boolean;
  isTownAdmin: boolean;
  isPersonAdmin: boolean;
  isAdmin: boolean;
}

export default function PersonPage({ params }: PersonPageProps) {
  const [townSlug, setTownSlug] = useState<string>('');
  const [personSlug, setPersonSlug] = useState<string>('');
  const [person, setPerson] = useState<SerializedPerson | null>(null);
  const [comments, setComments] = useState<SerializedPerson['comments']>([]);
  const [systemDefaults, setSystemDefaults] = useState<SystemDefaults>({ theme: null });
  const [userAccess, setUserAccess] = useState<UserAccess>({
    isSiteAdmin: false,
    isTownAdmin: false,
    isPersonAdmin: false,
    isAdmin: false,
  });
  const [loading, setLoading] = useState(true);
  const [adminLinkDelay] = useState(5);
  
  const { data: session } = useSession();

  // Resolve params promise
  useEffect(() => {
    params.then(p => {
      setTownSlug(p.townSlug);
      setPersonSlug(p.personSlug);
    });
  }, [params]);

  // Fetch person data (without comments) from API
  useEffect(() => {
    if (!townSlug || !personSlug) return;

    const fetchPersonData = async () => {
      try {
        // Fetch person data
        const personResponse = await fetch(`/api/public/persons/${townSlug}/${personSlug}`);
        if (!personResponse.ok) {
          if (personResponse.status === 404) {
            notFound();
          }
          throw new Error('Failed to fetch person data');
        }
        const personData = await personResponse.json();
        setPerson(personData);

        // Fetch system defaults
        const systemResponse = await fetch('/api/system/defaults');
        if (systemResponse.ok) {
          const systemData = await systemResponse.json();
          setSystemDefaults(systemData);
        }

        // Check user access based on session roles
        if (session?.user) {
          const isSiteAdmin = session.user.roles?.some(role => role.name === 'site-admin') || false;
          const isTownAdmin = false; // Would need separate API call to check town access
          const isPersonAdmin = false; // Would need separate API call to check person access
          const isAdmin = isSiteAdmin || isTownAdmin || isPersonAdmin;
          
          setUserAccess({
            isSiteAdmin,
            isTownAdmin,
            isPersonAdmin,
            isAdmin,
          });
        }
      } catch (error) {
        console.error('Error fetching person data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPersonData();
  }, [townSlug, personSlug, session]);

  // Fetch comments separately
  useEffect(() => {
    if (!townSlug || !personSlug) return;

    const fetchComments = async () => {
      try {
        const commentsResponse = await fetch(`/api/public/persons/${townSlug}/${personSlug}/comments`);
        if (commentsResponse.ok) {
          const commentsData = await commentsResponse.json();
          setComments(commentsData);
        }
      } catch (error) {
        console.error('Error fetching comments:', error);
      }
    };

    fetchComments();
  }, [townSlug, personSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!person) {
    notFound();
  }

  // Determine which layout and theme to use
  const layout = person.layout ||
    person.town.layout || {
      id: 'default',
      name: 'Standard Profile',
      template: JSON.stringify({
        type: 'custom-person',
        sections: ['top-row', 'story', 'comments'],
      }),
    };

  const theme = person.theme ||
    person.town.theme || {
      id: 'default',
      name: systemDefaults.theme || 'default',
      cssVars: null,
    };

  // Combine person with comments for LayoutRenderer
  const personWithComments = {
    ...person,
    comments,
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
                ← Back to {person.town.name}
              </Link>
            </div>
            <nav className="flex items-center space-x-4">
              {session && (
                <>
                  <span className="text-sm text-gray-700">
                    Welcome, {session.user.firstName || session.user.username}
                  </span>
                  {session.user.roles?.some(role =>
                    ['site-admin', 'town-admin', 'person-admin'].includes(
                      role.name
                    )
                  ) && (
                    <Link
                      href="/admin"
                      className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                    >
                      Admin Panel
                    </Link>
                  )}
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
        <LayoutRenderer
          person={personWithComments}
          layout={layout}
          theme={theme}
          isAdmin={userAccess.isAdmin}
          isSiteAdmin={userAccess.isSiteAdmin}
        />
      </main>

      {/* Footer */}
      <Footer
        townLayout={person.town.layout?.name}
        townTheme={person.town.theme?.name}
        townName={person.town.name}
        personLayout={person.layout?.name}
        personTheme={person.theme?.name}
      />

      {/* Delayed Admin Link for Site Admins */}
      {userAccess.isSiteAdmin && (
        <DelayedAdminLink
          personId={person.id}
          delaySeconds={adminLinkDelay}
        />
      )}
    </div>
  );
}
