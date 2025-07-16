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
  birthdate: Date | string | null;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  showOccupation: boolean;
  showBirthdate: boolean;
  showComment: boolean;
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
  privateNoteToFamily: string | null;
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
  createdAt: Date | string;
  updatedAt: Date | string;
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
  isPersonAdmin?: boolean;
  deleteDaysThreshold?: number;
}

function CommentsGrid({
  initialComments,
  canApprove,
  canDelete,
  towns,
  personId,
  isSiteAdmin,
  isPersonAdmin = false,
  deleteDaysThreshold = 1,
}: CommentsGridProps) {
  console.log('CommentsGrid Debug:', {
    canDelete,
    isSiteAdmin,
    isPersonAdmin,
    personId,
    deleteDaysThreshold,
    commentsCount: initialComments.length
  });
  
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
      className: 'min-w-[80px] max-w-[120px] lg:min-w-[100px] lg:max-w-[300px]',
      render: (value, record) => (
        <div className="flex items-center">
          <UserIcon className="h-4 w-4 text-gray-500 mr-2 flex-shrink-0 hidden lg:block" />
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {record.firstName} {record.lastName}
            </div>
            <div className="hidden lg:flex items-center gap-3 text-xs text-gray-500">
              {record.email && (
                <div className="flex items-center min-w-0">
                  <EnvelopeIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                  <a 
                    href={`mailto:${record.email}`}
                    className="hover:text-indigo-600 hover:underline truncate"
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
                <div className="text-gray-600 font-medium">
                  {record.city}, {record.state}
                </div>
              )}
            </div>
          </div>
        </div>
      ),
    },
    ...(!personId ? [{
      key: 'person',
      label: 'Supporting',
      width: 'w-32 sm:w-40 lg:w-48',
      className: 'hidden lg:table-cell',
      render: (value: unknown) => {
        const person = value as Comment['person'];
        return (
          <div className="text-sm">
            <div className="font-medium text-gray-900 truncate">
              {person.firstName} {person.lastName}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {person.town.name}, {person.town.state}
            </div>
          </div>
        );
      },
    }] : []),
    {
      key: 'content',
      label: 'Message',
      className: 'min-w-[50%]',
      render: (value, record) => (
        <div className="flex items-start gap-2">
          <DocumentTextIcon className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0 hidden lg:block" />
          <div className="flex-1 min-w-0">
            {record.content ? (
              <div 
                className="relative transition-[height] duration-500 ease-in-out"
                style={{ height: '2.5em' }}
                onMouseEnter={(e) => {
                  const content = e.currentTarget.querySelector('.message-content') as HTMLElement;
                  if (content) {
                    const fullHeight = content.scrollHeight;
                    e.currentTarget.style.height = fullHeight + 'px';
                    content.style.webkitLineClamp = 'unset';
                    content.style.maxHeight = fullHeight + 'px';
                  }
                }}
                onMouseLeave={(e) => {
                  const content = e.currentTarget.querySelector('.message-content') as HTMLElement;
                  if (content) {
                    e.currentTarget.style.height = '2.5em';
                    content.style.webkitLineClamp = '2';
                    content.style.maxHeight = '2.5em';
                  }
                }}
              >
                <div 
                  className="message-content text-sm text-gray-900 break-words overflow-hidden transition-[max-height] duration-500 ease-in-out cursor-help absolute inset-0"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    maxHeight: '2.5em',
                  }}
                  title={record.content}
                >
                  {record.content}
                </div>
              </div>
            ) : (
              <span className="text-sm text-gray-500 italic">
                No message
              </span>
            )}
          </div>
          {(record.wantsToHelpMore || record.displayNameOnly) && (
            <div className="hidden xl:flex flex-col gap-1 flex-shrink-0">
              {record.wantsToHelpMore && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap">
                  Wants to help
                </span>
              )}
              {record.displayNameOnly && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap">
                  Name only
                </span>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'isApproved',
      label: 'Status',
      width: 'w-20',
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
      width: 'w-24',
      className: 'hidden md:table-cell',
      sortable: true,
      render: value => {
        const date = new Date(value as Date);
        const pacificDate = date.toLocaleString('en-US', {
          timeZone: 'America/Los_Angeles',
          month: 'numeric',
          day: 'numeric',
          year: '2-digit',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        const [datePart, timePart] = pacificDate.split(', ');
        return (
          <div className="text-center">
            <div className="text-sm text-gray-900">{datePart}</div>
            <div className="text-xs text-gray-500">{timePart}</div>
          </div>
        );
      },
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
      type: 'delete',
      label: 'Delete',
      onClick: handleDeleteComment,
      className: 'text-red-600 hover:text-red-800',
      show: (comment) => {
        if (!canDelete) return false;
        
        // Always show delete for site admin
        if (isSiteAdmin) return true;
        
        // For person admin (when viewing a specific person's comments), 
        // only show if comment belongs to the viewed person AND is older than threshold
        if (isPersonAdmin && personId) {
          // First check if this comment belongs to the person being viewed
          if (comment.person.id !== personId) {
            return false;
          }
          
          const commentDate = new Date(comment.createdAt);
          const now = new Date();
          const daysDiff = (now.getTime() - commentDate.getTime()) / (1000 * 60 * 60 * 24);
          const canShow = daysDiff >= deleteDaysThreshold;
          console.log('Delete icon check for person admin:', {
            commentId: comment.id,
            commentCreatedAt: comment.createdAt,
            commentDate: commentDate.toISOString(),
            now: now.toISOString(),
            daysDiff,
            deleteDaysThreshold,
            canShow,
            isPersonAdmin,
            personId,
            commentPersonId: comment.person.id,
            belongsToViewedPerson: comment.person.id === personId
          });
          return canShow;
        }
        
        // For town admin, always show
        return true;
      },
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
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search comments..."
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-600 focus:outline-none focus:placeholder-gray-600 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
