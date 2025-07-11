import { getServerSession } from 'next-auth';
import { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission, hasRole } from '@/lib/permissions';
import DashboardCard from '@/components/admin/DashboardCard';
import Link from 'next/link';
import {
  BuildingOfficeIcon,
  UserIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { getSiteTextConfig } from '@/lib/config';

interface TownAccess {
  id: string;
  townId: string;
  town: {
    id: string;
    name: string;
    state: string;
  };
  accessLevel: string;
}

interface PersonAccess {
  id: string;
  personId: string;
  person: {
    id: string;
    firstName: string;
    lastName: string;
  };
  accessLevel: string;
}

async function getDashboardStats(session: Session | null) {
  const isSiteAdmin = hasRole(session, 'site-admin');
  const isTownAdmin = hasRole(session, 'town-admin');
  const isPersonAdmin = hasRole(session, 'person-admin');

  // Get accessible town IDs for town admins
  const accessibleTownIds = session?.user?.townAccess?.map((ta: TownAccess) => ta.townId) || [];
  
  // Get accessible person IDs for person admins
  const accessiblePersonIds = session?.user?.personAccess?.map((pa: PersonAccess) => pa.personId) || [];

  const [userCount, townCount, personCount, commentCount] = await Promise.all([
    // User count - only for those who can read users
    hasPermission(session, 'users', 'read') ? prisma.user.count() : 0,
    
    // Town count - filtered for town admins
    isSiteAdmin 
      ? prisma.town.count()
      : isTownAdmin && accessibleTownIds.length > 0
      ? prisma.town.count({ where: { id: { in: accessibleTownIds } } })
      : hasPermission(session, 'towns', 'read')
      ? prisma.town.count()
      : 0,
    
    // Person count - filtered for town/person admins
    isSiteAdmin
      ? prisma.person.count()
      : isTownAdmin && accessibleTownIds.length > 0
      ? prisma.person.count({ where: { townId: { in: accessibleTownIds } } })
      : isPersonAdmin && accessiblePersonIds.length > 0
      ? prisma.person.count({ where: { id: { in: accessiblePersonIds } } })
      : hasPermission(session, 'persons', 'read')
      ? prisma.person.count()
      : 0,
    
    // Comment count - filtered for town/person admins
    isSiteAdmin
      ? prisma.comment.count()
      : isTownAdmin && accessibleTownIds.length > 0
      ? prisma.comment.count({ 
          where: { person: { townId: { in: accessibleTownIds } } } 
        })
      : isPersonAdmin && accessiblePersonIds.length > 0
      ? prisma.comment.count({ where: { personId: { in: accessiblePersonIds } } })
      : hasPermission(session, 'comments', 'read')
      ? prisma.comment.count()
      : 0,
  ]);

  return {
    userCount,
    townCount,
    personCount,
    commentCount,
  };
}

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  const stats = await getDashboardStats(session);
  const config = await getSiteTextConfig();

  const isTownAdmin = hasRole(session, 'town-admin');
  const isPersonAdmin = hasRole(session, 'person-admin');

  const dashboardCards = [
    {
      name: 'Total Users',
      value: stats.userCount,
      icon: 'users' as const,
      show: hasPermission(session, 'users', 'read'),
      href: '/admin/users',
    },
    {
      name: isTownAdmin ? 'Your Towns' : 'Towns',
      value: stats.townCount,
      icon: 'buildings' as const,
      show: hasPermission(session, 'towns', 'read') || isTownAdmin,
      href: '/admin/towns',
    },
    {
      name: isPersonAdmin 
        ? 'Your Assigned Persons' 
        : isTownAdmin 
        ? `Persons in Your Towns`
        : config.admin_detained_persons_title || 'Detained Persons',
      value: stats.personCount,
      icon: 'user' as const,
      show: hasPermission(session, 'persons', 'read'),
      href: '/admin/persons',
    },
    {
      name: 'Comments',
      value: stats.commentCount,
      icon: 'chat' as const,
      show: hasPermission(session, 'comments', 'read'),
      href: '/admin/comments',
    },
  ];

  const visibleCards = dashboardCards.filter(card => card.show);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Welcome back, {session?.user?.firstName || session?.user?.username}
        </p>
      </div>

      {/* Role Information */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Your Access
          </h3>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Roles:</span>{' '}
              {session?.user?.roles?.map(role => role.name).join(', ')}
            </div>
            {session?.user?.townAccess &&
              session.user.townAccess.length > 0 && (
                <div>
                  <span className="font-medium">Town Access:</span>{' '}
                  {session.user.townAccess
                    .map(
                      access => `${access.town.name} (${access.accessLevel})`
                    )
                    .join(', ')}
                </div>
              )}
            {session?.user?.personAccess &&
              session.user.personAccess.length > 0 && (
                <div>
                  <span className="font-medium">Person Access:</span>{' '}
                  {session.user.personAccess
                    .map(
                      access =>
                        `${access.person.firstName} ${access.person.lastName} (${access.accessLevel})`
                    )
                    .join(', ')}
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {visibleCards.map(card => (
          <DashboardCard
            key={card.name}
            name={card.name}
            value={card.value}
            icon={card.icon}
            href={card.href}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hasPermission(session, 'users', 'create') && (
              <Link
                href="/admin/users/new"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <UsersIcon className="h-4 w-4 mr-2" />
                Create New User
              </Link>
            )}
            {hasPermission(session, 'towns', 'create') && (
              <Link
                href="/admin/towns/new"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                Add New Town
              </Link>
            )}
            {hasPermission(session, 'persons', 'create') && (
              <Link
                href="/admin/persons/new"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <UserIcon className="h-4 w-4 mr-2" />
                {config.admin_add_person_button || 'Add Detained Person'}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {hasRole(session, 'site-admin') && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Recent Activity
            </h3>
            <p className="text-sm text-gray-500">
              Recent activity log would be displayed here. This feature will be
              implemented in a future phase.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
