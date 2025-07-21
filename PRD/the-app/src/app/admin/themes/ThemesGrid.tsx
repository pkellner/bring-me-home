'use client';

import { useState } from 'react';
import Link from '@/components/OptimizedLink';
import AdminDataGrid from '@/components/admin/AdminDataGrid';
import ThemePreview from '@/components/themes/ThemePreview';
import { deleteTheme } from '@/app/actions/themes';
import type { SanitizedTheme } from '@/types/sanitized';

interface ThemesGridProps {
  initialThemes: SanitizedTheme[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export default function ThemesGrid({
  initialThemes,
  canCreate,
  canUpdate,
  canDelete,
}: ThemesGridProps) {
  const [themes, setThemes] = useState(initialThemes);
  const [selectedTheme, setSelectedTheme] = useState<SanitizedTheme | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this theme?')) return;

    const result = await deleteTheme(id);
    if (result.success) {
      setThemes(themes.filter(theme => theme.id !== id));
      if (selectedTheme?.id === id) {
        setSelectedTheme(null);
      }
    } else {
      alert('Failed to delete theme');
    }
  };

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'description', label: 'Description' },
    {
      key: 'isActive',
      label: 'Active',
      render: (value: unknown) => (
        <span
          className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${
            value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {value ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (value: unknown) => new Date(value as Date).toLocaleDateString(),
    },
  ];

  const actions = [
    {
      type: 'view' as const,
      label: 'Preview',
      onClick: (theme: SanitizedTheme) => setSelectedTheme(theme),
    },
    ...(canUpdate
      ? [
          {
            type: 'edit' as const,
            label: 'Edit',
            href: (theme: SanitizedTheme) => `/admin/themes/${theme.id}/edit`,
          },
        ]
      : []),
    ...(canDelete
      ? [
          {
            type: 'delete' as const,
            label: 'Delete',
            onClick: async (theme: SanitizedTheme) => await handleDelete(theme.id),
            className: 'text-red-600 hover:text-red-900',
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Themes</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage color themes for missing person profiles
          </p>
        </div>
        {canCreate && (
          <Link
            href="/admin/themes/new"
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Create Theme
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AdminDataGrid
            data={themes}
            columns={columns}
            actions={actions}
            title="Themes"
            searchQuery=""
            emptyMessage="No themes found"
          />
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Preview</h2>
            {selectedTheme ? (
              <ThemePreview theme={selectedTheme} />
            ) : (
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                <p className="text-sm text-gray-500">
                  Select a theme to preview
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
