'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminDataGrid, {
  GridColumn,
  GridAction,
} from '@/components/admin/AdminDataGrid';
import {
  ShieldCheckIcon,
  UsersIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';
import { deleteRole } from '@/app/actions/roles';

interface Role extends Record<string, unknown> {
  id: string;
  name: string;
  description: string | null;
  permissions: string;
  userRoles: Array<{
    user: {
      id: string;
      username: string;
    };
  }>;
  createdAt: Date;
  updatedAt: Date;
}

interface RolesGridProps {
  initialRoles: Role[];
}

export default function RolesGrid({ initialRoles }: RolesGridProps) {
  const router = useRouter();
  const [roles, setRoles] = useState(initialRoles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<keyof Role>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredRoles = roles.filter(role => {
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      role.name.toLowerCase().includes(searchLower) ||
      role.description?.toLowerCase().includes(searchLower) ||
      role.permissions.toLowerCase().includes(searchLower)
    );
  });

  const sortedRoles = [...filteredRoles].sort((a, b) => {
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
  }, [router]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleSort = useCallback((key: string, direction: 'asc' | 'desc') => {
    setSortKey(key as keyof Role);
    setSortDirection(direction);
  }, []);

  const handleDeleteRole = useCallback(
    async (role: Role) => {
      if (
        !confirm(`Are you sure you want to delete the role "${role.name}"?`)
      ) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const result = await deleteRole(role.id);

        if (result.success) {
          setRoles(prev => prev.filter(r => r.id !== role.id));
          router.refresh();
        } else {
          setError(result.errors?._form?.[0] || 'Failed to delete role');
        }
      } catch {
        setError('Failed to delete role');
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const columns: GridColumn<Role>[] = [
    {
      key: 'name',
      label: 'Role Name',
      sortable: true,
      searchable: true,
      render: (value, record) => (
        <div className="flex items-center">
          <ShieldCheckIcon className="h-5 w-5 text-gray-400 mr-2" />
          <div>
            <div className="text-sm font-medium text-gray-900">
              {String(value)}
            </div>
            {record.description && (
              <div className="text-sm text-gray-500">{record.description}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'permissions',
      label: 'Permissions',
      render: (value, record) => {
        let permissions = [];
        try {
          const permissionsString = record.permissions as string;
          if (permissionsString && typeof permissionsString === 'string') {
            permissions = JSON.parse(permissionsString);
          }
        } catch {
          permissions = [];
        }

        // Ensure permissions is an array
        if (!Array.isArray(permissions)) {
          permissions = [];
        }

        return (
          <div className="flex flex-wrap gap-1">
            {permissions.map(
              (
                permission: { resource: string; action: string },
                index: number
              ) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  <KeyIcon className="h-3 w-3 mr-1" />
                  {permission.resource}:{permission.action}
                </span>
              )
            )}
          </div>
        );
      },
    },
    {
      key: 'userRoles',
      label: 'Users',
      render: (value, record) => (
        <div className="flex items-center">
          <UsersIcon className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-sm text-gray-900">
            {record.userRoles.length}
          </span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: value => new Date(value as Date).toLocaleDateString(),
    },
  ];

  const actions: GridAction<Role>[] = [
    {
      type: 'edit',
      label: 'Edit Role',
      href: role => `/admin/roles/${role.id}/edit`,
    },
    {
      type: 'delete',
      label: 'Delete Role',
      onClick: handleDeleteRole,
      className: 'text-red-600 hover:text-red-800',
      show: role =>
        !['site-admin', 'town-admin', 'person-admin'].includes(role.name),
    },
  ];

  return (
    <AdminDataGrid<Role>
      data={sortedRoles}
      columns={columns}
      actions={actions}
      title="Roles"
      loading={loading}
      error={error}
      onRefresh={handleRefresh}
      onSearch={handleSearch}
      onSort={handleSort}
      createUrl="/admin/roles/new"
      createLabel="Create Role"
      searchQuery={searchQuery}
      sortKey={String(sortKey)}
      sortDirection={sortDirection}
      emptyMessage="No roles found"
    />
  );
}
