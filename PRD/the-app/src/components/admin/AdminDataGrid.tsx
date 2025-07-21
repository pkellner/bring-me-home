'use client';

import React, { memo, useCallback, useState } from 'react';
import Link from '@/components/OptimizedLink';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

export interface GridColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  sortable?: boolean;
  searchable?: boolean;
  render?: (value: T[keyof T], record: T) => React.ReactNode;
  width?: string;
  className?: string;
}

export interface GridAction<T = Record<string, unknown>> {
  type: 'view' | 'edit' | 'delete' | 'custom';
  label: string | ((record: T) => string);
  icon?:
    | React.ComponentType<{ className?: string }>
    | ((record: T) => React.ComponentType<{ className?: string }>);
  href?: (record: T) => string;
  onClick?: (record: T) => void;
  show?: (record: T) => boolean;
  className?: string | ((record: T) => string);
}

export interface AdminDataGridProps<T = Record<string, unknown>> {
  data: T[];
  columns: GridColumn<T>[];
  actions?: GridAction<T>[];
  title: string;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onSearch?: (query: string) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  createUrl?: string;
  createLabel?: string;
  showCreate?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
  searchQuery?: string;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  emptyMessage?: string;
}

function AdminDataGrid<T extends Record<string, unknown>>({
  data,
  columns,
  actions = [],
  title,
  loading = false,
  error,
  onRefresh,
  onSearch,
  onSort,
  createUrl,
  createLabel = 'Create New',
  showCreate = true,
  pagination,
  searchQuery = '',
  sortKey,
  sortDirection,
  emptyMessage = 'No records found',
}: AdminDataGridProps<T>) {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  const handleSearch = useCallback(
    (query: string) => {
      setLocalSearchQuery(query);
      onSearch?.(query);
    },
    [onSearch]
  );

  const handleSort = useCallback(
    (key: string) => {
      if (!onSort) return;

      const newDirection =
        sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
      onSort(key, newDirection);
    },
    [onSort, sortKey, sortDirection]
  );

  const getSortIcon = (key: string) => {
    if (sortKey !== key) return null;
    return sortDirection === 'asc' ? (
      <ChevronUpIcon className="h-4 w-4" />
    ) : (
      <ChevronDownIcon className="h-4 w-4" />
    );
  };

  const renderCellContent = (column: GridColumn<T>, record: T) => {
    const value = record[column.key as keyof T];

    if (column.render) {
      return column.render(value, record);
    }

    if (value === null || value === undefined) {
      return <span className="text-gray-400">—</span>;
    }

    if (typeof value === 'boolean') {
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {value ? 'Yes' : 'No'}
        </span>
      );
    }

    if (value instanceof Date) {
      return value.toLocaleDateString();
    }

    return String(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <div className="flex items-center space-x-4">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Refresh
            </button>
          )}
          {showCreate && createUrl && (
            <Link
              href={createUrl}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              {createLabel}
            </Link>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      {onSearch && (
        <div className="flex items-center space-x-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={localSearchQuery}
                onChange={e => handleSearch(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Data Grid */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {loading ? (
          <div className="px-4 py-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-sm text-gray-500">Loading...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-gray-500">{emptyMessage}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {actions.length > 0 && (
                    <th className="hidden sm:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      Actions
                    </th>
                  )}
                  {columns.map(column => (
                    <th
                      key={String(column.key)}
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                        column.width || ''
                      } ${column.className || ''}`}
                    >
                      {column.sortable && onSort ? (
                        <button
                          onClick={() => handleSort(column.key)}
                          className="group inline-flex items-center space-x-1 text-left font-medium text-gray-500 hover:text-gray-700"
                        >
                          <span>{column.label}</span>
                          {getSortIcon(column.key)}
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((record, index) => (
                  <tr
                    key={String(record.id) || index}
                    className="hover:bg-gray-50"
                  >
                    {actions.length > 0 && (
                      <td className="hidden sm:table-cell px-3 py-4 whitespace-nowrap text-left text-sm font-medium">
                        <div className="flex items-center space-x-1">
                          {actions.map((action, actionIndex) => {
                            if (action.show && !action.show(record)) {
                              return null;
                            }

                            const baseClassName = `inline-flex items-center p-1 rounded-full text-gray-400 hover:text-gray-600 ${
                              typeof action.className === 'function'
                                ? action.className(record)
                                : action.className || ''
                            }`;

                            if (action.href) {
                              return (
                                <Link
                                  key={actionIndex}
                                  href={action.href(record)}
                                  className={baseClassName}
                                  title={
                                    typeof action.label === 'function'
                                      ? action.label(record)
                                      : action.label
                                  }
                                >
                                  {action.icon ? (
                                    typeof action.icon === 'function' ? (
                                      React.createElement(
                                        (
                                          action.icon as (
                                            record: T
                                          ) => React.ComponentType<{
                                            className?: string;
                                          }>
                                        )(record),
                                        {
                                          className: 'h-4 w-4',
                                        }
                                      )
                                    ) : (
                                      React.createElement(
                                        action.icon as React.ComponentType<{
                                          className?: string;
                                        }>,
                                        {
                                          className: 'h-4 w-4',
                                        }
                                      )
                                    )
                                  ) : action.type === 'view' ? (
                                    <EyeIcon className="h-4 w-4" />
                                  ) : action.type === 'edit' ? (
                                    <PencilIcon className="h-4 w-4" />
                                  ) : action.type === 'delete' ? (
                                    <TrashIcon className="h-4 w-4" />
                                  ) : null}
                                </Link>
                              );
                            }

                            return (
                              <button
                                key={actionIndex}
                                onClick={() => action.onClick?.(record)}
                                className={baseClassName}
                                title={
                                  typeof action.label === 'function'
                                    ? action.label(record)
                                    : action.label
                                }
                              >
                                {action.icon ? (
                                  typeof action.icon === 'function' ? (
                                    React.createElement(
                                      (
                                        action.icon as (
                                          record: T
                                        ) => React.ComponentType<{
                                          className?: string;
                                        }>
                                      )(record),
                                      {
                                        className: 'h-4 w-4',
                                      }
                                    )
                                  ) : (
                                    React.createElement(
                                      action.icon as React.ComponentType<{
                                        className?: string;
                                      }>,
                                      {
                                        className: 'h-4 w-4',
                                      }
                                    )
                                  )
                                ) : action.type === 'view' ? (
                                  <EyeIcon className="h-4 w-4" />
                                ) : action.type === 'edit' ? (
                                  <PencilIcon className="h-4 w-4" />
                                ) : action.type === 'delete' ? (
                                  <TrashIcon className="h-4 w-4" />
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    )}
                    {columns.map(column => (
                      <td
                        key={String(column.key)}
                        className={`px-6 py-4 text-sm text-gray-900 ${
                          column.className || ''
                        }`}
                      >
                        {renderCellContent(column, record)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={
                pagination.page * pagination.pageSize >= pagination.total
              }
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {(pagination.page - 1) * pagination.pageSize + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(
                    pagination.page * pagination.pageSize,
                    pagination.total
                  )}
                </span>{' '}
                of <span className="font-medium">{pagination.total}</span>{' '}
                results
              </p>
              <select
                value={pagination.pageSize}
                onChange={e =>
                  pagination.onPageSizeChange(Number(e.target.value))
                }
                className="ml-4 block w-20 pl-3 pr-8 py-1 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => pagination.onPageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from(
                  { length: Math.ceil(pagination.total / pagination.pageSize) },
                  (_, i) => i + 1
                )
                  .filter(
                    page =>
                      page === 1 ||
                      page ===
                        Math.ceil(pagination.total / pagination.pageSize) ||
                      Math.abs(page - pagination.page) <= 2
                  )
                  .map((page, index, arr) => (
                    <React.Fragment key={page}>
                      {index > 0 && arr[index - 1] < page - 1 && (
                        <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                          ...
                        </span>
                      )}
                      <button
                        onClick={() => pagination.onPageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pagination.page
                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
                <button
                  onClick={() => pagination.onPageChange(pagination.page + 1)}
                  disabled={
                    pagination.page * pagination.pageSize >= pagination.total
                  }
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(AdminDataGrid) as <T extends Record<string, unknown>>(
  props: AdminDataGridProps<T>
) => React.JSX.Element;
