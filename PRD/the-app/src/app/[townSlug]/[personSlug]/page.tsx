import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import LayoutRenderer from '@/components/layouts/LayoutRenderer';
import Footer from '@/components/Footer';
import { getSystemLayoutTheme } from '@/app/actions/systemConfig';

interface PersonPageProps {
  params: Promise<{ townSlug: string; personSlug: string }>;
}

async function getPersonData(townSlug: string, personSlug: string) {
  const townName = townSlug.replace(/-/g, ' ');
  const [firstName, lastName] = personSlug
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1));

  const person = await prisma.person.findFirst({
    where: {
      firstName: firstName,
      lastName: lastName,
      town: {
        name: townName,
      },
      isActive: true,
    },
    include: {
      town: {
        include: {
          layout: true,
          theme: true,
        },
      },
      layout: true,
      theme: true,
      personImages: {
        where: {
          isActive: true,
        },
        orderBy: {
          isPrimary: 'desc',
        },
      },
      comments: {
        where: {
          isActive: true,
        },
        include: {
          author: {
            select: {
              firstName: true,
              lastName: true,
              username: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  // Convert Decimal bondAmount to string for serialization
  if (person && person.bondAmount) {
    return {
      ...person,
      bondAmount: person.bondAmount.toString(),
    };
  }

  return person;
}

export default async function PersonPage({ params }: PersonPageProps) {
  const { townSlug, personSlug } = await params;
  const person = await getPersonData(townSlug, personSlug);
  const session = await getServerSession(authOptions);
  const systemDefaults = await getSystemLayoutTheme();

  if (!person) {
    notFound();
  }

  // Ensure bondAmount is serialized for client component
  const serializedPerson = {
    ...person,
    bondAmount: person.bondAmount ? person.bondAmount.toString() : null,
  };

  // Determine which layout and theme to use
  const layout = serializedPerson.layout || serializedPerson.town.layout || {
    id: 'default',
    name: 'Standard Profile',
    template: JSON.stringify({
      type: systemDefaults.layout || 'grid',
      columns: 2,
      sections: ['image', 'info', 'story', 'comments'],
    }),
  };

  const theme = serializedPerson.theme || serializedPerson.town.theme || {
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
              {session ? (
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
              ) : (
                <div className="space-x-2">
                  <Link
                    href="/auth/signin"
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/register"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                  >
                    Register
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
        <LayoutRenderer person={serializedPerson} layout={layout} theme={theme} />
      </main>

      {/* Footer */}
      <Footer 
        townLayout={serializedPerson.town.layout?.name}
        townTheme={serializedPerson.town.theme?.name}
        townName={serializedPerson.town.name}
        personLayout={serializedPerson.layout?.name}
        personTheme={serializedPerson.theme?.name}
      />
    </div>
  );
}
