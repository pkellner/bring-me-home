'use client';

import { memo, useCallback, useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from '@/components/OptimizedLink';
import AdminDataGrid, {
  GridAction,
  GridColumn,
} from '@/components/admin/AdminDataGrid';
import CommentModerationModal from '@/components/admin/CommentModerationModal';
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
  privacyRequiredDoNotShowPublicly?: boolean;
  hideRequested?: boolean;
  personHistoryId?: string | null;
  personHistory?: {
    id: string;
    title: string;
    description: string;
    date: Date | string;
  } | null;
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
  personHistoryNumberMap?: Record<string, number>;
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
  personHistoryNumberMap = {},
}: CommentsGridProps) {
  
  const router = useRouter();
  // Sort initial comments with unapproved first
  const sortedInitialComments = [...initialComments].sort((a, b) => {
    if (!a.isApproved && b.isApproved) return -1;
    if (a.isApproved && !b.isApproved) return 1;
    // Within each group, sort by createdAt desc
    const aDate = new Date(a.createdAt).getTime();
    const bDate = new Date(b.createdAt).getTime();
    return bDate - aDate;
  });
  const [comments, setComments] = useState(sortedInitialComments);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<keyof Comment>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [commentTypeFilter, setCommentTypeFilter] = useState<'all' | 'general' | 'update'>('all');
  const [groupByUpdate, setGroupByUpdate] = useState(false);
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'pending' | 'approved'
  >('all');
  const [isPending, startTransition] = useTransition();
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [isModerationModalOpen, setIsModerationModalOpen] = useState(false);
  const [groupByPerson, setGroupByPerson] = useState(true); // Default to grouped by person
  const [selectedTownId, setSelectedTownId] = useState('');
  const [commenterFilter, setCommenterFilter] = useState('');

  const [isFilterTransitioning, setIsFilterTransitioning] = useState(false);

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

    // Apply comment type filter
    if (commentTypeFilter === 'general' && comment.personHistoryId) return false;
    if (commentTypeFilter === 'update' && !comment.personHistoryId) return false;

    // Apply commenter filter
    if (commenterFilter && comment.firstName && comment.lastName) {
      const fullName = `${comment.firstName} ${comment.lastName}`.toLowerCase();
      if (!fullName.includes(commenterFilter.toLowerCase())) {
        return false;
      }
    }

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

  // Use filtered comments without re-sorting to maintain order when status changes
  const sortedComments = filteredComments;

  // Trigger transition effect when filters change
  useEffect(() => {
    setIsFilterTransitioning(true);
    const timer = setTimeout(() => {
      setIsFilterTransitioning(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [filterStatus, commentTypeFilter, selectedTownId, searchQuery, commenterFilter]);

  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleSort = useCallback((key: string, direction: 'asc' | 'desc') => {
    setSortKey(key as keyof Comment);
    setSortDirection(direction);
    // Apply sorting when explicitly requested
    setComments(prev => [...prev].sort((a, b) => {
      // First priority: unapproved comments come first
      if (!a.isApproved && b.isApproved) return -1;
      if (a.isApproved && !b.isApproved) return 1;
      
      // Special handling for commenter sort - sort by full name
      if (key === 'commenter' || key === 'firstName') {
        const aName = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
        const bName = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
        
        if (aName < bName) return direction === 'asc' ? -1 : 1;
        if (aName > bName) return direction === 'asc' ? 1 : -1;
        return 0;
      }
      
      // Within each group, sort by the selected sort key
      const aValue = a[key as keyof Comment];
      const bValue = b[key as keyof Comment];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    }));
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
    const pendingComments = filteredComments.filter(c => !c.isApproved && !c.privacyRequiredDoNotShowPublicly);
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
    const pendingComments = filteredComments.filter(c => !c.isApproved && !c.privacyRequiredDoNotShowPublicly);
    if (pendingComments.length === 0) {
      alert('No pending comments to reject');
      return;
    }

    const reason = prompt(
      `Please provide a reason for rejecting ${pendingComments.length} ${pendingComments.length === 1 ? 'comment' : 'comments'}:`
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
      sortable: true,
      render: (value, record) => (
        <div className={`flex items-center ${record.personHistoryId ? 'border-l-4 border-blue-400 pl-2 -ml-2' : ''}`}>
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
            {record.content || record.privateNoteToFamily ? (
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
                  title={(record.content || '') + (record.privateNoteToFamily ? ` Private note to family: ${record.privateNoteToFamily}` : '')}
                >
                  {record.content}
                  {record.privateNoteToFamily && (
                    <span className="text-blue-800 dark:text-blue-700 ml-2">
                      Private note to family: {record.privateNoteToFamily}
                    </span>
                  )}
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
      key: 'personHistory',
      label: 'Update',
      width: 'w-48',
      className: 'hidden lg:table-cell',
      render: (value, record) => {
        if (record.personHistoryId && record.personHistory) {
          const updateNumber = personHistoryNumberMap[record.personHistoryId] || '?';
          const title = record.personHistory.title;
          
          return (
            <div 
              className="relative transition-[height] duration-300 ease-in-out"
              style={{ height: '1.5em' }}
              onMouseEnter={(e) => {
                const content = e.currentTarget.querySelector('.update-content') as HTMLElement;
                if (content) {
                  const fullHeight = content.scrollHeight;
                  e.currentTarget.style.height = fullHeight + 'px';
                  content.style.opacity = '1';
                }
              }}
              onMouseLeave={(e) => {
                const content = e.currentTarget.querySelector('.update-content') as HTMLElement;
                if (content) {
                  e.currentTarget.style.height = '1.5em';
                  content.style.opacity = '0';
                }
              }}
            >
              <div className="text-sm text-blue-600 font-medium cursor-help">
                Comment on Update #{updateNumber}
              </div>
              <div 
                className="update-content absolute top-0 left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg p-3 z-10 opacity-0 transition-opacity duration-300"
                style={{ pointerEvents: 'none' }}
              >
                <div className="text-xs text-gray-500 mb-1">
                  Update from {new Date(record.personHistory.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}:
                </div>
                <div className="text-sm text-gray-700">
                  &ldquo;{title}&rdquo;
                </div>
              </div>
            </div>
          );
        }
        return (
          <span className="text-xs text-gray-500">General comment</span>
        );
      },
    },
    {
      key: 'isApproved',
      label: 'Status',
      width: 'w-20',
      sortable: true,
      render: (value, record) => (
        <div className="flex flex-col gap-1">
          {record.privacyRequiredDoNotShowPublicly ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Private
            </span>
          ) : (
            <CommentStatusToggle
              commentId={record.id}
              initialIsApproved={record.isApproved}
              onUpdate={(commentId, isApproved) => {
                setComments(prev =>
                  prev.map(c => (c.id === commentId ? { ...c, isApproved } : c))
                );
              }}
            />
          )}
          {record.hideRequested && (
            <span 
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
              title={record.user && typeof record.user === 'object' && 'allowAnonymousComments' in record.user && !(record.user as {allowAnonymousComments?: boolean}).allowAnonymousComments ? "Auto-hidden: User disabled anonymous comments" : "Hidden by user request"}
            >
              {record.user && typeof record.user === 'object' && 'allowAnonymousComments' in record.user && !(record.user as {allowAnonymousComments?: boolean}).allowAnonymousComments ? 'Auto-hidden' : 'Hidden'}
            </span>
          )}
        </div>
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
        // Display in user's local timezone
        const localDate = date.toLocaleString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: '2-digit',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        const [datePart, timePart] = localDate.split(', ');
        
        // Also show UTC time for clarity
        const utcTime = date.toLocaleString('en-US', {
          timeZone: 'UTC',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        
        return (
          <div className="text-center">
            <div className="text-sm text-gray-900">{datePart}</div>
            <div className="text-xs text-gray-500">{timePart}</div>
            <div className="text-xs text-gray-400" title={`${utcTime} UTC`}>Local time</div>
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
          return canShow;
        }
        
        // For town admin, always show
        return true;
      },
    },
  ];

  // Handle hash navigation to specific PersonHistory comments
  useEffect(() => {
    const hash = window.location.hash.slice(1); // Remove the #
    if (hash && personId) {
      // Find comments for this PersonHistory
      const historyComments = comments.filter(c => c.personHistoryId === hash);
      if (historyComments.length > 0) {
        // Set filter to show update comments and group by update
        setCommentTypeFilter('update');
        setGroupByUpdate(true);
        setGroupByPerson(false);
        
        // Scroll to the element after a short delay to ensure rendering
        setTimeout(() => {
          const element = document.getElementById(`history-${hash}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Add a highlight effect
            element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
            }, 3000);
          }
        }, 100);
      }
    }
  }, [comments, personId]);

  // Group comments by person if enabled
  const groupedData = groupByUpdate
    ? sortedComments.reduce(
        (acc, comment) => {
          let groupKey: string;
          if (comment.personHistoryId && comment.personHistory) {
            const date = new Date(comment.personHistory.date);
            const formattedDate = date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });
            groupKey = `Update from ${formattedDate}: "${comment.personHistory.title}"`;
          } else {
            groupKey = 'General Comments';
          }
          if (!acc[groupKey]) {
            acc[groupKey] = [];
          }
          acc[groupKey].push(comment);
          return acc;
        },
        {} as Record<string, Comment[]>
      )
    : groupByPerson
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
      
      {/* Search and Actions Bar */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bars */}
          <div className="flex-1 flex flex-col sm:flex-row gap-3">
            {/* General Search */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-600" />
                <input
                  type="text"
                  placeholder="Search content, email, location..."
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-150 text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearch('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-800"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            {/* Commenter Filter */}
            <div className="sm:w-64">
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-600" />
                <input
                  type="text"
                  placeholder="Filter by commenter name..."
                  value={commenterFilter}
                  onChange={e => setCommenterFilter(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-150 text-sm"
                />
                {commenterFilter && (
                  <button
                    onClick={() => setCommenterFilter('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-800"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleApproveAll}
              disabled={isPending || filteredComments.filter(c => !c.isApproved && !c.privacyRequiredDoNotShowPublicly).length === 0}
              className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Approve All ({filteredComments.filter(c => !c.isApproved && !c.privacyRequiredDoNotShowPublicly).length})
            </button>
            <button
              onClick={handleRejectAll}
              disabled={isPending || filteredComments.filter(c => !c.isApproved && !c.privacyRequiredDoNotShowPublicly).length === 0}
              className="inline-flex items-center px-4 py-2.5 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reject All ({filteredComments.filter(c => !c.isApproved && !c.privacyRequiredDoNotShowPublicly).length})
            </button>
          </div>
        </div>

        {/* Town Filter (if not viewing a specific person) */}
        {!personId && towns.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Filter by Town:</label>
              <select
                value={selectedTownId}
                onChange={e => setSelectedTownId(e.target.value)}
                className="flex-1 max-w-xs pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Towns</option>
                {towns.map(town => (
                  <option key={town.id} value={town.id}>
                    {town.name}, {town.state}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Professional Filter Toolbar */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-4">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Status Filter */}
            <div className="flex-1 space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</h3>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors">
                  <input
                    type="checkbox"
                    checked={filterStatus === 'all' || filterStatus === 'pending'}
                    onChange={(e) => {
                      if (e.target.checked) {
                        if (filterStatus === 'approved') {
                          setFilterStatus('all');
                        } else {
                          setFilterStatus('pending');
                        }
                      } else {
                        if (filterStatus === 'all') {
                          setFilterStatus('approved');
                        } else {
                          setFilterStatus('all'); // If unchecking pending when it's the only one, show all
                        }
                      }
                    }}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">Pending</span>
                  <span className="ml-auto text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                    {comments.filter(c => !c.isApproved).length}
                  </span>
                </label>
                <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors">
                  <input
                    type="checkbox"
                    checked={filterStatus === 'all' || filterStatus === 'approved'}
                    onChange={(e) => {
                      if (e.target.checked) {
                        if (filterStatus === 'pending') {
                          setFilterStatus('all');
                        } else {
                          setFilterStatus('approved');
                        }
                      } else {
                        if (filterStatus === 'all') {
                          setFilterStatus('pending');
                        } else {
                          setFilterStatus('all'); // If unchecking approved when it's the only one, show all
                        }
                      }
                    }}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">Approved</span>
                  <span className="ml-auto text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                    {comments.filter(c => c.isApproved).length}
                  </span>
                </label>
              </div>
            </div>

            {/* Vertical Separator */}
            <div className="hidden lg:block w-px bg-gray-300"></div>
            {/* Horizontal Separator for Mobile */}
            <div className="block lg:hidden h-px bg-gray-300"></div>

            {/* Comment Type Filter */}
            <div className="flex-1 space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Comment Type</h3>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors">
                  <input
                    type="checkbox"
                    checked={commentTypeFilter === 'all' || commentTypeFilter === 'general'}
                    onChange={(e) => {
                      if (e.target.checked) {
                        if (commentTypeFilter === 'update') {
                          setCommentTypeFilter('all');
                        } else {
                          setCommentTypeFilter('general');
                        }
                      } else {
                        if (commentTypeFilter === 'all') {
                          setCommentTypeFilter('update');
                        } else {
                          setCommentTypeFilter('all'); // If unchecking general when it's the only one, show all
                        }
                      }
                    }}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">General Comments</span>
                  <span className="ml-auto text-xs text-gray-500">
                    {comments.filter(c => !c.personHistoryId).length}
                  </span>
                </label>
                <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors">
                  <input
                    type="checkbox"
                    checked={commentTypeFilter === 'all' || commentTypeFilter === 'update'}
                    onChange={(e) => {
                      if (e.target.checked) {
                        if (commentTypeFilter === 'general') {
                          setCommentTypeFilter('all');
                        } else {
                          setCommentTypeFilter('update');
                        }
                      } else {
                        if (commentTypeFilter === 'all') {
                          setCommentTypeFilter('general');
                        } else {
                          setCommentTypeFilter('all'); // If unchecking update when it's the only one, show all
                        }
                      }
                    }}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">Update Comments</span>
                  <span className="ml-auto text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                    {comments.filter(c => c.personHistoryId).length}
                  </span>
                </label>
              </div>
            </div>

            {/* Vertical Separator */}
            <div className="hidden lg:block w-px bg-gray-300"></div>
            {/* Horizontal Separator for Mobile */}
            <div className="block lg:hidden h-px bg-gray-300"></div>

            {/* Grouping Options */}
            <div className="flex-1 space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Group By</h3>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors">
                  <input
                    type="checkbox"
                    checked={groupByUpdate}
                    onChange={(e) => {
                      setGroupByUpdate(e.target.checked);
                      if (e.target.checked) {
                        setGroupByPerson(false);
                      }
                    }}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">Group by Update</span>
                </label>
                {!personId && (
                  <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors">
                    <input
                      type="checkbox"
                      checked={groupByPerson}
                      onChange={(e) => {
                        setGroupByPerson(e.target.checked);
                        if (e.target.checked) {
                          setGroupByUpdate(false);
                        }
                      }}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">Group by Person</span>
                  </label>
                )}
              </div>
            </div>

            {/* Vertical Separator */}
            <div className="hidden lg:block w-px bg-gray-300"></div>
            {/* Horizontal Separator for Mobile */}
            <div className="block lg:hidden h-px bg-gray-300"></div>

            {/* Summary Stats */}
            <div className="flex-1 space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Summary</h3>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Showing:</span>
                  <span className="text-sm font-semibold text-gray-900">{sortedComments.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Filtered Out:</span>
                  <span className="text-sm font-medium text-gray-700">{comments.length - sortedComments.length}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Approval Rate:</span>
                    <span className="text-xs font-medium text-gray-700">
                      {comments.length > 0 
                        ? Math.round((comments.filter(c => c.isApproved).length / comments.length) * 100) 
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Note about PersonHistory comments */}
      {sortedComments.some(c => c.personHistoryId) && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-400 rounded" />
          <span className="text-sm text-blue-800">
            Comments with a blue border are from person updates. {groupByUpdate && 'Update groups have a blue background.'}
          </span>
        </div>
      )}

      <div 
        className={`transition-all duration-300 ${
          isFilterTransitioning ? 'opacity-50 scale-[0.99]' : 'opacity-100 scale-100'
        }`}
      >
        {(groupByPerson || groupByUpdate) ? (
          <div className="space-y-6">
            {Object.entries(groupedData).map(([groupName, groupComments]) => {
              // Check if this is a PersonHistory group
              const isHistoryGroup = groupByUpdate && groupComments[0]?.personHistoryId;
              const historyId = isHistoryGroup ? groupComments[0].personHistoryId : null;
              
              return (
                <div 
                  key={groupName} 
                  id={historyId ? `history-${historyId}` : undefined}
                  className={`border rounded-lg p-4 transition-all duration-300 ${
                    isHistoryGroup ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {groupName}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {groupComments.length} comment
                      {groupComments.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <AdminDataGrid<Comment>
                  data={groupComments}
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
              );
            })}
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
      </div>

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
