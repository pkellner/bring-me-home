'use client';

import Link from '@/components/OptimizedLink';
import { useEnvironment } from '@/contexts/EnvironmentContext';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { updateSystemDefaults } from '@/app/actions/systemConfig';

interface FooterProps {
  townTheme?: string | null;
  townName?: string | null;
  personTheme?: string | null;
  copyrightText?: string;
}

export default function Footer({
  townTheme,
  townName,
  personTheme,
  copyrightText,
}: FooterProps) {
  const { env } = useEnvironment();
  const { data: session } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [systemTheme, setSystemTheme] = useState<string>('');

  useEffect(() => {
    if (env) {
      setSystemTheme(env.systemDefaultTheme);
    }
  }, [env]);

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

  const handleSaveDefaults = async () => {
    const result = await updateSystemDefaults('grid', systemTheme); // 'grid' is ignored now
    if (result.success) {
      setIsEditing(false);
      // Refresh the page to show the new defaults
      window.location.reload();
    } else {
      alert(result.error || 'Failed to update system defaults');
    }
  };

  const currentTheme = personTheme || townTheme || systemTheme || 'default';

  return (
    <footer className="bg-gray-800 text-white">
      <div className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-4">
          {/* Theme Info */}
          <div className="text-center">
            <div className="text-sm text-gray-400 space-x-4">
              {isEditing && isAdmin ? (
                <div className="inline-flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span>Theme:</span>
                    <select
                      value={systemTheme}
                      onChange={e => setSystemTheme(e.target.value)}
                      className="text-gray-900 px-2 py-1 rounded text-xs"
                    >
                      <option value="default">Default</option>
                      <option value="ocean">Ocean</option>
                      <option value="forest">Forest</option>
                      <option value="sunset">Sunset</option>
                      <option value="night">Night</option>
                      <option value="warm">Warm</option>
                      <option value="cool">Cool</option>
                      <option value="earth">Earth</option>
                      <option value="sky">Sky</option>
                    </select>
                  </div>
                  <button
                    onClick={handleSaveDefaults}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <span>
                    Theme: <span className="font-mono">{currentTheme}</span>
                    {personTheme && ' (person)'}
                    {!personTheme && townTheme && ' (town)'}
                  </span>
                  {townName && (
                    <>
                      <span className="text-gray-600">|</span>
                      <span>Town: {townName}</span>
                    </>
                  )}
                  {isAdmin && !isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="ml-2 text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      (edit system defaults)
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Copyright and Links */}
          <div className="text-center">
            <p className="text-sm text-gray-400">
              {copyrightText ||
                '© 2024 Bring Me Home. Together, we can bring our loved ones home.'}
            </p>
            <div className="mt-4 space-x-4">
              <Link
                href="/learn-more"
                className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
              >
                Learn More
              </Link>
              <span className="text-gray-600">|</span>
              <Link
                href="/code-of-conduct"
                className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
              >
                Code of Conduct
              </Link>
              <span className="text-gray-600">|</span>
              <Link
                href="/privacy-policy"
                className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
              >
                Privacy Policy
              </Link>
              <span className="text-gray-600">|</span>
              <Link
                href="/configs"
                className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
              >
                System Configuration
              </Link>
              <span className="text-gray-600">|</span>
              <Link
                href={session ? "/admin" : "/auth/signin"}
                className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
              >
                Admin
              </Link>
              {isAdmin && (
                <>
                  <span className="text-gray-600">|</span>
                  <Link
                    href="/admin/themes"
                    className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
                  >
                    Manage Themes
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}