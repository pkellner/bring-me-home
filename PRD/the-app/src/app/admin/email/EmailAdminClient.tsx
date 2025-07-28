'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUsersFromCommentEmails, retryFailedEmails } from '@/app/actions/email-notifications';
import { 
  EnvelopeIcon, 
  UserPlusIcon, 
  ArrowPathIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  PaperAirplaneIcon,
  XCircleIcon,
  InboxIcon,
} from '@heroicons/react/24/outline';

interface EmailStats {
  total: number;
  byStatus: Record<string, number>;
}

interface EmailAdminClientProps {
  initialStats: EmailStats;
}

const statusColors: Record<string, string> = {
  QUEUED: 'bg-yellow-100 text-yellow-800',
  SENDING: 'bg-blue-100 text-blue-800',
  SENT: 'bg-green-100 text-green-800',
  DELIVERED: 'bg-green-200 text-green-900',
  FAILED: 'bg-red-100 text-red-800',
  BOUNCED: 'bg-red-200 text-red-900',
  OPENED: 'bg-purple-100 text-purple-800',
};

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  QUEUED: ClockIcon,
  SENDING: PaperAirplaneIcon,
  SENT: CheckCircleIcon,
  DELIVERED: CheckCircleIcon,
  FAILED: XCircleIcon,
  BOUNCED: ExclamationCircleIcon,
  OPENED: EnvelopeIcon,
};

export default function EmailAdminClient({ initialStats }: EmailAdminClientProps) {
  const router = useRouter();
  const [stats, setStats] = useState(initialStats);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [createUsersResult, setCreateUsersResult] = useState<{ created: number; skipped: number } | null>(null);

  const handleCreateUsers = async () => {
    if (!confirm('This will create user accounts for all commenter emails that don\'t already have accounts. Continue?')) {
      return;
    }
    
    setMessage(null);
    setCreateUsersResult(null);
    
    startTransition(async () => {
      const result = await createUsersFromCommentEmails();
      
      if (result.success) {
        setCreateUsersResult({ created: result.created || 0, skipped: result.skipped || 0 });
        setMessage({
          type: 'success',
          text: `Successfully created ${result.created} user accounts (${result.skipped} emails already had accounts)`,
        });
        router.refresh();
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to create users',
        });
      }
    });
  };

  const handleRetryFailed = async () => {
    const failedCount = stats.byStatus.FAILED || 0;
    if (!failedCount) {
      setMessage({
        type: 'error',
        text: 'No failed emails to retry',
      });
      return;
    }
    
    if (!confirm(`Retry all ${failedCount} failed emails?`)) {
      return;
    }
    
    setMessage(null);
    
    startTransition(async () => {
      const result = await retryFailedEmails();
      
      if (result.success) {
        setMessage({
          type: 'success',
          text: `Successfully queued ${result.retriedCount} emails for retry`,
        });
        // Update stats
        const newStats = { ...stats };
        newStats.byStatus.FAILED = (newStats.byStatus.FAILED || 0) - (result.retriedCount || 0);
        newStats.byStatus.QUEUED = (newStats.byStatus.QUEUED || 0) + (result.retriedCount || 0);
        setStats(newStats);
        router.refresh();
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to retry emails',
        });
      }
    });
  };

  const handleProcessEmails = async () => {
    setMessage(null);
    
    startTransition(async () => {
      try {
        // First, change all QUEUED emails to SENDING status
        const updateResponse = await fetch('/api/admin/emails/process-queue', {
          method: 'POST',
        });
        
        if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          setMessage({
            type: 'error',
            text: errorData.error || 'Failed to update email queue',
          });
          return;
        }
        
        const updateData = await updateResponse.json();
        
        // If no emails were updated, show message
        if (updateData.count === 0) {
          setMessage({
            type: 'error',
            text: 'No queued emails found to process',
          });
          return;
        }
        
        // Now trigger the cron job to process the emails
        const response = await fetch('/api/cron/send-emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ''}`,
          },
        });
        
        const data = await response.json();
        
        if (data.success) {
          setMessage({
            type: 'success',
            text: `Marked ${updateData.count} emails for sending. Processed ${data.results.processed} emails: ${data.results.sent} sent, ${data.results.failed} failed`,
          });
          router.refresh();
        } else {
          setMessage({
            type: 'error',
            text: data.error || 'Failed to process emails',
          });
        }
      } catch {
        setMessage({
          type: 'error',
          text: 'Failed to trigger email processing',
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Email Actions</h2>
        
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex">
              {message.type === 'success' ? (
                <CheckCircleIcon className="h-5 w-5 mr-2" />
              ) : (
                <ExclamationCircleIcon className="h-5 w-5 mr-2" />
              )}
              <span>{message.text}</span>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center">
              <UserPlusIcon className="h-5 w-5 mr-2" />
              Create Users from Comments
            </h3>
            <p className="text-base text-gray-600 mb-4">
              Automatically create user accounts for people who have left comments with their email addresses.
              They will need to reset their password to log in.
            </p>
            <button
              onClick={handleCreateUsers}
              disabled={isPending}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Creating...' : 'Create User Accounts'}
            </button>
            
            {createUsersResult && (
              <div className="mt-3 text-base">
                <div className="text-green-600 font-medium">✓ Created: {createUsersResult.created} accounts</div>
                <div className="text-gray-600 font-medium">⚬ Skipped: {createUsersResult.skipped} (already exist)</div>
              </div>
            )}
          </div>
          
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center">
              <ArrowPathIcon className="h-5 w-5 mr-2" />
              Retry Failed Emails
            </h3>
            <p className="text-base text-gray-600 mb-4">
              Retry sending all emails that failed to send. This will move them back to the queue 
              for another delivery attempt.
            </p>
            <button
              onClick={handleRetryFailed}
              disabled={isPending || !stats.byStatus.FAILED}
              className="w-full bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Retrying...' : `Retry ${stats.byStatus.FAILED || 0} Failed Emails`}
            </button>
          </div>
          
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center">
              <PaperAirplaneIcon className="h-5 w-5 mr-2" />
              Process Email Queue
            </h3>
            <p className="text-base text-gray-600 mb-4">
              Manually trigger the email worker to process queued emails. This is normally done automatically 
              every 5 minutes.
            </p>
            <button
              onClick={handleProcessEmails}
              disabled={isPending}
              className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Processing...' : 'Process Email Queue Now'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Email Statistics */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <InboxIcon className="h-5 w-5 mr-2" />
          Email Statistics
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-base text-gray-700 font-medium">Total</div>
          </div>
          
          {Object.entries(stats.byStatus)
            .sort(([a], [b]) => {
              // Sort by status order: QUEUED, SENDING, SENT, DELIVERED, OPENED, FAILED, BOUNCED
              const order = ['QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'OPENED', 'FAILED', 'BOUNCED'];
              return order.indexOf(a) - order.indexOf(b);
            })
            .map(([status, count]) => {
            const Icon = statusIcons[status] || EnvelopeIcon;
            return (
              <div key={status} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <Icon className="h-4 w-4 text-gray-600" />
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusColors[status]}`}>
                    {status}
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-sm text-gray-600">
                  {stats.total > 0 ? `${((count / stats.total) * 100).toFixed(0)}%` : '0%'}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Status Legend */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Status Definitions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-base">
            <div className="text-gray-700"><span className="font-semibold text-gray-900">QUEUED:</span> Waiting to be sent</div>
            <div className="text-gray-700"><span className="font-semibold text-gray-900">SENDING:</span> Currently being processed</div>
            <div className="text-gray-700"><span className="font-semibold text-gray-900">SENT:</span> Successfully sent to email provider</div>
            <div className="text-gray-700"><span className="font-semibold text-gray-900">DELIVERED:</span> Confirmed delivered to inbox</div>
            <div className="text-gray-700"><span className="font-semibold text-gray-900">FAILED:</span> Failed to send (can be retried)</div>
            <div className="text-gray-700"><span className="font-semibold text-gray-900">BOUNCED:</span> Email address invalid or inactive</div>
            <div className="text-gray-700"><span className="font-semibold text-gray-900">OPENED:</span> Recipient opened the email</div>
          </div>
        </div>
      </div>
      
      {/* Email Templates Link */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Email Templates</h2>
        <p className="text-base text-gray-700 mb-4">
          Create and manage reusable email templates with variable substitution for consistent messaging.
        </p>
        <Link
          href="/admin/email/templates"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Manage Templates
        </Link>
      </div>
      
      {/* Future Enhancement Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-base font-medium text-blue-900 mb-2">Coming Soon</h3>
        <ul className="text-base text-blue-800 space-y-1">
          <li>• Scheduled email campaigns</li>
          <li>• Webhook integration for delivery tracking</li>
          <li>• Advanced email analytics and engagement metrics</li>
        </ul>
      </div>
    </div>
  );
}