'use client';

import { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { formatDateTime } from '@/lib/time-utils';

interface EmailRecipient {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  status: string;
  sentAt: string | null;
  openedAt: string | null;
}

interface EmailStatusDisplayProps {
  personHistoryId: string;
  onRefresh?: () => void;
}

export default function EmailStatusDisplay({ personHistoryId, onRefresh }: EmailStatusDisplayProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [stats, setStats] = useState({ total: 0, sent: 0, opened: 0 });
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);

  const fetchEmailStatus = async () => {
    try {
      const response = await fetch(`/api/admin/person-history/${personHistoryId}/email-status`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
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
    fetchEmailStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personHistoryId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchEmailStatus();
    if (onRefresh) {
      onRefresh();
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-20 mb-1"></div>
        <div className="h-5 bg-gray-200 rounded w-24"></div>
      </div>
    );
  }

  if (stats.total === 0) {
    return (
      <div className="text-sm text-gray-500">
        No emails sent
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <div>
          <div className="text-sm font-medium text-gray-900">
            {stats.sent} SENT
          </div>
          <div className="text-sm font-medium text-green-600">
            {stats.opened} OPENED
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title={expanded ? "Hide details" : "Show details"}
          >
            {expanded ? (
              <ChevronUpIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            )}
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`p-1 hover:bg-gray-100 rounded transition-colors ${
              refreshing ? 'animate-spin' : ''
            }`}
            title="Refresh email status"
          >
            <ArrowPathIcon className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Sent</th>
                  <th className="px-3 py-2 text-left">Opened</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {recipients.map((recipient) => (
                  <tr key={recipient.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm">
                      {recipient.firstName || recipient.lastName
                        ? `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim()
                        : 'Anonymous'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">
                      {recipient.email}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          recipient.status === 'OPENED'
                            ? 'bg-green-100 text-green-800'
                            : recipient.status === 'SENT'
                            ? 'bg-blue-100 text-blue-800'
                            : recipient.status === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {recipient.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">
                      {recipient.sentAt ? formatDateTime(recipient.sentAt) : '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">
                      {recipient.openedAt ? formatDateTime(recipient.openedAt) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}