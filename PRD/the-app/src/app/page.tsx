import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import HeaderNavigation from '@/components/HeaderNavigation';
import FooterWrapper from '@/components/FooterWrapper';
import { getSiteTextConfig } from '@/lib/config';
import { generateImageUrlServerWithCdn } from '@/lib/image-url-server';

async function getPublicData() {
  const [towns, recentPersons, totalDetained] = await Promise.all([
    prisma.town.findMany({
      where: {
        isActive: true, // Only show visible towns
      },
      select: {
        id: true,
        name: true,
        slug: true,
        state: true,
        _count: {
          select: {
            persons: {
              where: {
                isActive: true,
                status: 'detained',
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
        status: 'detained',
        town: {
          isActive: true, // Only from visible towns
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        slug: true,
        personImages: {
          where: {
            imageType: 'primary',
          },
          include: {
            image: {
              select: {
                id: true,
                updatedAt: true,
              },
            },
          },
          take: 1,
        },
        lastSeenDate: true,
        town: {
          select: {
            name: true,
            slug: true,
            state: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 6,
    }),
    prisma.person.count({
      where: {
        isActive: true,
        status: 'detained',
        town: {
          isActive: true,
        },
      },
    }),
  ]);

  // Pre-generate image URLs for recent persons
  const recentPersonsWithUrls = await Promise.all(
    recentPersons.map(async (person) => ({
      ...person,
      imageUrl: person.personImages?.[0]?.image 
        ? await generateImageUrlServerWithCdn(
            person.personImages[0].image.id, 
            { width: 300, height: 300, quality: 80 },
            '/' // Home page is not an admin route
          )
        : null
    }))
  );

  return { towns, recentPersons: recentPersonsWithUrls, totalDetained };
}

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const { towns, recentPersons, totalDetained } = await getPublicData();
  const config = await getSiteTextConfig();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">
                {config.site_title || 'Bring Me Home'}
              </h1>
            </div>
            <HeaderNavigation user={session?.user || null} />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-indigo-700">
        <div className="mx-auto max-w-7xl py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl font-extrabold text-white sm:text-5xl sm:tracking-tight lg:text-6xl">
              {config.site_tagline || 'Help Bring Families Together'}
            </h2>
            <p className="mt-4 text-xl text-indigo-200">
              {config.site_description ||
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
            {config.find_by_location_text || 'Find by Location'}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {towns.map(town => (
              <Link
                key={town.id}
                href={`/${town.slug}`}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 border border-gray-200"
              >
                <h4 className="text-lg font-semibold text-gray-900">
                  {town.name}
                </h4>
                <p className="text-sm text-gray-600">{town.state}</p>
                <p className="text-sm text-indigo-600 mt-2">
                  {town._count.persons} detained person
                  {town._count.persons !== 1 ? 's' : ''}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent Missing Persons */}
        <section>
          <h3 className="text-2xl font-bold text-gray-900 mb-8">
            {config.recently_added_text || 'Recently Added'}
          </h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recentPersons.map(person => (
              <div
                key={person.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden"
              >
                <Link
                  href={`/${person.town.slug}/${person.slug}`}
                  className="block h-48 bg-gray-200 flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  {person.imageUrl ? (
                    <img
                      src={person.imageUrl}
                      alt={`${person.firstName} ${person.lastName}`}
                      className="h-full w-full object-contain"
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
                </Link>
                <div className="p-4">
                  <h4 className="text-lg font-semibold text-gray-900">
                    {person.firstName} {person.lastName}
                  </h4>
                  <Link
                    href={`/${person.town.slug}/${person.slug}`}
                    className="hover:text-indigo-600 transition-colors"
                  >
                    <p className="text-sm text-gray-600 hover:text-indigo-600">
                      {person.town.name}, {person.town.state}
                    </p>
                  </Link>
                  {person.lastSeenDate && (
                    <p className="text-sm text-gray-500 mt-1">
                      {config.last_seen_label || 'Detained since'}:{' '}
                      {person.lastSeenDate.toLocaleDateString()}
                    </p>
                  )}
                  <Link
                    href={`/${person.town.slug}/${person.slug}`}
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
            {config.homepage_cta_title || 'How You Can Help'}
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            {config.homepage_cta_text ||
              'Every voice matters. By showing your support for detained individuals, you help demonstrate to authorities the community ties and support system waiting for their return.'}
          </p>
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <button className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-700">
              {config.homepage_cta_button || 'Show Your Support'}
            </button>
            <button className="w-full sm:w-auto border border-gray-300 text-gray-700 px-6 py-3 rounded-md font-medium hover:bg-gray-50">
              Learn More
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <FooterWrapper />
    </div>
  );
}
