'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminDataGrid, {
  GridColumn,
  GridAction,
} from '@/components/admin/AdminDataGrid';
import {
  UserIcon,
  BuildingOfficeIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

interface Person extends Record<string, unknown> {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  alienIdNumber: string | null;
  lastKnownAddress: string;
  primaryPicture: string | null;
  secondaryPic1: string | null;
  secondaryPic2: string | null;
  secondaryPic3: string | null;
  story: string | null;
  town: {
    id: string;
    name: string;
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
  createdAt: Date;
  updatedAt: Date;
}

interface PersonsGridProps {
  initialPersons: Person[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export default function PersonsGrid({
  initialPersons,
  canCreate,
  canEdit,
  canDelete,
}: PersonsGridProps) {
  const router = useRouter();
  const [persons, setPersons] = useState(initialPersons);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<keyof Person>('firstName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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

  const handleDeletePerson = useCallback(async (person: Person) => {
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
    setError('');

    try {
      const response = await fetch(`/api/admin/persons/${person.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPersons(prev => prev.filter(p => p.id !== person.id));
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete person');
      }
    } catch {
      setError('Failed to delete person');
    } finally {
      setLoading(false);
    }
  }, []);

  const columns: GridColumn<Person>[] = [
    {
      key: 'firstName',
      label: 'Person',
      sortable: true,
      searchable: true,
      render: (value, record) => (
        <div className="flex items-center">
          {record.primaryPicture ? (
            <img
              src={record.primaryPicture}
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
              {record.firstName}{' '}
              {record.middleName ? `${record.middleName} ` : ''}
              {record.lastName}
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
      key: 'primaryPicture',
      label: 'Photos',
      render: (value, record) => (
        <div className="flex items-center">
          <PhotoIcon className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-sm text-gray-900">
            {(value ? 1 : 0) +
              (record.secondaryPic1 ? 1 : 0) +
              (record.secondaryPic2 ? 1 : 0) +
              (record.secondaryPic3 ? 1 : 0)}
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
      href: person => `/persons/${person.id}`,
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

  return (
    <AdminDataGrid<Person>
      data={sortedPersons}
      columns={columns}
      actions={actions}
      title="Missing Persons"
      loading={loading}
      error={error}
      onRefresh={handleRefresh}
      onSearch={handleSearch}
      onSort={handleSort}
      createUrl="/admin/persons/new"
      createLabel="Add Person"
      showCreate={canCreate}
      searchQuery={searchQuery}
      sortKey={String(sortKey)}
      sortDirection={sortDirection}
      emptyMessage="No persons found"
    />
  );
}
