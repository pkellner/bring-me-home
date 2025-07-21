'use client';

import Link from 'next/link';
import { performSignOut } from '@/lib/signout';

interface User {
  firstName?: string;
  username: string;
  roles?: Array<{
    name: string;
  }>;
}

interface HeaderNavigationProps {
  user: User | null;
}

export default function HeaderNavigation({ user }: HeaderNavigationProps) {
  const handleSignOut = () => {
    performSignOut();
  };

  const isAdmin = user?.roles?.some(role =>
    ['site-admin', 'town-admin', 'person-admin'].includes(role.name)
  );

  return (
    <nav className="flex items-center space-x-2 sm:space-x-4">
      {user ? (
        <>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <span className="hidden sm:inline text-sm text-gray-700">
              Welcome, {user.firstName || user.username}
            </span>
            <Link
              href="/profile"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              My Profile
            </Link>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Sign Out
            </button>
          </div>
          {isAdmin && (
            <Link
              href="/admin"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
            >
              Admin Panel
            </Link>
          )}
        </>
      ) : (
        <>
          <Link
            href="/auth/signin"
            className="text-sm text-gray-700 hover:text-gray-900 font-medium"
          >
            Login
          </Link>
          <Link
            href="/auth/register"
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
          >
            Register
          </Link>
        </>
      )}
    </nav>
  );
}
