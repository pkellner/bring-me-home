'use client';

import { Session } from 'next-auth';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { hasRole, hasPermission } from '@/lib/permissions';
import {
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  UserIcon,
  ChatBubbleLeftRightIcon,
  CogIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

interface AdminNavigationProps {
  session: Session;
}

export default function AdminNavigation({ session }: AdminNavigationProps) {
  const pathname = usePathname();

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: HomeIcon,
      show: true,
    },
    {
      name: 'Users',
      href: '/admin/users',
      icon: UsersIcon,
      show: hasPermission(session, 'users', 'read'),
    },
    {
      name: 'Roles',
      href: '/admin/roles',
      icon: ShieldCheckIcon,
      show: hasRole(session, 'site-admin'),
    },
    {
      name: 'Towns',
      href: '/admin/towns',
      icon: BuildingOfficeIcon,
      show: hasPermission(session, 'towns', 'read'),
    },
    {
      name: 'Persons',
      href: '/admin/persons',
      icon: UserIcon,
      show: hasPermission(session, 'persons', 'read'),
    },
    {
      name: 'Comments',
      href: '/admin/comments',
      icon: ChatBubbleLeftRightIcon,
      show: hasPermission(session, 'comments', 'read'),
    },
    {
      name: 'System',
      href: '/admin/system',
      icon: CogIcon,
      show: hasPermission(session, 'system', 'config'),
    },
  ];

  const visibleItems = navigationItems.filter(item => item.show);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/admin" className="text-xl font-bold text-gray-900">
                Bring Me Home Admin
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {visibleItems.map(item => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive
                        ? 'border-indigo-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-700">
              Welcome, {session.user.firstName || session.user.username}
            </div>
            <div className="text-xs text-gray-500">
              Roles: {session.user.roles.map(role => role.name).join(', ')}
            </div>
            <button
              onClick={() => signOut()}
              className="bg-gray-800 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="sm:hidden">
        <div className="pt-2 pb-3 space-y-1">
          {visibleItems.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  isActive
                    ? 'border-indigo-500 text-indigo-700 bg-indigo-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
