'use client';

import { useState, useTransition } from 'react';
import {
  MagnifyingGlassIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  FunnelIcon,
  UserPlusIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { SUPPRESSION_REASONS, SUPPRESSION_SOURCES } from '@/lib/email-suppression-constants';
import { removeFromSuppressionList, addToSuppressionList } from '@/app/actions/email-suppression-actions';
// Removed AddSuppressionModal import - using inline form instead

interface EmailSuppression {
  id: string;
  email: string;
  reason: string;
  reasonDetails: string | null;
  source: string;
  bounceType: string | null;
  bounceSubType: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SuppressionGridProps {
  initialSuppressions: EmailSuppression[];
  initialTotal: number;
  initialPage: number;
  initialTotalPages: number;
}

const reasonLabels: Record<string, string> = {
  [SUPPRESSION_REASONS.BOUNCE_PERMANENT]: 'Permanent Bounce',
  [SUPPRESSION_REASONS.BOUNCE_TRANSIENT]: 'Transient Bounce',
  [SUPPRESSION_REASONS.SPAM_COMPLAINT]: 'Spam Complaint',
  [SUPPRESSION_REASONS.MANUAL]: 'Manual',
  [SUPPRESSION_REASONS.UNSUBSCRIBE_LINK]: 'Unsubscribe Link',
};

const sourceLabels: Record<string, string> = {
  [SUPPRESSION_SOURCES.SES_WEBHOOK]: 'SES Webhook',
  [SUPPRESSION_SOURCES.ADMIN_ACTION]: 'Admin Action',
  [SUPPRESSION_SOURCES.USER_ACTION]: 'User Action',
  [SUPPRESSION_SOURCES.SYSTEM]: 'System',
};

const reasonColors: Record<string, string> = {
  [SUPPRESSION_REASONS.BOUNCE_PERMANENT]: 'bg-red-100 text-red-800 border-red-200',
  [SUPPRESSION_REASONS.BOUNCE_TRANSIENT]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [SUPPRESSION_REASONS.SPAM_COMPLAINT]: 'bg-red-200 text-red-900 border-red-300',
  [SUPPRESSION_REASONS.MANUAL]: 'bg-gray-100 text-gray-800 border-gray-200',
  [SUPPRESSION_REASONS.UNSUBSCRIBE_LINK]: 'bg-blue-100 text-blue-800 border-blue-200',
};

export default function SuppressionGrid({
  initialSuppressions,
}: SuppressionGridProps) {
  const [isPending, startTransition] = useTransition();
  const [suppressions, setSuppressions] = useState(initialSuppressions);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReasons, setSelectedReasons] = useState<Set<string>>(new Set());
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newDetails, setNewDetails] = useState('');

  // Filter suppressions
  const filteredSuppressions = suppressions.filter(suppression => {
    const matchesSearch = searchTerm === '' || 
      suppression.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (suppression.reasonDetails?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    const matchesReason = selectedReasons.size === 0 || selectedReasons.has(suppression.reason);
    
    return matchesSearch && matchesReason;
  });

  const handleReasonToggle = (reason: string) => {
    const newReasons = new Set(selectedReasons);
    if (newReasons.has(reason)) {
      newReasons.delete(reason);
    } else {
      newReasons.add(reason);
    }
    setSelectedReasons(newReasons);
  };

  const handleRemove = async (email: string) => {
    if (!confirm(`Remove ${email} from suppression list? They will be able to receive emails again.`)) {
      return;
    }

    startTransition(async () => {
      const result = await removeFromSuppressionList(email);
      if (result.success) {
        setSuppressions(suppressions.filter(s => s.email !== email));
      } else {
        alert(`Failed to remove suppression: ${result.error}`);
      }
    });
  };

  const handleAdd = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    startTransition(async () => {
      const result = await addToSuppressionList({
        email: newEmail,
        reason: SUPPRESSION_REASONS.MANUAL,
        reasonDetails: newDetails || undefined,
      });
      
      if (result.success && result.suppression) {
        const newSuppression = {
          ...result.suppression,
          createdAt: result.suppression.createdAt.toISOString(),
          updatedAt: result.suppression.updatedAt.toISOString(),
        };
        
        // Add the new suppression to the top of the list
        setSuppressions([newSuppression, ...suppressions]);
        
        // Reset form
        setNewEmail('');
        setNewDetails('');
        setShowInlineForm(false);
      } else {
        alert(`Failed to add suppression: ${result.error}`);
      }
    });
  };

  const handleCancel = () => {
    setNewEmail('');
    setNewDetails('');
    setShowInlineForm(false);
  };

  return (
    <>
      {/* Header */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Email Suppression Management</h2>
            <p className="mt-1 text-sm text-gray-600">
              Emails in this list will not receive any communications from the system
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              Total: <span className="font-semibold text-gray-900">{suppressions.length}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <div className="space-y-4">
          {/* Search and Add Button */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Search email or details..."
                />
              </div>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => setShowInlineForm(!showInlineForm)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <UserPlusIcon className="h-4 w-4 mr-2" />
                Add Suppression
              </button>
            </div>
          </div>

          {/* Inline Add Form */}
          {showInlineForm && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="inline-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="inline-email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="user@example.com"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="inline-details" className="block text-sm font-medium text-gray-700 mb-1">
                    Details
                  </label>
                  <input
                    type="text"
                    id="inline-details"
                    value={newDetails}
                    onChange={(e) => setNewDetails(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Short reason for suppression"
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={isPending || !newEmail}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Type: Admin Action, Reason: Manual
              </p>
            </div>
          )}
          
          {/* Reason Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FunnelIcon className="h-4 w-4 inline mr-1" />
              Filter by Reason
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(reasonLabels).map(([value, label]) => {
                const isSelected = selectedReasons.has(value);
                return (
                  <button
                    key={value}
                    onClick={() => handleReasonToggle(value)}
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                      isSelected
                        ? reasonColors[value] + ' ring-2 ring-offset-1'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {isSelected && <CheckIcon className="h-3 w-3 mr-1" />}
                    {label}
                  </button>
                );
              })}
              {selectedReasons.size > 0 && (
                <button
                  onClick={() => setSelectedReasons(new Set())}
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors duration-200"
                >
                  <XMarkIcon className="h-3 w-3 mr-1" />
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="bg-white shadow-sm rounded-lg px-6 py-3 mb-4">
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">{filteredSuppressions.length}</span> of{' '}
          <span className="font-medium">{suppressions.length}</span> suppressions
          {searchTerm && <span className="text-gray-500 ml-2">(filtered by search)</span>}
          {selectedReasons.size > 0 && <span className="text-gray-500 ml-2">(filtered by {selectedReasons.size} reason{selectedReasons.size > 1 ? 's' : ''})</span>}
        </div>
      </div>

      {/* Suppression Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Added
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSuppressions.map((suppression) => (
                <tr key={suppression.id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <div className="text-sm font-medium text-gray-900">{suppression.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      reasonColors[suppression.reason] || 'bg-gray-100 text-gray-800'
                    }`}>
                      {reasonLabels[suppression.reason] || suppression.reason}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {suppression.bounceType && (
                        <div>
                          <span className="font-medium">Bounce:</span> {suppression.bounceType}
                          {suppression.bounceSubType && ` - ${suppression.bounceSubType}`}
                        </div>
                      )}
                      {suppression.reasonDetails && (
                        <div className="text-gray-600 truncate max-w-xs" title={suppression.reasonDetails}>
                          {suppression.reasonDetails}
                        </div>
                      )}
                      {!suppression.bounceType && !suppression.reasonDetails && (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {sourceLabels[suppression.source] || suppression.source}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(suppression.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleRemove(suppression.email)}
                      disabled={isPending}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50 transition-colors duration-200"
                      title="Remove from suppression list"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSuppressions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <EnvelopeIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-sm font-medium">No suppressed emails found</p>
                      {(searchTerm || selectedReasons.size > 0) && (
                        <p className="text-xs mt-1">Try adjusting your filters</p>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </>
  );
}