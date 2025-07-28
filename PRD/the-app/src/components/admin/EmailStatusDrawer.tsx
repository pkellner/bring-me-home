'use client';

import { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { formatTimeAgo, formatDateTime } from '@/lib/time-utils';

interface EmailRecipient {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  status: string;
  sentAt: string | null;
  openedAt: string | null;
}

interface EmailStatusDrawerProps {
  sentCount: number;
  openedCount: number;
  expanded: boolean;
  onToggle: () => void;
}

export default function EmailStatusDrawer({ 
  sentCount, 
  openedCount,
  expanded,
  onToggle
}: EmailStatusDrawerProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onToggle}
        className="p-1 hover:bg-gray-100 rounded transition-colors"
        title={expanded ? "Hide details" : "Show details"}
      >
        {expanded ? (
          <ChevronUpIcon className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDownIcon className="h-4 w-4 text-gray-500" />
        )}
      </button>
      <span className="text-sm text-gray-600">
        {sentCount} sent, {openedCount} opened
      </span>
    </div>
  );
}

export function EmailStatusDrawerContent({ 
  personHistoryId, 
  expanded 
}: { 
  personHistoryId: string; 
  expanded: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [filteredRecipients, setFilteredRecipients] = useState<EmailRecipient[]>([]);
  const [showSent, setShowSent] = useState(true);
  const [showOpened, setShowOpened] = useState(true);
  const [showOthers, setShowOthers] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  
  const pageSize = parseInt(process.env.NEXT_PUBLIC_EMAIL_PAGE_SIZE || '100');

  const fetchEmailStatus = async () => {
    if (!expanded && recipients.length > 0) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/person-history/${personHistoryId}/email-status`);
      if (response.ok) {
        const data = await response.json();
        setRecipients(data.recipients);
      }
    } catch (error) {
      console.error('Failed to fetch email status:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (expanded) {
      fetchEmailStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, personHistoryId]);

  useEffect(() => {
    const filtered = recipients.filter(recipient => {
      if (recipient.status === 'OPENED' && !showOpened) return false;
      if (['SENT', 'DELIVERED'].includes(recipient.status) && !showSent) return false;
      if (!['SENT', 'DELIVERED', 'OPENED'].includes(recipient.status) && !showOthers) return false;
      return true;
    });
    setFilteredRecipients(filtered);
    setCurrentPage(0);
  }, [recipients, showSent, showOpened, showOthers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchEmailStatus();
  };

  const paginatedRecipients = filteredRecipients.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  const hasMore = filteredRecipients.length > (currentPage + 1) * pageSize;

  const getTimeDisplay = (recipient: EmailRecipient) => {
    if (recipient.status === 'OPENED' && recipient.openedAt) {
      return {
        text: formatTimeAgo(recipient.openedAt),
        tooltip: `Opened: ${formatDateTime(recipient.openedAt)}`
      };
    } else if ((recipient.status === 'SENT' || recipient.status === 'DELIVERED') && recipient.sentAt) {
      return {
        text: formatTimeAgo(recipient.sentAt),
        tooltip: `Sent: ${formatDateTime(recipient.sentAt)}`
      };
    }
    return null;
  };

  if (!expanded) return null;

  return (
    <tr>
      <td colSpan={5} className="p-0 bg-gray-50">
        <div className="px-6 py-4 border-t border-b border-gray-200">
          {/* Filter controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={showSent}
                  onChange={(e) => setShowSent(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded mr-2"
                />
                Sent
              </label>
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={showOpened}
                  onChange={(e) => setShowOpened(e.target.checked)}
                  className="h-4 w-4 text-green-600 rounded mr-2"
                />
                Opened
              </label>
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={showOthers}
                  onChange={(e) => setShowOthers(e.target.checked)}
                  className="h-4 w-4 text-gray-600 rounded mr-2"
                />
                Others
              </label>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`p-2 hover:bg-gray-200 rounded transition-colors ${
                refreshing ? 'animate-spin' : ''
              }`}
              title="Refresh email status"
            >
              <ArrowPathIcon className="h-4 w-4 text-gray-600" />
            </button>
          </div>

          {/* Recipients list */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            </div>
          ) : filteredRecipients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No recipients match the selected filters
            </div>
          ) : (
            <div className="w-full" style={{ width: '90%', margin: '0 auto' }}>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedRecipients.map((recipient) => {
                      const timeDisplay = getTimeDisplay(recipient);
                      return (
                        <tr key={recipient.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {recipient.firstName || recipient.lastName
                              ? `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim()
                              : 'Anonymous'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {recipient.email}
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  recipient.status === 'OPENED'
                                    ? 'bg-green-100 text-green-800'
                                    : recipient.status === 'SENT' || recipient.status === 'DELIVERED'
                                    ? 'bg-blue-100 text-blue-800'
                                    : recipient.status === 'FAILED'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {recipient.status}
                              </span>
                              {timeDisplay && (
                                <div 
                                  className="text-xs text-gray-500 mt-1 cursor-help"
                                  title={timeDisplay.tooltip}
                                >
                                  {timeDisplay.text}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {hasMore && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Show Next {Math.min(pageSize, filteredRecipients.length - (currentPage + 1) * pageSize)}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}