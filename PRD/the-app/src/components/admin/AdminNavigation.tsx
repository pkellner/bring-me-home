'use client';

import { Session } from 'next-auth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { hasPermission, hasRole } from '@/lib/permissions';
import { performSignOut } from '@/lib/signout';
import {
  BuildingLibraryIcon,
  BuildingOfficeIcon,
  ChatBubbleLeftRightIcon,
  CogIcon,
  HomeIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  SwatchIcon,
  UserIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

const iconMap = {
  home: HomeIcon,
  users: UsersIcon,
  buildings: BuildingOfficeIcon,
  user: UserIcon,
  chat: ChatBubbleLeftRightIcon,
  cog: CogIcon,
  shield: ShieldCheckIcon,
  layouts: Squares2X2Icon,
  themes: SwatchIcon,
  detentionCenters: BuildingLibraryIcon,
};

interface AdminNavigationProps {
  session: Session;
}

export default function AdminNavigation({ session }: AdminNavigationProps) {
  const pathname = usePathname();

  // Handle signout with forced redirect
  const handleSignOut = () => {
    performSignOut();
  };

  // Determine user role type for custom menu handling
  const isSiteAdminUser = hasRole(session, 'site-admin');
  const isTownAdminUser = hasRole(session, 'town-admin');

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: 'home' as keyof typeof iconMap,
      show: true,
    },
    {
      name: 'Users',
      href: '/admin/users',
      icon: 'users' as keyof typeof iconMap,
      show: hasPermission(session, 'users', 'read'),
      disabled: false,
    },
    {
      name: 'Roles',
      href: '/admin/roles',
      icon: 'shield' as keyof typeof iconMap,
      show: isSiteAdminUser, // Only site admins can manage roles
      disabled: false,
    },
    {
      name: 'Towns',
      href: '/admin/towns',
      icon: 'buildings' as keyof typeof iconMap,
      show: isSiteAdminUser || isTownAdminUser,
      disabled: false,
    },
    {
      name: 'Persons',
      href: '/admin/persons',
      icon: 'user' as keyof typeof iconMap,
      show: hasPermission(session, 'persons', 'read'),
      disabled: false,
    },
    {
      name: 'Detention Centers',
      href: '/admin/detention-centers',
      icon: 'detentionCenters' as keyof typeof iconMap,
      show: hasPermission(session, 'detentionCenters', 'read') || isSiteAdminUser,
      disabled: !isSiteAdminUser && !hasPermission(session, 'detentionCenters', 'read'),
    },
    {
      name: 'Comments',
      href: '/admin/comments',
      icon: 'chat' as keyof typeof iconMap,
      show: hasPermission(session, 'comments', 'read'),
      disabled: false,
    },
    {
      name: 'Layouts',
      href: '/admin/layouts',
      icon: 'layouts' as keyof typeof iconMap,
      show: isSiteAdminUser, // Only site admins should manage layouts
      disabled: false,
    },
    {
      name: 'Themes',
      href: '/admin/themes',
      icon: 'themes' as keyof typeof iconMap,
      show: isSiteAdminUser, // Only site admins should manage themes
      disabled: false,
    },
    {
      name: 'System',
      href: '/admin/system',
      icon: 'cog' as keyof typeof iconMap,
      show: isSiteAdminUser, // Only site admins should access system config
      disabled: false,
    },
  ];

  const visibleItems = navigationItems.filter(item => item.show);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between min-h-16 py-2 flex-wrap gap-4">
          <div className="flex flex-1 flex-wrap items-center">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/admin" className="hidden lg:block text-xl font-bold text-gray-900">
                Bring Me Home Admin
              </Link>
            </div>
            <div className="hidden sm:flex sm:flex-wrap sm:gap-2 lg:ml-6">
              {visibleItems.map(item => {
                const isActive = pathname === item.href;
                const isDisabled = 'disabled' in item && item.disabled;
                
                if (isDisabled) {
                  return (
                    <span
                      key={item.name}
                      className="inline-flex items-center px-3 py-1 my-1 border rounded-md text-sm font-medium border-gray-200 text-gray-300 cursor-not-allowed"
                      title="You don't have permission to access this section"
                    >
                      {(() => {
                        const Icon = iconMap[item.icon];
                        return <Icon className="h-4 w-4 mr-2" />;
                      })()}
                      {item.name}
                    </span>
                  );
                }
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-3 py-1 my-1 border rounded-md text-sm font-medium ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {(() => {
                      const Icon = iconMap[item.icon];
                      return <Icon className="h-4 w-4 mr-2" />;
                    })()}
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4 flex-shrink-0">
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100"
            >
              View Main Site
            </Link>
            <Link
              href="/configs"
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100"
            >
              Configs
            </Link>
            <div className="flex flex-col items-end">
              <div className="text-sm text-gray-700">
                Welcome, {session.user.firstName || session.user.username}
              </div>
              <div className="text-xs text-gray-500">
                Roles: {session.user.roles.map(role => role.name).join(', ')}
              </div>
            </div>
            <Link
              href="/profile"
              className="bg-indigo-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
            >
              My Profile
            </Link>
            <button
              onClick={handleSignOut}
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
            const isDisabled = 'disabled' in item && item.disabled;
            
            if (isDisabled) {
              return (
                <span
                  key={item.name}
                  className="block pl-3 pr-4 py-2 border-l-4 text-base font-medium border-transparent text-gray-300 cursor-not-allowed"
                  title="You don't have permission to access this section"
                >
                  <div className="flex items-center">
                    {(() => {
                      const Icon = iconMap[item.icon];
                      return <Icon className="h-4 w-4 mr-2" />;
                    })()}
                    {item.name}
                  </div>
                </span>
              );
            }
            
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
                  {(() => {
                    const Icon = iconMap[item.icon];
                    return <Icon className="h-4 w-4 mr-2" />;
                  })()}
                  {item.name}
                </div>
              </Link>
            );
          })}
          {/* Mobile User Info and Signout */}
          <div className="border-t border-gray-200 pt-3 mt-3">
            <div className="px-3 py-2">
              <div className="text-sm text-gray-700 mb-2">
                Welcome, {session.user.firstName || session.user.username}
              </div>
              <div className="text-xs text-gray-500 mb-3">
                Roles: {session.user.roles.map(role => role.name).join(', ')}
              </div>
              <Link
                href="/profile"
                className="block w-full bg-indigo-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 mb-2 text-center"
              >
                My Profile
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
