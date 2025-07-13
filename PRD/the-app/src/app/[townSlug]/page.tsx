import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import HeaderNavigation from '@/components/HeaderNavigation';
import FooterWrapper from '@/components/FooterWrapper';
import { getSiteTextConfig, replaceTextPlaceholders } from '@/lib/config';
import { stripHtml } from '@/lib/stripHtml';
import { generateImageUrl } from '@/lib/image-url';

interface TownPageProps {
  params: Promise<{ townSlug: string }>;
}

async function getTownData(townSlug: string) {
  const town = await prisma.town.findFirst({
    where: {
      slug: townSlug,
      isActive: true, // Only show visible towns
    },
    include: {
      layout: {
        select: {
          id: true,
          name: true,
        },
      },
      theme: {
        select: {
          id: true,
          name: true,
        },
      },
      persons: {
        where: {
          isActive: true,
          status: 'detained',
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
          dateOfBirth: true,
          story: true,
          createdAt: true,
          detentionCenterId: true,
          detentionCenter: {
            select: {
              id: true,
              name: true,
              city: true,
              state: true,
            },
          },
          _count: {
            select: {
              comments: {
                where: {
                  isActive: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  if (!town) {
    return null;
  }

  return town;
}

export default async function TownPage({ params }: TownPageProps) {
  const { townSlug } = await params;
  const town = await getTownData(townSlug);
  const session = await getServerSession(authOptions);
  const config = await getSiteTextConfig();

  if (!town) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
              >
                {config.back_to_home_text || '← Back to Home'}
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">
                {town.name}, {town.state}
              </h1>
            </div>
            <HeaderNavigation user={session?.user || null} />
          </div>
        </div>
      </header>

      {/* Town Info Section */}
      <div className="bg-indigo-700">
        <div className="mx-auto max-w-7xl py-12 px-4 sm:py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              {replaceTextPlaceholders(
                config.town_page_title ||
                  'Detained Community Members in {town}',
                { town: town.name }
              )}
            </h2>
            <p className="mt-4 text-lg text-indigo-200">
              {replaceTextPlaceholders(
                config.town_page_subtitle ||
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
              <div
                key={person.id}
                className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow overflow-hidden"
              >
                <div className="h-64 bg-gray-200 flex items-center justify-center">
                  {person.personImages?.[0]?.image ? (
                    <img
                      src={generateImageUrl(person.personImages[0].image.id, person.personImages[0].image.updatedAt, { width: 400, height: 300, quality: 85 })}
                      alt={`${person.firstName} ${person.lastName}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-gray-400">
                      <svg
                        className="h-16 w-16"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {person.firstName} {person.lastName}
                      </h3>
                      {person.detentionCenter && (
                        <p className="text-sm font-bold text-red-600 mt-1">
                          {config.detained_at_label || 'Detained at'}{' '}
                          {person.detentionCenter.name} (
                          {person.detentionCenter.city},{' '}
                          {person.detentionCenter.state})
                        </p>
                      )}
                    </div>
                    {person.dateOfBirth && (
                      <span className="bg-gray-100 text-gray-800 text-sm px-2 py-1 rounded">
                        Age{' '}
                        {Math.floor(
                          (new Date().getTime() -
                            new Date(person.dateOfBirth).getTime()) /
                            (1000 * 60 * 60 * 24 * 365.25)
                        )}
                      </span>
                    )}
                  </div>

                  {person.lastSeenDate && (
                    <p className="text-sm text-gray-600 mb-3">
                      <span className="font-medium">
                        {config.last_seen_label || 'Detained since'}:
                      </span>{' '}
                      {new Date(person.lastSeenDate).toLocaleDateString()}
                    </p>
                  )}

                  {person.story && (
                    <div className="mb-4">
                      <p className="text-gray-700 text-sm line-clamp-3">
                        {(() => {
                          const plainText = stripHtml(person.story);
                          return (
                            plainText.substring(0, 150) +
                            (plainText.length > 150 ? '...' : '')
                          );
                        })()}
                      </p>
                    </div>
                  )}

                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-gray-600">
                        <span className="font-medium">
                          {person._count.comments}
                        </span>{' '}
                        {person._count.comments !== 1
                          ? 'supporters'
                          : 'supporter'}{' '}
                        showing solidarity
                      </div>
                    </div>

                    <Link
                      href={`/${townSlug}/${person.slug}`}
                      className="block w-full text-center bg-indigo-600 text-white px-4 py-3 rounded-md font-medium hover:bg-indigo-700 transition-colors"
                    >
                      <div className="text-base">
                        {config.view_profile_button ||
                          'View Full Story & Show Support'}
                      </div>
                      <div className="text-xs mt-1 opacity-90">
                        Read their story and leave a message of support
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
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
              {config.town_no_detainees_title ||
                'No detained individuals reported'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {replaceTextPlaceholders(
                config.town_no_detainees_text ||
                  'There are currently no detained community members from {town} in the system.',
                { town: town.name }
              )}
            </p>
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-16 bg-white rounded-lg shadow p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            {config.town_info_title || 'Want to Help?'}
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            {config.town_info_text ||
              'If you know someone who has been detained or want to show support for those already in the system, please add your voice. Community support can make a real difference in immigration proceedings.'}
          </p>
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <button className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-700">
              {config.town_info_button || 'Add Your Support'}
            </button>
            <Link
              href="/"
              className="w-full sm:w-auto inline-block border border-gray-300 text-gray-700 px-6 py-3 rounded-md font-medium hover:bg-gray-50"
            >
              {config.view_other_towns_text || 'View Other Towns'}
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <FooterWrapper
        townLayout={town.layout?.name}
        townTheme={town.theme?.name}
        townName={town.name}
      />
    </div>
  );
}
