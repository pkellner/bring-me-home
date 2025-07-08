import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

async function getPublicData() {
  const [towns, recentPersons] = await Promise.all([
    prisma.town.findMany({
      select: {
        id: true,
        name: true,
        state: true,
        _count: {
          select: {
            persons: {
              where: {
                isActive: true,
                status: 'missing',
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.person.findMany({
      where: {
        isActive: true,
        status: 'missing',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        primaryPicture: true,
        lastSeenDate: true,
        town: {
          select: {
            name: true,
            state: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 6,
    }),
  ]);

  return { towns, recentPersons };
}

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const { towns, recentPersons } = await getPublicData();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">
                Bring Me Home
              </h1>
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

      {/* Hero Section */}
      <div className="bg-indigo-700">
        <div className="mx-auto max-w-7xl py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl font-extrabold text-white sm:text-5xl sm:tracking-tight lg:text-6xl">
              Help Bring Families Together
            </h2>
            <p className="mt-4 text-xl text-indigo-200">
              A platform dedicated to connecting missing persons with their
              loved ones through community engagement and support.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl py-12 px-4 sm:px-6 lg:px-8">
        {/* Towns Section */}
        <section className="mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">
            Find by Location
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {towns.map(town => (
              <Link
                key={town.id}
                href={`/${town.name.toLowerCase().replace(/\s+/g, '-')}`}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 border border-gray-200"
              >
                <h4 className="text-lg font-semibold text-gray-900">
                  {town.name}
                </h4>
                <p className="text-sm text-gray-600">{town.state}</p>
                <p className="text-sm text-indigo-600 mt-2">
                  {town._count.persons} missing person
                  {town._count.persons !== 1 ? 's' : ''}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent Missing Persons */}
        <section>
          <h3 className="text-2xl font-bold text-gray-900 mb-8">
            Recently Added
          </h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recentPersons.map(person => (
              <div
                key={person.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="h-48 bg-gray-200 flex items-center justify-center">
                  {person.primaryPicture ? (
                    <img
                      src={person.primaryPicture}
                      alt={`${person.firstName} ${person.lastName}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-gray-400">
                      <svg
                        className="h-12 w-12"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h4 className="text-lg font-semibold text-gray-900">
                    {person.firstName} {person.lastName}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {person.town.name}, {person.town.state}
                  </p>
                  {person.lastSeenDate && (
                    <p className="text-sm text-gray-500 mt-1">
                      Last seen: {person.lastSeenDate.toLocaleDateString()}
                    </p>
                  )}
                  <Link
                    href={`/${person.town.name.toLowerCase().replace(/\s+/g, '-')}/${person.firstName.toLowerCase()}-${person.lastName.toLowerCase()}`}
                    className="mt-3 inline-block text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Call to Action */}
        <section className="mt-16 bg-white rounded-lg shadow p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            How You Can Help
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Every piece of information matters. If you have seen any of these
            individuals or have any information that could help, please don't
            hesitate to contribute to their profiles.
          </p>
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <button className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-700">
              Submit Information
            </button>
            <button className="w-full sm:w-auto border border-gray-300 text-gray-700 px-6 py-3 rounded-md font-medium hover:bg-gray-50">
              Learn More
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white">
        <div className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm text-gray-400">
              © 2024 Bring Me Home. Together, we can help families reunite.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
