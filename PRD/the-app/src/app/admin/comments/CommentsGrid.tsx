'use client';

import { useState, useCallback, useTransition, memo } from 'react';
import { useRouter } from 'next/navigation';
import AdminDataGrid, {
  GridColumn,
  GridAction,
} from '@/components/admin/AdminDataGrid';
import CommentStatusToggle from '@/components/admin/CommentStatusToggle';
import { UserIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface Comment extends Record<string, unknown> {
  id: string;
  content: string;
  type: string;
  visibility: string;
  familyVisibilityOverride: string | null;
  isActive: boolean;
  isApproved: boolean;
  moderatorNotes: string | null;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    town: {
      name: string;
      state: string;
    };
  };
  authorId: string | null;
  author?: {
    id: string;
    username: string;
    email: string | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CommentsGridProps {
  initialComments: Comment[];
  canApprove: boolean;
  canDelete: boolean;
}

function CommentsGrid({
  initialComments,
  canApprove,
  canDelete,
}: CommentsGridProps) {
  const router = useRouter();
  const [comments, setComments] = useState(initialComments);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<keyof Comment>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'pending' | 'approved'
  >('all');
  const [isPending, startTransition] = useTransition();

  const filteredComments = comments.filter(comment => {
    if (!searchQuery && filterStatus === 'all') return true;

    // Apply status filter
    let statusMatch = true;
    if (filterStatus === 'pending') statusMatch = !comment.isApproved;
    if (filterStatus === 'approved') statusMatch = comment.isApproved;

    if (!statusMatch) return false;

    // Apply search filter
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      comment.content.toLowerCase().includes(searchLower) ||
      comment.author?.username?.toLowerCase().includes(searchLower) ||
      comment.author?.email?.toLowerCase().includes(searchLower) ||
      comment.person.firstName.toLowerCase().includes(searchLower) ||
      comment.person.lastName.toLowerCase().includes(searchLower) ||
      comment.person.town.name.toLowerCase().includes(searchLower) ||
      comment.visibility.toLowerCase().includes(searchLower) ||
      comment.type.toLowerCase().includes(searchLower)
    );
  });

  const sortedComments = [...filteredComments].sort((a, b) => {
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
    setSortKey(key as keyof Comment);
    setSortDirection(direction);
  }, []);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
  }, []);

  const handleStatusUpdate = useCallback(
    (commentId: string, newStatus: boolean) => {
      setComments(prev =>
        prev.map(comment =>
          comment.id === commentId
            ? { ...comment, isApproved: newStatus }
            : comment
        )
      );
    },
    []
  );

  const handleDeleteComment = useCallback(async (comment: Comment) => {
    if (!confirm(`Are you sure you want to delete this comment?`)) {
      return;
    }

    setError('');

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/comments/${comment.id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setComments(prev => prev.filter(c => c.id !== comment.id));
        } else {
          const data = await response.json();
          setError(data.error || 'Failed to delete comment');
        }
      } catch {
        setError('Failed to delete comment');
      }
    });
  }, []);

  const columns: GridColumn<Comment>[] = [
    {
      key: 'author',
      label: 'Author',
      render: (value, record) => (
        <div className="flex items-center">
          <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
          <div>
            <div className="text-sm font-medium text-gray-900">
              {record.author?.username || 'System'}
            </div>
            {record.author?.email && (
              <div className="text-sm text-gray-500">
                {record.author.email}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'person',
      label: 'Person',
      render: value => {
        const person = value as Comment['person'];
        return (
          <div className="flex items-center">
            <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
            <div>
              <div className="text-sm font-medium text-gray-900">
                {person.firstName} {person.lastName}
              </div>
              <div className="text-sm text-gray-500">
                {person.town.name}, {person.town.state}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'content',
      label: 'Comment',
      render: value => (
        <div className="flex items-start">
          <DocumentTextIcon className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
          <div className="text-sm text-gray-900 max-w-xs">
            <div className="truncate">{String(value)}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: value => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            value === 'general'
              ? 'bg-gray-100 text-gray-800'
              : value === 'update'
                ? 'bg-blue-100 text-blue-800'
                : value === 'legal'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {String(value).charAt(0).toUpperCase() + String(value).slice(1)}
        </span>
      ),
    },
    {
      key: 'visibility',
      label: 'Visibility',
      render: value => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            value === 'public'
              ? 'bg-green-100 text-green-800'
              : value === 'supporters'
                ? 'bg-blue-100 text-blue-800'
                : value === 'family'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
          }`}
        >
          {String(value).charAt(0).toUpperCase() + String(value).slice(1)}
        </span>
      ),
    },
    {
      key: 'isApproved',
      label: 'Status',
      sortable: true,
      render: (value, record) => (
        <CommentStatusToggle
          commentId={record.id}
          initialIsApproved={value as boolean}
          canApprove={canApprove}
          onError={handleError}
          onSuccess={handleStatusUpdate}
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

  const actions: GridAction<Comment>[] = [
    {
      type: 'view',
      label: 'View Comment',
      href: comment => `/persons/${comment.person.id}#comment-${comment.id}`,
    },
    {
      type: 'delete',
      label: 'Delete Comment',
      onClick: handleDeleteComment,
      show: () => canDelete,
      className: 'text-red-600 hover:text-red-800',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Status Filter */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select
            value={filterStatus}
            onChange={e =>
              setFilterStatus(e.target.value as 'all' | 'pending' | 'approved')
            }
            className="block w-32 pl-3 pr-8 py-1 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            {sortedComments.length} comment
            {sortedComments.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <AdminDataGrid<Comment>
        data={sortedComments}
        columns={columns}
        actions={actions}
        title="Comments"
        loading={isPending}
        error={error}
        onRefresh={handleRefresh}
        onSearch={handleSearch}
        onSort={handleSort}
        showCreate={false}
        searchQuery={searchQuery}
        sortKey={String(sortKey)}
        sortDirection={sortDirection}
        emptyMessage="No comments found"
      />
    </div>
  );
}

export default memo(CommentsGrid);
