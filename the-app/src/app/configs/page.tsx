import { getPublicConfig } from '@/app/actions/config';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import HealthCheckSection from '@/components/configs/HealthCheckSection';

export default async function ConfigsPage() {
  const config = await getPublicConfig();
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === 'site_admin';

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">System Configuration</h1>
      
      {/* Debug info - remove this after testing */}
      <div className="mb-4 p-4 bg-yellow-50 rounded text-sm">
        <p>Debug Info:</p>
        <p>Logged in: {session ? 'Yes' : 'No'}</p>
        <p>User role: {session?.user?.role || 'No role'}</p>
        <p>Is Admin: {isAdmin ? 'Yes' : 'No'}</p>
        <p>Config has redis key: {'redis' in config ? 'Yes' : 'No'}</p>
      </div>
      
      {/* Build Information */}
      <section className="mb-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Build Information</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Version</dt>
            <dd className="mt-1 text-sm text-gray-900">{config.releaseVersion}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Build Date</dt>
            <dd className="mt-1 text-sm text-gray-900">{config.releaseDate}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Build Date ISO</dt>
            <dd className="mt-1 text-sm text-gray-900">{config.releaseDateISO}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Environment</dt>
            <dd className="mt-1 text-sm text-gray-900">{config.environment}</dd>
          </div>
        </dl>
      </section>

      {/* Feature Flags */}
      <section className="mb-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Feature Flags</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(config.features).map(([key, value]) => (
            <div key={key}>
              <dt className="text-sm font-medium text-gray-500">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </dt>
              <dd className="mt-1 text-sm">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {value ? 'Enabled' : 'Disabled'}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Public Configuration */}
      <section className="mb-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Public Configuration</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">GitHub Repository</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {config.githubRepo !== 'Not configured' ? (
                <a href={config.githubRepo} target="_blank" rel="noopener noreferrer" 
                   className="text-blue-600 hover:text-blue-800 underline">
                  {config.githubRepo}
                </a>
              ) : (
                'Not configured'
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Node Version</dt>
            <dd className="mt-1 text-sm text-gray-900">{config.nodeVersion}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Timezone</dt>
            <dd className="mt-1 text-sm text-gray-900">{config.timezone}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Max Upload Size</dt>
            <dd className="mt-1 text-sm text-gray-900">{config.imageConfig.uploadMaxSizeMB}MB</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Max Storage Size</dt>
            <dd className="mt-1 text-sm text-gray-900">{config.imageConfig.storageMaxSizeKB}KB</dd>
          </div>
        </dl>
      </section>

      {/* Admin-only sections */}
      {isAdmin && 'redis' in config && (
        <>
          {/* Redis Configuration */}
          <section className="mb-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Redis Configuration (Admin Only)</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Host</dt>
                <dd className="mt-1 text-sm text-gray-900">{config.redis.host}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Port</dt>
                <dd className="mt-1 text-sm text-gray-900">{config.redis.port}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    config.redis.configured ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {config.redis.configured ? 'Configured' : 'Not Configured'}
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          {/* reCAPTCHA Configuration */}
          <section className="mb-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">reCAPTCHA Configuration (Admin Only)</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Site Key</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono text-xs">
                  {config.recaptcha.siteKey}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    config.recaptcha.configured ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {config.recaptcha.configured ? 'Configured' : 'Not Configured'}
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          {/* System Authentication */}
          <section className="mb-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">System Authentication (Admin Only)</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Override Authentication</dt>
                <dd className="mt-1 text-sm">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    config.systemAuth.overrideConfigured ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {config.systemAuth.overrideConfigured ? 'Configured' : 'Not Configured'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Site Block</dt>
                <dd className="mt-1 text-sm">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    config.systemAuth.siteBlockConfigured ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {config.systemAuth.siteBlockConfigured ? 'Active' : 'Inactive'}
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          {/* Navigation Defaults */}
          <section className="mb-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Navigation Defaults (Admin Only)</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Default Town</dt>
                <dd className="mt-1 text-sm text-gray-900">{config.navigationDefaults.townDefault}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Default User</dt>
                <dd className="mt-1 text-sm text-gray-900">{config.navigationDefaults.userDefault}</dd>
              </div>
            </dl>
          </section>

          {/* Health Checks */}
          <HealthCheckSection />
        </>
      )}
    </div>
  );
}