'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { EmailStatus } from '@prisma/client';
import {
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  EyeIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import EmailPreviewModal from './EmailPreviewModal';

interface EmailNotification {
  id: string;
  subject: string;
  status: EmailStatus;
  userId: string;
  user: {
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  person?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  personHistory?: {
    id: string;
    description: string;
  } | null;
  scheduledFor: string;
  sentAt: string | null;
  errorMessage: string | null;
  retryCount: number;
  createdAt: string;
}

interface EmailGridProps {
  emails: EmailNotification[];
  persons: Array<{ id: string; firstName: string; lastName: string }>;
  onSendSelected: (emailIds: string[]) => Promise<void>;
  onRetrySelected: (emailIds: string[]) => Promise<void>;
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

export default function EmailGrid({ emails, persons, onSendSelected, onRetrySelected }: EmailGridProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [filteredEmails, setFilteredEmails] = useState(emails);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<EmailStatus | 'ALL'>('ALL');
  const [personFilter, setPersonFilter] = useState<string>('ALL');
  const [showPreview, setShowPreview] = useState<string | null>(null);

  // Apply filters
  useEffect(() => {
    let filtered = emails;

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((email) => email.status === statusFilter);
    }

    // Person filter
    if (personFilter !== 'ALL') {
      filtered = filtered.filter((email) => email.person?.id === personFilter);
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((email) => {
        const userEmail = email.user.email?.toLowerCase() || '';
        const userName = `${email.user.firstName || ''} ${email.user.lastName || ''}`.toLowerCase();
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
  }, [emails, searchTerm, statusFilter, personFilter]);

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

    if (!confirm(`Send ${selectedQueuedEmails.length} selected emails?`)) {
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

    if (!confirm(`Retry ${selectedFailedEmails.length} selected emails?`)) {
      return;
    }

    startTransition(async () => {
      await onRetrySelected(selectedFailedEmails);
      setSelectedEmails(new Set());
      router.refresh();
    });
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString();
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

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as EmailStatus | 'ALL')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            {Object.values(EmailStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

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
        </div>
      </div>

      {/* Email Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                    {email.user.firstName} {email.user.lastName}
                  </div>
                  <div className="text-sm text-gray-500">{email.user.email}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{email.subject}</div>
                  {email.personHistory && (
                    <div className="text-xs text-gray-500 mt-1">
                      Update: {email.personHistory.description.substring(0, 50)}...
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
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      statusColors[email.status]
                    }`}
                  >
                    {email.status}
                  </span>
                  {email.status === 'FAILED' && email.errorMessage && (
                    <div className="text-xs text-red-600 mt-1">
                      {email.errorMessage.substring(0, 50)}...
                    </div>
                  )}
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
                        if (confirm('Retry this email?')) {
                          startTransition(async () => {
                            await onRetrySelected([email.id]);
                            router.refresh();
                          });
                        }
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