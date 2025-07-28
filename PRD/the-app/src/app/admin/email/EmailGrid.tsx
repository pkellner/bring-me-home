'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { EmailStatus } from '@prisma/client';
import {
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  EyeIcon,
  ArrowPathIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import EmailPreviewModal from './EmailPreviewModal';
import { updateEmailStatus } from '@/app/actions/email-notifications';
import { formatTimeAgo, formatDateTime } from '@/lib/time-utils';

interface EmailNotification {
  id: string;
  subject: string;
  status: EmailStatus;
  userId: string | null;
  user: {
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  sentTo?: string | null;
  person?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  personHistory?: {
    id: string;
    title: string;
    description: string;
  } | null;
  scheduledFor: string;
  sentAt: string | null;
  openedAt: string | null;
  lastMailServerMessage: string | null;
  lastMailServerMessageDate: string | null;
  retryCount: number;
  createdAt: string;
}

interface EmailGridProps {
  emails: EmailNotification[];
  totalCount: number;
  persons: Array<{ id: string; firstName: string; lastName: string }>;
  onSendSelected: (emailIds: string[]) => Promise<void>;
  onRetrySelected: (emailIds: string[]) => Promise<void>;
  onDeleteSelected: (emailIds: string[]) => Promise<void>;
}

const statusColors: Record<EmailStatus, string> = {
  QUEUED: 'bg-yellow-100 text-yellow-800',
  SENDING: 'bg-blue-100 text-blue-800',
  SENT: 'bg-green-100 text-green-800',
  DELIVERED: 'bg-green-200 text-green-900',
  FAILED: 'bg-red-100 text-red-800',
  BOUNCED: 'bg-red-200 text-red-900',
  OPENED: 'bg-purple-100 text-purple-800',
};

export default function EmailGrid({ emails, totalCount, persons, onSendSelected, onRetrySelected, onDeleteSelected }: EmailGridProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [filteredEmails, setFilteredEmails] = useState(emails);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilters, setStatusFilters] = useState<Set<EmailStatus>>(new Set());
  const [personFilter, setPersonFilter] = useState<string>('ALL');
  const [showPreview, setShowPreview] = useState<string | null>(null);
  
  // Calculate status counts
  const statusCounts = Object.values(EmailStatus).reduce((acc, status) => {
    acc[status] = emails.filter(email => email.status === status).length;
    return acc;
  }, {} as Record<EmailStatus, number>);

  // Apply filters
  useEffect(() => {
    let filtered = emails;

    // Status filter - now handles multiple statuses
    if (statusFilters.size > 0) {
      filtered = filtered.filter((email) => statusFilters.has(email.status));
    }

    // Person filter
    if (personFilter !== 'ALL') {
      filtered = filtered.filter((email) => email.person?.id === personFilter);
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((email) => {
        const userEmail = email.user?.email?.toLowerCase() || '';
        const userName = `${email.user?.firstName || ''} ${email.user?.lastName || ''}`.toLowerCase();
        const personName = email.person
          ? `${email.person.firstName} ${email.person.lastName}`.toLowerCase()
          : '';
        const subject = email.subject.toLowerCase();

        return (
          userEmail.includes(search) ||
          userName.includes(search) ||
          personName.includes(search) ||
          subject.includes(search)
        );
      });
    }

    setFilteredEmails(filtered);
  }, [emails, searchTerm, statusFilters, personFilter]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmails(new Set(filteredEmails.map((e) => e.id)));
    } else {
      setSelectedEmails(new Set());
    }
  };

  const handleSelectEmail = (emailId: string, checked: boolean) => {
    const newSelected = new Set(selectedEmails);
    if (checked) {
      newSelected.add(emailId);
    } else {
      newSelected.delete(emailId);
    }
    setSelectedEmails(newSelected);
  };
  
  const handleStatusFilterToggle = (status: EmailStatus) => {
    const newFilters = new Set(statusFilters);
    if (newFilters.has(status)) {
      newFilters.delete(status);
    } else {
      newFilters.add(status);
    }
    setStatusFilters(newFilters);
  };

  const handleSendSelected = async () => {
    if (selectedEmails.size === 0) return;

    const selectedQueuedEmails = Array.from(selectedEmails).filter((id) => {
      const email = emails.find((e) => e.id === id);
      return email?.status === 'QUEUED';
    });

    if (selectedQueuedEmails.length === 0) {
      alert('Please select only QUEUED emails to send.');
      return;
    }

    startTransition(async () => {
      await onSendSelected(selectedQueuedEmails);
      setSelectedEmails(new Set());
      router.refresh();
    });
  };

  const handleRetrySelected = async () => {
    if (selectedEmails.size === 0) return;

    const selectedFailedEmails = Array.from(selectedEmails).filter((id) => {
      const email = emails.find((e) => e.id === id);
      return email?.status === 'FAILED';
    });

    if (selectedFailedEmails.length === 0) {
      alert('Please select only FAILED emails to retry.');
      return;
    }

    startTransition(async () => {
      await onRetrySelected(selectedFailedEmails);
      setSelectedEmails(new Set());
      router.refresh();
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedEmails.size === 0) return;

    const confirmMessage = `Are you sure you want to delete ${selectedEmails.size} selected email(s)? This action cannot be undone.`;
    if (!confirm(confirmMessage)) return;

    startTransition(async () => {
      await onDeleteSelected(Array.from(selectedEmails));
      setSelectedEmails(new Set());
      router.refresh();
    });
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString();
  };

  const handleStatusChange = async (emailId: string, newStatus: EmailStatus) => {
    startTransition(async () => {
      const result = await updateEmailStatus(emailId, newStatus);
      if (result.success) {
        router.refresh();
      } else {
        alert('Failed to update email status');
      }
    });
  };

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Filters */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by email, name, or subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Show All/None buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilters(new Set())}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Show All
            </button>
            <button
              onClick={() => setStatusFilters(new Set(Object.values(EmailStatus)))}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Select All
            </button>
          </div>

          {/* Person Filter */}
          <select
            value={personFilter}
            onChange={(e) => setPersonFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Persons</option>
            {persons.map((person) => (
              <option key={person.id} value={person.id}>
                {person.firstName} {person.lastName}
              </option>
            ))}
          </select>
        </div>
        
        {/* Status Filter Checkboxes */}
        <div className="mt-4 mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Filter by Status:</div>
          <div className="flex flex-wrap gap-3">
            {Object.values(EmailStatus).map((status) => (
              <label key={status} className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={statusFilters.has(status)}
                  onChange={() => handleStatusFilterToggle(status)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className={`ml-2 px-2 py-1 rounded-full text-sm font-medium ${statusColors[status]}`}>
                  {status} ({statusCounts[status]})
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleSendSelected}
            disabled={isPending || selectedEmails.size === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="h-4 w-4 mr-2" />
            Send Selected ({selectedEmails.size})
          </button>
          <button
            onClick={handleRetrySelected}
            disabled={isPending || selectedEmails.size === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Retry Selected ({selectedEmails.size})
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={isPending || selectedEmails.size === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete Selected ({selectedEmails.size})
          </button>
        </div>
      </div>

      {/* Results count */}
      <div className="px-6 py-2 bg-gray-50 border-t border-gray-200">
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">{filteredEmails.length}</span> of{' '}
          <span className="font-medium">{emails.length}</span> emails
          {statusFilters.size > 0 && (
            <span className="ml-2 text-gray-500">
              (Filtered by: {Array.from(statusFilters).join(', ')})
            </span>
          )}
        </div>
      </div>

      {/* Email Table */}
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    filteredEmails.length > 0 &&
                    filteredEmails.every((email) => selectedEmails.has(email.id))
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Recipient
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                Subject
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Person
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Scheduled
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sent At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEmails.map((email) => (
              <tr key={email.id} className={selectedEmails.has(email.id) ? 'bg-blue-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedEmails.has(email.id)}
                    onChange={(e) => handleSelectEmail(email.id, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {email.user ? `${email.user.firstName} ${email.user.lastName}` : 'External'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {email.sentTo || email.user?.email || 'No email'}
                  </div>
                </td>
                <td className="px-6 py-4 min-w-[200px]">
                  <div className="text-sm text-gray-900">{email.subject}</div>
                  {email.personHistory && (
                    <div className="text-xs text-gray-500 mt-1">
                      Update: {email.personHistory.title}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {email.person ? (
                    <div className="text-sm text-gray-900">
                      {email.person.firstName} {email.person.lastName}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-1">
                    <select
                      value={email.status}
                      onChange={(e) => handleStatusChange(email.id, e.target.value as EmailStatus)}
                      disabled={isPending}
                      className={`block w-full px-2 py-1 text-xs font-semibold rounded-md border-0 focus:ring-2 focus:ring-blue-500 ${
                        statusColors[email.status]
                      }`}
                    >
                      {Object.values(EmailStatus).map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    {email.status === 'OPENED' && email.openedAt ? (
                      <div className="relative group">
                        <div className="text-xs text-green-600 truncate max-w-[150px] cursor-help font-medium">
                          Email opened {formatTimeAgo(email.openedAt)}
                        </div>
                        <div className="absolute z-50 invisible group-hover:visible bg-gray-900 text-white text-xs rounded-lg p-3 mt-1 w-max max-w-md whitespace-normal break-words shadow-lg left-0">
                          <div className="font-medium mb-2 text-green-400">Email Opened</div>
                          <div className="mb-1">Opened at: {formatDateTime(email.openedAt)}</div>
                          {email.lastMailServerMessage && (
                            <>
                              <div className="border-t border-gray-700 mt-2 pt-2">
                                <div className="font-medium mb-1">Original Send Status:</div>
                                {email.lastMailServerMessage}
                              </div>
                            </>
                          )}
                          {email.sentAt && (
                            <div className="text-gray-300 mt-1">
                              Sent at: {formatDateTime(email.sentAt)}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : email.lastMailServerMessage ? (
                      <div className="relative group">
                        <div className="text-xs text-gray-600 truncate max-w-[150px] cursor-help">
                          {email.lastMailServerMessage}
                        </div>
                        <div className="absolute z-50 invisible group-hover:visible bg-gray-900 text-white text-xs rounded-lg p-3 mt-1 w-max max-w-md whitespace-normal break-words shadow-lg left-0">
                          <div className="font-medium mb-1">Server Response:</div>
                          {email.lastMailServerMessage}
                          {email.lastMailServerMessageDate && (
                            <div className="text-gray-300 mt-2 text-xs">
                              {new Date(email.lastMailServerMessageDate).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(email.scheduledFor)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(email.sentAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => setShowPreview(email.id)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  {email.status === 'FAILED' && (
                    <button
                      onClick={async () => {
                        startTransition(async () => {
                          await onRetrySelected([email.id]);
                          router.refresh();
                        });
                      }}
                      className="text-orange-600 hover:text-orange-900"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Record count display */}
      {filteredEmails.length > 0 && (
        <div className="mt-2 text-sm text-gray-600 text-center">
          Showing {filteredEmails.length} of {emails.length} emails
          {totalCount > 500 && ` (${totalCount.toLocaleString()} total in database)`}
        </div>
      )}

      {/* No results */}
      {filteredEmails.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No emails found matching your filters.</p>
        </div>
      )}

      {/* Email Preview Modal */}
      {showPreview && (
        <EmailPreviewModal
          emailId={showPreview}
          onClose={() => setShowPreview(null)}
        />
      )}
    </div>
  );
}