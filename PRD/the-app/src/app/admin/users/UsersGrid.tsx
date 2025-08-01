'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import AdminDataGrid, {
  GridAction,
  GridColumn,
} from '@/components/admin/AdminDataGrid';
import { deleteUser, resetUserPassword } from '@/app/actions/users';
import UserStatusToggle from '@/components/admin/UserStatusToggle';
import PasswordResetModal from '@/components/admin/PasswordResetModal';
import { showSuccessAlert, showErrorAlert } from '@/lib/alertBox';
import {
  BuildingOfficeIcon,
  KeyIcon,
  ShieldCheckIcon,
  UserIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface UserRole {
  role: {
    name: string;
  };
}

interface TownAccess {
  town: {
    name: string;
  };
  accessLevel: string;
}

interface PersonAccess {
  person: {
    firstName: string;
    lastName: string;
  };
  accessLevel: string;
}

interface User extends Record<string, unknown> {
  id: string;
  username: string;
  email: string | null;
  emailVerified: Date | null;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  allowAnonymousComments: boolean;
  userRoles: UserRole[];
  townAccess: TownAccess[];
  personAccess: PersonAccess[];
  comments?: { id: string; hideRequested: boolean }[];
  createdAt: Date;
  updatedAt: Date;
}

interface UsersGridProps {
  initialUsers: User[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export default function UsersGrid({
  initialUsers,
  canCreate,
  canEdit,
  canDelete,
}: UsersGridProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<keyof User>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [resetPasswordModal, setResetPasswordModal] = useState<{
    isOpen: boolean;
    user: User | null;
  }>({ isOpen: false, user: null });

  // Sync with initialUsers when they change (e.g., after editing)
  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.firstName?.toLowerCase().includes(searchLower) ||
      user.lastName?.toLowerCase().includes(searchLower) ||
      user.userRoles.some(userRole =>
        userRole.role.name.toLowerCase().includes(searchLower)
      )
    );
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aValue = a[sortKey];
    const bValue = b[sortKey];

    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleRefresh = useCallback(() => {
    router.refresh();
    // Reset the users state to the initial users to ensure fresh data
    setUsers(initialUsers);
  }, [router, initialUsers]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleSort = useCallback((key: string, direction: 'asc' | 'desc') => {
    setSortKey(key as keyof User);
    setSortDirection(direction);
  }, []);

  const handleDeleteUser = useCallback(async (user: User) => {
    if (!confirm(`Are you sure you want to delete user "${user.username}"?`)) {
      return;
    }

    setError('');

    startTransition(async () => {
      try {
        const result = await deleteUser(user.id);

        if (result.success) {
          setUsers(prev => prev.filter(u => u.id !== user.id));
        } else {
          setError(result.error || 'Failed to delete user');
        }
      } catch {
        setError('Failed to delete user');
      }
    });
  }, []);

  const handleResetPassword = useCallback((user: User) => {
    setResetPasswordModal({ isOpen: true, user });
  }, []);

  const handlePasswordResetConfirm = useCallback(async (newPassword: string) => {
    const user = resetPasswordModal.user;
    if (!user) return;

    setError('');

    startTransition(async () => {
      try {
        const result = await resetUserPassword(user.id, newPassword);

        if (result.success) {
          showSuccessAlert(`Password reset successfully for user "${user.username}"`, 3000);
          // Refresh the page to ensure data consistency
          router.refresh();
        } else if (result.errors) {
          // Handle structured errors
          const errorMessages: string[] = [];
          Object.entries(result.errors).forEach(([, messages]) => {
            errorMessages.push(...messages);
          });
          showErrorAlert(errorMessages.join('; '), 5000);
        }
      } catch (error) {
        console.error('Password reset error:', error);
        showErrorAlert('Failed to reset password. Please try again.', 5000);
      }
    });
  }, [resetPasswordModal.user, router]);

  const handleStatusUpdate = useCallback(
    (userId: string, isActive: boolean) => {
      setUsers(prev =>
        prev.map(user =>
          user.id === userId ? { ...user, isActive } : user
        )
      );
    },
    []
  );

  const columns: GridColumn<User>[] = [
    {
      key: 'username',
      label: 'Username',
      sortable: true,
      searchable: true,
      render: (value, record) => (
        <div className="flex items-center">
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
              {String(value)}
            </div>
            {record.email && (
              <div className="text-sm text-gray-500">{record.email}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'emailVerified',
      label: 'Email Status',
      sortable: true,
      render: (value, record) => {
        if (!record.email) {
          return <span className="text-sm text-gray-400">No email</span>;
        }
        return (
          <div className="flex items-center">
            {record.emailVerified ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckCircleIcon className="h-3 w-3 mr-1" />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                Unverified
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'firstName',
      label: 'Name',
      sortable: true,
      render: (value, record) => {
        const fullName = [record.firstName, record.lastName]
          .filter(Boolean)
          .join(' ');
        return fullName || '—';
      },
    },
    {
      key: 'userRoles',
      label: 'Roles',
      render: (value, record) => (
        <div className="flex flex-wrap gap-1">
          {record.userRoles.map((userRole: UserRole, index: number) => (
            <span
              key={index}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
            >
              <ShieldCheckIcon className="h-3 w-3 mr-1" />
              {userRole.role.name}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'townAccess',
      label: 'Town Access',
      render: (value, record) => (
        <div className="flex flex-wrap gap-1">
          {record.townAccess.map((access: TownAccess, index: number) => (
            <span
              key={index}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
            >
              <BuildingOfficeIcon className="h-3 w-3 mr-1" />
              {access.town.name} ({access.accessLevel})
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'personAccess',
      label: 'Person Access',
      render: (value, record) => (
        <div className="flex flex-wrap gap-1">
          {record.personAccess.map((access: PersonAccess, index: number) => (
            <span
              key={index}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              <UserIcon className="h-3 w-3 mr-1" />
              {access.person.firstName} {access.person.lastName} (
              {access.accessLevel})
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'allowAnonymousComments',
      label: 'Anonymous Comments',
      sortable: true,
      render: (value, record) => (
        <div className="flex items-center">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              record.allowAnonymousComments
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {record.allowAnonymousComments ? 'Allowed' : 'Blocked'}
          </span>
        </div>
      ),
    },
    {
      key: 'comments',
      label: 'Hidden Comments',
      render: (value, record) => {
        const hiddenCount = record.comments?.filter((c) => c.hideRequested).length || 0;
        const totalCount = record.comments?.length || 0;
        
        return (
          <div className="text-sm">
            {hiddenCount > 0 ? (
              <span className="text-yellow-600 font-medium">
                {hiddenCount} hidden / {totalCount} total
              </span>
            ) : totalCount > 0 ? (
              <span className="text-gray-600">
                0 hidden / {totalCount} total
              </span>
            ) : (
              <span className="text-gray-400">No comments</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'isActive',
      label: 'Status',
      sortable: true,
      render: (value, record) => (
        <UserStatusToggle
          userId={record.id}
          initialIsActive={record.isActive}
          onUpdate={handleStatusUpdate}
        />
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: value => new Date(value as Date).toLocaleDateString(),
    },
  ];

  const actions: GridAction<User>[] = [
    {
      type: 'edit',
      label: 'Edit User',
      href: user => `/admin/users/${user.id}/edit`,
      show: () => canEdit,
    },
    {
      type: 'custom',
      label: 'View Profile',
      icon: EyeIcon,
      onClick: (user) => router.push(`/profile?userId=${user.id}`),
      show: () => canEdit,
      className: 'text-blue-600 hover:text-blue-800',
    },
    {
      type: 'custom',
      label: 'Reset Password',
      icon: KeyIcon,
      onClick: handleResetPassword,
      show: () => canEdit,
      className: 'text-yellow-600 hover:text-yellow-800',
    },
    {
      type: 'delete',
      label: 'Delete User',
      onClick: handleDeleteUser,
      show: () => canDelete,
      className: 'text-red-600 hover:text-red-800',
    },
  ];

  return (
    <>
      <AdminDataGrid<User>
        data={sortedUsers}
        columns={columns}
        actions={actions}
        title="Users"
        loading={isPending}
        error={error}
        onRefresh={handleRefresh}
        onSearch={handleSearch}
        onSort={handleSort}
        createUrl="/admin/users/new"
        createLabel="Create User"
        showCreate={canCreate}
        searchQuery={searchQuery}
        sortKey={String(sortKey)}
        sortDirection={sortDirection}
        emptyMessage="No users found"
      />
      
      {/* Password Reset Modal */}
      {resetPasswordModal.user && (
        <PasswordResetModal
          isOpen={resetPasswordModal.isOpen}
          onClose={() => setResetPasswordModal({ isOpen: false, user: null })}
          onConfirm={handlePasswordResetConfirm}
          username={resetPasswordModal.user.username}
        />
      )}
    </>
  );
}
