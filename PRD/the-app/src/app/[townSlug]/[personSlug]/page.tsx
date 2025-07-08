import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import CommentSection from '@/components/person/CommentSection';
import PersonGallery from '@/components/person/PersonGallery';
import ShareButtons from '@/components/ShareButtons';

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
        select: {
          id: true,
          name: true,
          state: true,
        },
      },
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

  return person;
}

export default async function PersonPage({ params }: PersonPageProps) {
  const { townSlug, personSlug } = await params;
  const person = await getPersonData(townSlug, personSlug);
  const session = await getServerSession(authOptions);

  if (!person) {
    notFound();
  }

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Left Column - Person Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Person Header */}
            <div className="bg-white shadow rounded-lg mb-8">
              <div className="p-6">
                <div className="sm:flex sm:items-center sm:justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      {person.firstName} {person.lastName}
                    </h1>
                    <p className="mt-1 text-lg text-gray-600">
                      {person.town.name}, {person.town.state}
                    </p>
                  </div>
                  <div className="mt-4 sm:mt-0">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        person.status === 'missing'
                          ? 'bg-red-100 text-red-800'
                          : person.status === 'found'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {person.status.charAt(0).toUpperCase() +
                        person.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Person Details */}
            <div className="bg-white shadow rounded-lg mb-8">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Details
                </h2>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {person.dateOfBirth && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Age</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {Math.floor(
                          (new Date().getTime() -
                            new Date(person.dateOfBirth).getTime()) /
                            (1000 * 60 * 60 * 24 * 365.25)
                        )}
                      </dd>
                    </div>
                  )}
                  {person.lastSeenDate && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Last Seen
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {formatDate(person.lastSeenDate)}
                      </dd>
                    </div>
                  )}
                  {person.lastSeenLocation && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Last Seen Location
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {person.lastSeenLocation}
                      </dd>
                    </div>
                  )}
                  {person.height && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Height
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {person.height}
                      </dd>
                    </div>
                  )}
                  {person.weight && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Weight
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {person.weight}
                      </dd>
                    </div>
                  )}
                  {person.eyeColor && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Eye Color
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {person.eyeColor}
                      </dd>
                    </div>
                  )}
                  {person.hairColor && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Hair Color
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {person.hairColor}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Description/Story */}
            {person.story && (
              <div className="bg-white shadow rounded-lg mb-8">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Story
                  </h2>
                  <div className="prose max-w-none text-gray-700">
                    {person.story.split('\n').map((paragraph, index) => (
                      <p key={index} className="mb-4 last:mb-0">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Images */}
            <PersonGallery
              images={person.personImages}
              personName={`${person.firstName} ${person.lastName}`}
              personId={person.id}
              canUpload={!!session}
            />

            {/* Comments Section */}
            <CommentSection
              personId={person.id}
              comments={person.comments}
              isAuthenticated={!!session}
            />
          </div>

          {/* Right Column - Sidebar */}
          <div className="mt-8 lg:mt-0 space-y-6">
            {/* Contact Information */}
            <div className="bg-white shadow rounded-lg mb-6">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Have Information?
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  If you have any information about {person.firstName}, please
                  share it below or contact local authorities.
                </p>
                <div className="space-y-3">
                  <a
                    href="#comments"
                    className="block w-full bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 text-center"
                  >
                    Share Information
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white shadow rounded-lg mb-6">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Case Information
                </h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Days Missing
                    </dt>
                    <dd className="mt-1 text-2xl font-semibold text-gray-900">
                      {person.lastSeenDate
                        ? Math.floor(
                            (new Date().getTime() -
                              new Date(person.lastSeenDate).getTime()) /
                              (1000 * 60 * 60 * 24)
                          )
                        : 'Unknown'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Comments
                    </dt>
                    <dd className="mt-1 text-2xl font-semibold text-gray-900">
                      {person.comments.length}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Last Updated
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatDate(person.updatedAt)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Share */}
            <div className="bg-white shadow rounded-lg">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Share This Profile
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Help spread the word about {person.firstName} by sharing this
                  profile.
                </p>
                <ShareButtons
                  url={`${process.env.NEXT_PUBLIC_APP_URL || ''}/${townSlug}/${personSlug}`}
                  title={`Help find ${person.firstName} ${person.lastName}`}
                  description={`${person.firstName} ${person.lastName} from ${person.town.name}, ${person.town.state} needs your help. Share this profile to spread awareness.`}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-16">
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
