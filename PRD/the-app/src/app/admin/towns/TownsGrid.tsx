'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminDataGrid, {
  GridColumn,
  GridAction,
} from '@/components/admin/AdminDataGrid';
import {
  BuildingOfficeIcon,
  UsersIcon,
  UserIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { deleteTown } from '@/app/actions/towns';

interface Town extends Record<string, unknown> {
  id: string;
  name: string;
  state: string;
  fullAddress: string;
  description: string | null;
  persons: Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>;
  townAccess: Array<{
    user: {
      id: string;
      username: string;
    };
  }>;
  createdAt: Date;
  updatedAt: Date;
}

interface TownsGridProps {
  initialTowns: Town[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export default function TownsGrid({
  initialTowns,
  canCreate,
  canEdit,
  canDelete,
}: TownsGridProps) {
  const router = useRouter();
  const [towns, setTowns] = useState(initialTowns);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<keyof Town>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredTowns = towns.filter(town => {
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      town.name.toLowerCase().includes(searchLower) ||
      town.state.toLowerCase().includes(searchLower) ||
      town.fullAddress.toLowerCase().includes(searchLower) ||
      town.description?.toLowerCase().includes(searchLower)
    );
  });

  const sortedTowns = [...filteredTowns].sort((a, b) => {
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
    setSortKey(key as keyof Town);
    setSortDirection(direction);
  }, []);

  const handleDeleteTown = useCallback(
    async (town: Town) => {
      if (town.persons.length > 0) {
        alert(
          `Cannot delete town "${town.name}" because it has ${town.persons.length} person(s) associated with it.`
        );
        return;
      }

      if (
        !confirm(`Are you sure you want to delete the town "${town.name}"?`)
      ) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const result = await deleteTown(town.id);

        if (result.success) {
          setTowns(prev => prev.filter(t => t.id !== town.id));
          router.refresh();
        } else {
          setError(result.errors?._form?.[0] || 'Failed to delete town');
        }
      } catch {
        setError('Failed to delete town');
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const columns: GridColumn<Town>[] = [
    {
      key: 'name',
      label: 'Town',
      sortable: true,
      searchable: true,
      render: (value, record) => (
        <div className="flex items-center">
          <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-2" />
          <div>
            <div className="text-sm font-medium text-gray-900">
              {String(value)}
            </div>
            <div className="text-sm text-gray-500">{record.state}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'fullAddress',
      label: 'Address',
      render: value => (
        <div className="flex items-center">
          <MapPinIcon className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-sm text-gray-900">{String(value)}</span>
        </div>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: value => (
        <div className="text-sm text-gray-900 max-w-xs truncate">
          {String(value || '—')}
        </div>
      ),
    },
    {
      key: 'persons',
      label: 'Persons',
      render: (value, record) => (
        <div className="flex items-center">
          <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-sm text-gray-900">{record.persons.length}</span>
        </div>
      ),
    },
    {
      key: 'townAccess',
      label: 'Admins',
      render: (value, record) => (
        <div className="flex items-center">
          <UsersIcon className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-sm text-gray-900">
            {record.townAccess.length}
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

  const actions: GridAction<Town>[] = [
    {
      type: 'view',
      label: 'View Town',
      href: town => `/towns/${town.id}`,
    },
    {
      type: 'edit',
      label: 'Edit Town',
      href: town => `/admin/towns/${town.id}/edit`,
      show: () => canEdit,
    },
    {
      type: 'delete',
      label: 'Delete Town',
      onClick: handleDeleteTown,
      show: () => canDelete,
      className: 'text-red-600 hover:text-red-800',
    },
  ];

  return (
    <AdminDataGrid<Town>
      data={sortedTowns}
      columns={columns}
      actions={actions}
      title="Towns"
      loading={loading}
      error={error}
      onRefresh={handleRefresh}
      onSearch={handleSearch}
      onSort={handleSort}
      createUrl="/admin/towns/new"
      createLabel="Create Town"
      showCreate={canCreate}
      searchQuery={searchQuery}
      sortKey={String(sortKey)}
      sortDirection={sortDirection}
      emptyMessage="No towns found"
    />
  );
}
