'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminDataGrid, {
  GridAction,
  GridColumn,
} from '@/components/admin/AdminDataGrid';
import {
  BuildingOfficeIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  UserIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import {
  deletePerson,
  updateBulkPersonVisibility,
} from '@/app/actions/persons';
import PersonVisibilityToggle from '@/components/admin/PersonVisibilityToggle';
import PersonBulkActions from '@/components/admin/PersonBulkActions';

interface Person extends Record<string, unknown> {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  alienIdNumber: string | null;
  lastKnownAddress: string;
  story: string | null;
  isActive: boolean;
  town: {
    id: string;
    name: string;
    slug: string;
    state: string;
  };
  comments: Array<{
    id: string;
    createdAt: Date;
  }>;
  personAccess: Array<{
    user: {
      id: string;
      username: string;
    };
  }>;
  personImages?: Array<{
    id: string;
    imageUrl: string;
    thumbnailUrl?: string | null;
    isPrimary: boolean;
    isActive: boolean;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

interface PersonsGridProps {
  initialPersons: Person[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isSiteAdmin: boolean;
  gridTitle?: string;
  addButtonText?: string;
}

export default function PersonsGrid({
  initialPersons,
  canCreate,
  canEdit,
  canDelete,
  isSiteAdmin,
  gridTitle = 'Detained Persons',
  addButtonText = 'Add Detained Person',
}: PersonsGridProps) {
  const router = useRouter();
  const [persons, setPersons] = useState(initialPersons);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<keyof Person>('firstName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [groupByTown, setGroupByTown] = useState(true);

  const filteredPersons = persons.filter(person => {
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      person.firstName.toLowerCase().includes(searchLower) ||
      person.middleName?.toLowerCase().includes(searchLower) ||
      person.lastName.toLowerCase().includes(searchLower) ||
      person.alienIdNumber?.toLowerCase().includes(searchLower) ||
      person.lastKnownAddress.toLowerCase().includes(searchLower) ||
      person.town.name.toLowerCase().includes(searchLower) ||
      person.town.state.toLowerCase().includes(searchLower)
    );
  });

  const sortedPersons = [...filteredPersons].sort((a, b) => {
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
    setSortKey(key as keyof Person);
    setSortDirection(direction);
  }, []);

  const handleDeletePerson = useCallback(
    async (person: Person) => {
      if (person.comments.length > 0) {
        alert(
          `Cannot delete person "${person.firstName} ${person.lastName}" because they have ${person.comments.length} comment(s) associated with them.`
        );
        return;
      }

      if (
        !confirm(
          `Are you sure you want to delete the person "${person.firstName} ${person.lastName}"?`
        )
      ) {
        return;
      }

      setLoading(true);

      try {
        const result = await deletePerson(person.id);

        if (result.success) {
          setPersons(prev => prev.filter(p => p.id !== person.id));
          router.refresh();
        } else {
          alert(result.errors?._form?.[0] || 'Failed to delete person');
        }
      } catch {
        alert('Failed to delete person');
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const handlePersonVisibilityUpdate = useCallback(
    (personId: string, isActive: boolean) => {
      setPersons(prev =>
        prev.map(person =>
          person.id === personId ? { ...person, isActive } : person
        )
      );
    },
    []
  );

  const handleBulkVisibilityUpdate = useCallback(
    async (personIds: string[], isActive: boolean) => {
      // Optimistically update all persons
      const originalPersons = [...persons];
      setPersons(prev =>
        prev.map(person =>
          personIds.includes(person.id) ? { ...person, isActive } : person
        )
      );

      setLoading(true);
      try {
        const result = await updateBulkPersonVisibility(personIds, isActive);
        if (!result.success) {
          // Rollback on failure
          setPersons(originalPersons);
          alert('Failed to update visibility');
        }
      } catch {
        // Rollback on error
        setPersons(originalPersons);
        alert('Failed to update visibility');
      } finally {
        setLoading(false);
      }
    },
    [persons]
  );

  const handleSetAllVisible = useCallback(() => {
    const personIds = filteredPersons.map(p => p.id);
    if (personIds.length > 0) {
      if (
        confirm(
          `Are you sure you want to make ${personIds.length} persons visible?`
        )
      ) {
        handleBulkVisibilityUpdate(personIds, true);
      }
    }
  }, [filteredPersons, handleBulkVisibilityUpdate]);

  const handleSetAllInvisible = useCallback(() => {
    const personIds = filteredPersons.map(p => p.id);
    if (personIds.length > 0) {
      if (
        confirm(
          `Are you sure you want to make ${personIds.length} persons invisible?`
        )
      ) {
        handleBulkVisibilityUpdate(personIds, false);
      }
    }
  }, [filteredPersons, handleBulkVisibilityUpdate]);

  const columns: GridColumn<Person>[] = [
    {
      key: 'firstName',
      label: 'Person',
      sortable: true,
      searchable: true,
      render: (value, record) => (
        <div className="flex items-center">
          {record.personImages?.find(img => img.isPrimary)?.imageUrl ? (
            <img
              src={record.personImages.find(img => img.isPrimary)!.imageUrl}
              alt={`${record.firstName} ${record.lastName}`}
              className="h-10 w-10 rounded-full object-cover mr-3"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center mr-3">
              <UserIcon className="h-6 w-6 text-gray-600" />
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-gray-900">
              {isSiteAdmin ? (
                <a
                  href={`/${
                    record.town.slug
                  }/${record.firstName.toLowerCase()}-${record.lastName.toLowerCase()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 hover:underline"
                >
                  {record.firstName}{' '}
                  {record.middleName ? `${record.middleName} ` : ''}
                  {record.lastName}
                </a>
              ) : (
                <>
                  {record.firstName}{' '}
                  {record.middleName ? `${record.middleName} ` : ''}
                  {record.lastName}
                </>
              )}
            </div>
            <div className="text-xs text-gray-400">
              {record.town.name}, {record.town.state}
            </div>
            {record.alienIdNumber && (
              <div className="text-xs text-gray-500">
                ID: {record.alienIdNumber}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'town',
      label: 'Town',
      render: (value, record) => (
        <div className="flex items-center">
          <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-2" />
          <div>
            <div className="text-sm text-gray-900">{record.town.name}</div>
            <div className="text-sm text-gray-500">{record.town.state}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'lastKnownAddress',
      label: 'Address',
      render: value => (
        <div className="text-sm text-gray-900 max-w-xs truncate">
          {String(value)}
        </div>
      ),
    },
    {
      key: 'personImages',
      label: 'Photos',
      render: (value, record) => (
        <div className="flex items-center">
          <PhotoIcon className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-sm text-gray-900">
            {(value ? 1 : 0) +
              (record.personImages?.filter(img => !img.isPrimary).length || 0)}
          </span>
        </div>
      ),
    },
    {
      key: 'comments',
      label: 'Comments',
      render: (value, record) => (
        <div className="flex items-center">
          <ChatBubbleLeftRightIcon className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-sm text-gray-900">
            {record.comments.length}
          </span>
        </div>
      ),
    },
    {
      key: 'personAccess',
      label: 'Admins',
      render: (value, record) => (
        <div className="flex items-center">
          <UsersIcon className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-sm text-gray-900">
            {record.personAccess.length}
          </span>
        </div>
      ),
    },
    {
      key: 'isActive',
      label: 'Visibility',
      render: (value, record) => (
        <PersonVisibilityToggle
          personId={record.id}
          initialIsActive={record.isActive}
          onUpdate={handlePersonVisibilityUpdate}
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

  const actions: GridAction<Person>[] = [
    {
      type: 'view',
      label: 'View Person',
      href: person => {
        const townSlug = person.town.name.toLowerCase().replace(/\s+/g, '-');
        const personSlug = `${person.firstName.toLowerCase()}-${person.lastName.toLowerCase()}`;
        return `/${townSlug}/${personSlug}`;
      },
    },
    {
      type: 'edit',
      label: 'Edit Person',
      href: person => `/admin/persons/${person.id}/edit`,
      show: () => canEdit,
    },
    {
      type: 'delete',
      label: 'Delete Person',
      onClick: handleDeletePerson,
      show: () => canDelete,
      className: 'text-red-600 hover:text-red-800',
    },
  ];

  // Group persons by town if enabled
  const groupedData = groupByTown
    ? sortedPersons.reduce(
        (acc, person) => {
          const townKey = `${person.town.name}, ${person.town.state}`;
          if (!acc[townKey]) {
            acc[townKey] = [];
          }
          acc[townKey].push(person);
          return acc;
        },
        {} as Record<string, Person[]>
      )
    : { 'All Persons': sortedPersons };

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search persons..."
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      <PersonBulkActions
        onSetAllVisible={handleSetAllVisible}
        onSetAllInvisible={handleSetAllInvisible}
        groupByTown={groupByTown}
        onGroupByTownChange={setGroupByTown}
        disabled={loading}
      />

      {groupByTown ? (
        <div className="space-y-6">
          {Object.entries(groupedData).map(([townName, townPersons]) => (
            <div key={townName} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {townName}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const townPersonIds = townPersons.map(p => p.id);
                      if (
                        confirm(
                          `Make all ${townPersonIds.length} persons in ${townName} visible?`
                        )
                      ) {
                        handleBulkVisibilityUpdate(townPersonIds, true);
                      }
                    }}
                    className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-md hover:bg-green-200"
                  >
                    Set All Visible
                  </button>
                  <button
                    onClick={() => {
                      const townPersonIds = townPersons.map(p => p.id);
                      if (
                        confirm(
                          `Make all ${townPersonIds.length} persons in ${townName} invisible?`
                        )
                      ) {
                        handleBulkVisibilityUpdate(townPersonIds, false);
                      }
                    }}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
                  >
                    Set All Invisible
                  </button>
                </div>
              </div>
              <AdminDataGrid<Person>
                data={townPersons}
                columns={columns}
                actions={actions}
                title=""
                loading={loading}
                onRefresh={handleRefresh}
                onSort={handleSort}
                createUrl="/admin/persons/new"
                createLabel={addButtonText}
                showCreate={false}
                sortKey={String(sortKey)}
                sortDirection={sortDirection}
                emptyMessage="No persons found"
              />
            </div>
          ))}
        </div>
      ) : (
        <AdminDataGrid<Person>
          data={sortedPersons}
          columns={columns}
          actions={actions}
          title={gridTitle}
          loading={loading}
          onRefresh={handleRefresh}
          onSort={handleSort}
          createUrl="/admin/persons/new"
          createLabel={addButtonText}
          showCreate={canCreate}
          sortKey={String(sortKey)}
          sortDirection={sortDirection}
          emptyMessage="No persons found"
        />
      )}
    </div>
  );
}
