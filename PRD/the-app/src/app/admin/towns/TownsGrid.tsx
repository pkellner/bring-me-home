'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminDataGrid, {
  GridAction,
  GridColumn,
} from '@/components/admin/AdminDataGrid';
import {
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  UserIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { deleteTown, updateBulkTownVisibility } from '@/app/actions/towns';
import TownVisibilityToggle from '@/components/admin/TownVisibilityToggle';
import TownBulkActions from '@/components/admin/TownBulkActions';

interface Town extends Record<string, unknown> {
  id: string;
  name: string;
  state: string;
  fullAddress: string;
  description: string | null;
  isActive: boolean;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<keyof Town>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [groupByState, setGroupByState] = useState(true);

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

      try {
        const result = await deleteTown(town.id);

        if (result.success) {
          setTowns(prev => prev.filter(t => t.id !== town.id));
          router.refresh();
        } else {
          alert(result.errors?._form?.[0] || 'Failed to delete town');
        }
      } catch {
        alert('Failed to delete town');
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const handleTownVisibilityUpdate = useCallback(
    (townId: string, isActive: boolean) => {
      setTowns(prev =>
        prev.map(town => (town.id === townId ? { ...town, isActive } : town))
      );
    },
    []
  );

  const handleBulkVisibilityUpdate = useCallback(
    async (townIds: string[], isActive: boolean) => {
      // Optimistically update all towns
      const originalTowns = [...towns];
      setTowns(prev =>
        prev.map(town =>
          townIds.includes(town.id) ? { ...town, isActive } : town
        )
      );

      setLoading(true);
      try {
        const result = await updateBulkTownVisibility(townIds, isActive);
        if (!result.success) {
          // Rollback on failure
          setTowns(originalTowns);
          alert('Failed to update visibility');
        }
      } catch {
        // Rollback on error
        setTowns(originalTowns);
        alert('Failed to update visibility');
      } finally {
        setLoading(false);
      }
    },
    [towns]
  );

  const handleSetAllVisible = useCallback(() => {
    const townIds = filteredTowns.map(t => t.id);
    if (townIds.length > 0) {
      if (
        confirm(
          `Are you sure you want to make ${townIds.length} towns visible?`
        )
      ) {
        handleBulkVisibilityUpdate(townIds, true);
      }
    }
  }, [filteredTowns, handleBulkVisibilityUpdate]);

  const handleSetAllInvisible = useCallback(() => {
    const townIds = filteredTowns.map(t => t.id);
    if (townIds.length > 0) {
      if (
        confirm(
          `Are you sure you want to make ${townIds.length} towns invisible?`
        )
      ) {
        handleBulkVisibilityUpdate(townIds, false);
      }
    }
  }, [filteredTowns, handleBulkVisibilityUpdate]);

  const columns: GridColumn<Town>[] = [
    {
      key: 'name',
      label: 'Town',
      sortable: true,
      searchable: true,
      render: (value, record) => (
        <div className="flex items-center">
          <BuildingOfficeIcon className="h-5 w-5 text-gray-500 mr-2" />
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
          <MapPinIcon className="h-4 w-4 text-gray-500 mr-2" />
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
          <UserIcon className="h-4 w-4 text-gray-500 mr-2" />
          <span className="text-sm text-gray-900">{record.persons.length}</span>
        </div>
      ),
    },
    {
      key: 'townAccess',
      label: 'Admins',
      render: (value, record) => (
        <div className="flex items-center">
          <UsersIcon className="h-4 w-4 text-gray-500 mr-2" />
          <span className="text-sm text-gray-900">
            {record.townAccess.length}
          </span>
        </div>
      ),
    },
    {
      key: 'isActive',
      label: 'Visibility',
      render: (value, record) => (
        <TownVisibilityToggle
          townId={record.id}
          initialIsActive={record.isActive}
          onUpdate={handleTownVisibilityUpdate}
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

  // Group towns by state if enabled
  const groupedData = groupByState
    ? sortedTowns.reduce(
        (acc, town) => {
          const stateKey = town.state;
          if (!acc[stateKey]) {
            acc[stateKey] = [];
          }
          acc[stateKey].push(town);
          return acc;
        },
        {} as Record<string, Town[]>
      )
    : { 'All Towns': sortedTowns };

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search towns..."
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-600 focus:outline-none focus:placeholder-gray-600 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      <TownBulkActions
        onSetAllVisible={handleSetAllVisible}
        onSetAllInvisible={handleSetAllInvisible}
        groupByState={groupByState}
        onGroupByStateChange={setGroupByState}
        disabled={loading}
      />

      {groupByState ? (
        <div className="space-y-6">
          {Object.entries(groupedData).map(([stateName, stateTowns]) => (
            <div key={stateName} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {stateName}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const stateTownIds = stateTowns.map(t => t.id);
                      if (
                        confirm(
                          `Make all ${stateTownIds.length} towns in ${stateName} visible?`
                        )
                      ) {
                        handleBulkVisibilityUpdate(stateTownIds, true);
                      }
                    }}
                    className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-md hover:bg-green-200"
                  >
                    Set All Visible
                  </button>
                  <button
                    onClick={() => {
                      const stateTownIds = stateTowns.map(t => t.id);
                      if (
                        confirm(
                          `Make all ${stateTownIds.length} towns in ${stateName} invisible?`
                        )
                      ) {
                        handleBulkVisibilityUpdate(stateTownIds, false);
                      }
                    }}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
                  >
                    Set All Invisible
                  </button>
                </div>
              </div>
              <AdminDataGrid<Town>
                data={stateTowns}
                columns={columns}
                actions={actions}
                title=""
                loading={loading}
                onRefresh={handleRefresh}
                onSort={handleSort}
                createUrl="/admin/towns/new"
                createLabel="Create Town"
                showCreate={false}
                sortKey={String(sortKey)}
                sortDirection={sortDirection}
                emptyMessage="No towns found"
              />
            </div>
          ))}
        </div>
      ) : (
        <AdminDataGrid<Town>
          data={sortedTowns}
          columns={columns}
          actions={actions}
          title="Towns"
          loading={loading}
          onRefresh={handleRefresh}
          onSort={handleSort}
          createUrl="/admin/towns/new"
          createLabel="Create Town"
          showCreate={canCreate}
          sortKey={String(sortKey)}
          sortDirection={sortDirection}
          emptyMessage="No towns found"
        />
      )}
    </div>
  );
}
