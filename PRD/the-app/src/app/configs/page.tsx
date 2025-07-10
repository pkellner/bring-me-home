import { getPublicConfig } from '@/app/actions/config';
import { Metadata } from 'next';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ArrowLeftIcon, CogIcon } from '@heroicons/react/24/outline';
import HealthCheckSection from '@/components/configs/HealthCheckSection';

export const metadata: Metadata = {
  title: 'System Configuration | Bring Me Home',
  description: 'Public system configuration and build information',
};

export default async function ConfigsPage() {
  const config = await getPublicConfig();
  const session = await getServerSession(authOptions);

  // Check if user is admin
  const isAdmin = session?.user?.roles?.some(role => {
    try {
      const permissions = JSON.parse(role.permissions || '{}');
      return (
        permissions.system?.includes('config') || role.name === 'site-admin'
      );
    } catch {
      return false;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Navigation Buttons */}
        <div className="mb-6 flex justify-between items-center">
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Main Site
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <CogIcon className="h-4 w-4 mr-2" />
              Admin Dashboard
            </Link>
          )}
        </div>

        <div className="bg-white shadow rounded-lg">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="flex items-center">
              <CogIcon className="h-8 w-8 text-gray-400 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  System Configuration
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Public configuration values and build information
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 space-y-8">
            {/* Build Information */}
            <section>
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Build Information
              </h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Version
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">
                      v{config.build.version}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Build Date
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {config.build.date}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Build Date (ISO)
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">
                      {config.build.dateISO}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Public Release Date
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {config.build.publicDate}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            {/* Environment Information */}
            <section>
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Environment
              </h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Mode</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          config.environment.mode === 'production'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {config.environment.mode}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Platform
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {config.environment.platform}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Node Version
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">
                      {config.environment.nodeVersion}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Timezone
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {config.environment.timezone}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            {/* Feature Flags */}
            <section>
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Feature Flags
              </h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(config.features).map(([feature, enabled]) => (
                    <div key={feature}>
                      <dt className="text-sm font-medium text-gray-500">
                        {feature.replace(/([A-Z])/g, ' $1').trim()}
                      </dt>
                      <dd className="mt-1">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            enabled
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>

            {/* Layout and Theme Configuration */}
            <section>
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Layout & Theme Configuration
              </h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      System Default Layout
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">
                      {config.layoutTheme.systemDefaultLayout}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      System Default Theme
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">
                      {config.layoutTheme.systemDefaultTheme}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">
                      Available Layouts
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <div className="flex flex-wrap gap-2 mt-2">
                        {config.layoutTheme.availableLayouts.map(layout => (
                          <span
                            key={layout}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {layout}
                          </span>
                        ))}
                      </div>
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">
                      Available Themes
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <div className="flex flex-wrap gap-2 mt-2">
                        {config.layoutTheme.availableThemes.map(theme => (
                          <span
                            key={theme}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                          >
                            {theme}
                          </span>
                        ))}
                      </div>
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            {/* Limits and Configuration */}
            <section>
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Limits & Configuration
              </h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Max File Upload Size
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {config.limits.maxFileUploadSize}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Allowed Image Types
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {config.limits.allowedImageTypes.join(', ')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Comments Per Page
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {config.limits.commentsPerPage}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Persons Per Page
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {config.limits.personsPerPage}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Max Comment Length
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {config.limits.maxCommentLength.toLocaleString()}{' '}
                      characters
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Max Story Length
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {config.limits.maxStoryLength.toLocaleString()} characters
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            {/* Application Info */}
            <section>
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Application
              </h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {config.application.name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Description
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {config.application.description}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Support Email
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <a
                        href={`mailto:${config.application.supportEmail}`}
                        className="text-indigo-600 hover:text-indigo-500"
                      >
                        {config.application.supportEmail}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Source Code
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <a
                        href={config.application.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-500"
                      >
                        GitHub Repository
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            {/* API Access */}
            <section>
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                API Access
              </h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">
                  This configuration is also available as JSON:
                </p>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 bg-gray-900 text-gray-100 px-3 py-2 rounded text-sm font-mono">
                    GET /api/configs
                  </code>
                  <a
                    href="/api/configs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700"
                  >
                    View JSON
                  </a>
                </div>
              </div>
            </section>

            {/* Health Checks */}
            {isAdmin && <HealthCheckSection />}

            {/* Footer */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  Configuration generated at:{' '}
                  {new Date(config.generated).toLocaleString()}
                </p>
                <div className="flex space-x-3">
                  <Link
                    href="/"
                    className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Main Site
                  </Link>
                  {isAdmin && (
                    <>
                      <span className="text-gray-300">|</span>
                      <Link
                        href="/admin"
                        className="text-xs text-indigo-600 hover:text-indigo-700 transition-colors"
                      >
                        Admin Dashboard
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
