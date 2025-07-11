'use client';

import { memo, useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminDataGrid, {
  GridAction,
  GridColumn,
} from '@/components/admin/AdminDataGrid';
import CommentModerationModal from '@/components/admin/CommentModerationModal';
import CommentBulkActions from '@/components/admin/CommentBulkActions';
import CommentStatusToggle from '@/components/admin/CommentStatusToggle';
import {
  DocumentTextIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import {
  approveBulkComments,
  rejectBulkComments,
} from '@/app/actions/comments';

interface Comment extends Record<string, unknown> {
  id: string;
  content: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  occupation: string | null;
  birthdate: Date | null;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  showOccupation: boolean;
  showBirthdate: boolean;
  showCityState: boolean;
  wantsToHelpMore: boolean;
  displayNameOnly: boolean;
  requiresFamilyApproval: boolean;
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
    slug: string;
    town: {
      name: string;
      id: string;
      slug: string;
      state: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

interface Town {
  id: string;
  name: string;
  state: string;
}

interface CommentsGridProps {
  initialComments: Comment[];
  canApprove: boolean;
  canDelete: boolean;
  towns: Town[];
  personId?: string;
  isSiteAdmin: boolean;
}

function CommentsGrid({
  initialComments,
  canApprove,
  canDelete,
  towns,
  personId,
  isSiteAdmin,
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
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [isModerationModalOpen, setIsModerationModalOpen] = useState(false);
  const [groupByPerson, setGroupByPerson] = useState(true); // Default to grouped by person
  const [selectedTownId, setSelectedTownId] = useState('');

  const filteredComments = comments.filter(comment => {
    // Apply town filter
    if (selectedTownId && comment.person.town.id !== selectedTownId) {
      return false;
    }

    // Apply status filter
    let statusMatch = true;
    if (filterStatus === 'pending') statusMatch = !comment.isApproved;
    if (filterStatus === 'approved') statusMatch = comment.isApproved;

    if (!statusMatch) return false;

    // Apply search filter
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      comment.content?.toLowerCase().includes(searchLower) ||
      false ||
      comment.firstName?.toLowerCase().includes(searchLower) ||
      false ||
      comment.lastName?.toLowerCase().includes(searchLower) ||
      false ||
      comment.email?.toLowerCase().includes(searchLower) ||
      false ||
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

  const handleStatusUpdate = useCallback(
    (commentId: string, newStatus: boolean, updatedData?: Partial<Comment>) => {
      setComments(prev =>
        prev.map(comment =>
          comment.id === commentId
            ? { ...comment, isApproved: newStatus, ...updatedData }
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

  const handleModerate = useCallback((comment: Comment) => {
    setSelectedComment(comment);
    setIsModerationModalOpen(true);
  }, []);

  const handleApproveAll = useCallback(async () => {
    const pendingComments = filteredComments.filter(c => !c.isApproved);
    if (pendingComments.length === 0) {
      alert('No pending comments to approve');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to approve ${pendingComments.length} pending comments?`
      )
    ) {
      return;
    }

    setError('');
    startTransition(async () => {
      try {
        const commentIds = pendingComments.map(c => c.id);
        const result = await approveBulkComments(commentIds);

        if (result.success) {
          // Update local state
          setComments(prev =>
            prev.map(comment =>
              commentIds.includes(comment.id)
                ? { ...comment, isApproved: true }
                : comment
            )
          );
          router.refresh();
        } else {
          setError(result.error || 'Failed to approve comments');
        }
      } catch {
        setError('Failed to approve comments');
      }
    });
  }, [filteredComments, router]);

  const handleRejectAll = useCallback(async () => {
    const pendingComments = filteredComments.filter(c => !c.isApproved);
    if (pendingComments.length === 0) {
      alert('No pending comments to reject');
      return;
    }

    const reason = prompt(
      `Please provide a reason for rejecting ${pendingComments.length} comments:`
    );
    if (!reason) {
      return;
    }

    setError('');
    startTransition(async () => {
      try {
        const commentIds = pendingComments.map(c => c.id);
        const result = await rejectBulkComments(commentIds, reason);

        if (result.success) {
          // Update local state
          setComments(prev =>
            prev.map(comment =>
              commentIds.includes(comment.id)
                ? { ...comment, isApproved: false, moderatorNotes: reason }
                : comment
            )
          );
          router.refresh();
        } else {
          setError(result.error || 'Failed to reject comments');
        }
      } catch {
        setError('Failed to reject comments');
      }
    });
  }, [filteredComments, router]);

  const columns: GridColumn<Comment>[] = [
    {
      key: 'commenter',
      label: 'Commenter',
      render: (value, record) => (
        <div className="flex items-center">
          <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
          <div>
            <div className="text-sm font-medium text-gray-900">
              {record.firstName} {record.lastName}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {record.email && (
                <div className="flex items-center">
                  <EnvelopeIcon className="h-3 w-3 mr-1" />
                  <a 
                    href={`mailto:${record.email}`}
                    className="hover:text-indigo-600 hover:underline"
                  >
                    {record.email}
                  </a>
                </div>
              )}
              {record.phone && (
                <div className="flex items-center">
                  <PhoneIcon className="h-3 w-3 mr-1" />
                  {record.phone}
                </div>
              )}
              {record.city && record.state && (
                <div className="text-gray-400">
                  {record.city}, {record.state}
                </div>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'person',
      label: 'Supporting',
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
      label: 'Message',
      render: (value, record) => (
        <div className="flex items-start">
          <DocumentTextIcon className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
          <div className="text-sm text-gray-900">
            {record.content ? (
              <div className="max-w-xs truncate">{record.content}</div>
            ) : (
              <span className="text-gray-500 italic">
                No message - name only
              </span>
            )}
            <div className="flex gap-2 mt-1">
              {record.wantsToHelpMore && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  Wants to help
                </span>
              )}
              {record.displayNameOnly && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  Name only
                </span>
              )}
            </div>
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
            value === 'support'
              ? 'bg-green-100 text-green-800'
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
      key: 'isApproved',
      label: 'Status',
      sortable: true,
      render: (value, record) => (
        <CommentStatusToggle
          commentId={record.id}
          initialIsApproved={record.isApproved}
          onUpdate={(commentId, isApproved) => {
            setComments(prev =>
              prev.map(c => (c.id === commentId ? { ...c, isApproved } : c))
            );
          }}
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
      type: 'edit',
      label: 'Edit',
      onClick: handleModerate,
      show: () => canApprove,
      className: 'text-indigo-600 hover:text-indigo-800',
    },
    {
      type: 'view',
      label: 'View on Profile',
      href: comment => `/${comment.person.town.slug}/${comment.person.slug}#comments`,
    },
    {
      type: 'delete',
      label: 'Delete',
      onClick: handleDeleteComment,
      show: () => canDelete,
      className: 'text-red-600 hover:text-red-800',
    },
  ];

  // Group comments by person if enabled
  const groupedData = groupByPerson
    ? sortedComments.reduce(
        (acc, comment) => {
          const personKey = `${comment.person.firstName} ${comment.person.lastName} - ${comment.person.town.name}, ${comment.person.town.state}`;
          if (!acc[personKey]) {
            acc[personKey] = [];
          }
          acc[personKey].push(comment);
          return acc;
        },
        {} as Record<string, Comment[]>
      )
    : { 'All Comments': sortedComments };

  // Find the person being viewed if personId is provided
  const viewedPerson = personId 
    ? initialComments.find(c => c.person.id === personId)?.person 
    : null;

  return (
    <div className="space-y-6">
      {/* Header for specific person */}
      {viewedPerson && (
        <div className="bg-white shadow-sm rounded-lg p-4 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Comments for {viewedPerson.firstName} {viewedPerson.lastName}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {viewedPerson.town.name}, {viewedPerson.town.state}
          </p>
          <Link
            href={`/${viewedPerson.town.slug}/${viewedPerson.slug}`}
            className="mt-2 inline-block text-sm text-indigo-600 hover:text-indigo-500"
          >
            View Profile →
          </Link>
        </div>
      )}
      
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search comments..."
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Bulk Actions and Town Filter */}
      <CommentBulkActions
        onApproveAll={handleApproveAll}
        onRejectAll={handleRejectAll}
        groupByPerson={groupByPerson}
        onGroupByPersonChange={setGroupByPerson}
        selectedTownId={selectedTownId}
        onTownChange={setSelectedTownId}
        towns={towns}
        disabled={isPending}
      />

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

      {groupByPerson ? (
        <div className="space-y-6">
          {Object.entries(groupedData).map(([personName, personComments]) => (
            <div key={personName} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {personName}
                </h3>
                <span className="text-sm text-gray-500">
                  {personComments.length} comment
                  {personComments.length !== 1 ? 's' : ''}
                </span>
              </div>
              <AdminDataGrid<Comment>
                data={personComments}
                columns={columns}
                actions={actions}
                title=""
                loading={isPending}
                error={error}
                onRefresh={handleRefresh}
                onSort={handleSort}
                showCreate={false}
                sortKey={String(sortKey)}
                sortDirection={sortDirection}
                emptyMessage="No comments found"
              />
            </div>
          ))}
        </div>
      ) : (
        <AdminDataGrid<Comment>
          data={sortedComments}
          columns={columns}
          actions={actions}
          title="Comments"
          loading={isPending}
          error={error}
          onRefresh={handleRefresh}
          onSort={handleSort}
          showCreate={false}
          sortKey={String(sortKey)}
          sortDirection={sortDirection}
          emptyMessage="No comments found"
        />
      )}

      {selectedComment && (
        <CommentModerationModal
          comment={selectedComment}
          isOpen={isModerationModalOpen}
          onClose={() => {
            setIsModerationModalOpen(false);
            setSelectedComment(null);
          }}
          onUpdate={handleStatusUpdate}
          isSiteAdmin={isSiteAdmin}
        />
      )}
    </div>
  );
}

export default memo(CommentsGrid);
