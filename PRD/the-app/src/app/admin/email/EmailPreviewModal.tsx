'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface EmailNotificationPreview {
  id: string;
  subject: string;
  htmlContent: string;
  textContent: string | null;
  status: string;
  user: {
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  person?: {
    firstName: string;
    lastName: string;
  } | null;
  template?: {
    name: string;
  } | null;
  createdAt: string;
  scheduledFor: string;
  sentAt: string | null;
  trackingEnabled: boolean;
  webhookUrl: string | null;
  lastMailServerMessage: string | null;
  lastMailServerMessageDate: string | null;
}

interface EmailPreviewModalProps {
  emailId: string;
  onClose: () => void;
}

export default function EmailPreviewModal({ emailId, onClose }: EmailPreviewModalProps) {
  const [email, setEmail] = useState<EmailNotificationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHtml, setShowHtml] = useState(true);

  useEffect(() => {
    async function fetchEmail() {
      try {
        const response = await fetch(`/api/admin/emails/${emailId}`);
        
        if (!response.ok) {
          // Try to get error message from response
          let errorMessage = 'Failed to fetch email';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            // If response is not JSON, use status text
            errorMessage = `${response.status} ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        setEmail(data);
      } catch (err) {
        console.error('Error fetching email:', err);
        setError(err instanceof Error ? err.message : 'Failed to load email');
      } finally {
        setLoading(false);
      }
    }

    fetchEmail();
  }, [emailId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !email) {
    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p className="text-red-600">{error || 'Email not found'}</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Email Preview</h3>
              <p className="text-sm text-gray-600 mt-1">
                To: {email.user.firstName} {email.user.lastName} ({email.user.email})
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Email Details */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Status:</span>{' '}
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                email.status === 'SENT' ? 'bg-green-100 text-green-800' :
                email.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                email.status === 'QUEUED' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {email.status}
              </span>
            </div>
            {email.person && (
              <div>
                <span className="font-medium text-gray-700">Person:</span>{' '}
                {email.person.firstName} {email.person.lastName}
              </div>
            )}
            {email.template && (
              <div>
                <span className="font-medium text-gray-700">Template:</span>{' '}
                {email.template.name}
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700">Created:</span>{' '}
              {new Date(email.createdAt).toLocaleString()}
            </div>
            <div>
              <span className="font-medium text-gray-700">Scheduled:</span>{' '}
              {new Date(email.scheduledFor).toLocaleString()}
            </div>
            {email.sentAt && (
              <div>
                <span className="font-medium text-gray-700">Sent:</span>{' '}
                {new Date(email.sentAt).toLocaleString()}
              </div>
            )}
          </div>
          {(email.trackingEnabled || email.webhookUrl) && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-sm">
                <span className="font-medium text-gray-700">Tracking:</span>{' '}
                <span className={email.trackingEnabled ? 'text-green-600' : 'text-gray-500'}>
                  {email.trackingEnabled ? 'Enabled' : 'Disabled'}
                </span>
                {email.webhookUrl && (
                  <span className="ml-4">
                    <span className="font-medium text-gray-700">Webhook:</span>{' '}
                    <span className="text-gray-600">{email.webhookUrl}</span>
                  </span>
                )}
              </div>
            </div>
          )}
          {email.lastMailServerMessage && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-sm">
                <span className="font-medium text-gray-700">Server Response:</span>{' '}
                <span className={email.status === 'FAILED' ? 'text-red-600' : 'text-green-600'}>
                  {email.lastMailServerMessage}
                </span>
                {email.lastMailServerMessageDate && (
                  <span className="ml-2 text-gray-500">
                    ({new Date(email.lastMailServerMessageDate).toLocaleString()})
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Subject */}
        <div className="px-6 py-4 border-b">
          <h4 className="text-lg font-medium text-gray-900">{email.subject}</h4>
        </div>

        {/* Content Toggle */}
        <div className="px-6 py-3 border-b bg-gray-50">
          <div className="flex gap-4">
            <button
              onClick={() => setShowHtml(true)}
              className={`px-3 py-1 rounded ${
                showHtml
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              HTML Preview
            </button>
            {email.textContent && (
              <button
                onClick={() => setShowHtml(false)}
                className={`px-3 py-1 rounded ${
                  !showHtml
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Text Version
              </button>
            )}
          </div>
        </div>

        {/* Email Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 320px)' }}>
          {showHtml ? (
            <div className="p-6">
              <div className="border rounded-lg bg-white p-4 relative">
                <iframe
                  srcDoc={`
                    <style>
                      body { margin: 0; font-family: Arial, sans-serif; }
                      a { pointer-events: none !important; cursor: default !important; }
                      button { pointer-events: none !important; cursor: default !important; }
                    </style>
                    ${email.htmlContent}
                  `}
                  className="w-full border-0"
                  style={{ minHeight: '400px' }}
                  title="Email HTML Preview"
                  sandbox="allow-same-origin"
                  onLoad={(e) => {
                    const iframe = e.currentTarget;
                    iframe.style.height = iframe.contentWindow?.document.body.scrollHeight + 'px';
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 italic text-center">
                Note: Links and buttons are not clickable in this preview
              </p>
            </div>
          ) : (
            <div className="p-6">
              <pre className="whitespace-pre-wrap font-sans text-gray-800 bg-gray-50 p-4 rounded-lg">
                {email.textContent || 'No text version available'}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}