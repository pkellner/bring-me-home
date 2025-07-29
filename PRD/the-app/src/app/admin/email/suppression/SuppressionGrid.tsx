'use client';

import { useState, useTransition } from 'react';
import {
  MagnifyingGlassIcon,
  TrashIcon,
  PlusIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { SUPPRESSION_REASONS, type SuppressionReason } from '@/lib/email-suppression';
import { removeFromSuppressionList, addToSuppressionList } from '@/app/actions/email-suppression-actions';

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

const reasonColors: Record<string, string> = {
  [SUPPRESSION_REASONS.BOUNCE_PERMANENT]: 'bg-red-100 text-red-800',
  [SUPPRESSION_REASONS.BOUNCE_TRANSIENT]: 'bg-yellow-100 text-yellow-800',
  [SUPPRESSION_REASONS.SPAM_COMPLAINT]: 'bg-red-200 text-red-900',
  [SUPPRESSION_REASONS.MANUAL]: 'bg-gray-100 text-gray-800',
  [SUPPRESSION_REASONS.UNSUBSCRIBE_LINK]: 'bg-blue-100 text-blue-800',
};

export default function SuppressionGrid({
  initialSuppressions,
}: SuppressionGridProps) {
  const [isPending, startTransition] = useTransition();
  const [suppressions, setSuppressions] = useState(initialSuppressions);
  const [searchTerm, setSearchTerm] = useState('');
  const [reasonFilter, setReasonFilter] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newReason, setNewReason] = useState<SuppressionReason>(SUPPRESSION_REASONS.MANUAL);
  const [newReasonDetails, setNewReasonDetails] = useState('');

  // Filter suppressions
  const filteredSuppressions = suppressions.filter(suppression => {
    const matchesSearch = searchTerm === '' || 
      suppression.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (suppression.reasonDetails?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    const matchesReason = reasonFilter === 'ALL' || suppression.reason === reasonFilter;
    
    return matchesSearch && matchesReason;
  });

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
        reason: newReason,
        reasonDetails: newReasonDetails || undefined,
      });
      
      if (result.success && result.suppression) {
        setSuppressions([{
          ...result.suppression,
          createdAt: result.suppression.createdAt.toISOString(),
          updatedAt: result.suppression.updatedAt.toISOString(),
        }, ...suppressions]);
        setShowAddModal(false);
        setNewEmail('');
        setNewReasonDetails('');
      } else {
        alert(`Failed to add suppression: ${result.error}`);
      }
    });
  };

  return (
    <>
      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">
              Search
            </label>
            <div className="mt-1 relative">
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
          
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
              Reason
            </label>
            <select
              id="reason"
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="ALL">All Reasons</option>
              {Object.entries(reasonLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Suppression
            </button>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="bg-white shadow rounded-lg px-6 py-3">
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">{filteredSuppressions.length}</span> of{' '}
          <span className="font-medium">{suppressions.length}</span> suppressions
        </div>
      </div>

      {/* Suppression Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
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
                <tr key={suppression.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{suppression.email}</div>
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
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {suppression.source}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(suppression.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleRemove(suppression.email)}
                      disabled={isPending}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      title="Remove from suppression list"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSuppressions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No suppressed emails found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Suppression Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAddModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                    <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Add Email to Suppression List
                    </h3>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                          Email Address
                        </label>
                        <input
                          type="email"
                          id="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="user@example.com"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                          Reason
                        </label>
                        <select
                          id="reason"
                          value={newReason}
                          onChange={(e) => setNewReason(e.target.value as SuppressionReason)}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          {Object.entries(reasonLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="details" className="block text-sm font-medium text-gray-700">
                          Details (Optional)
                        </label>
                        <textarea
                          id="details"
                          value={newReasonDetails}
                          onChange={(e) => setNewReasonDetails(e.target.value)}
                          rows={3}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="Additional information about why this email is suppressed..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={isPending || !newEmail}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  Add to Suppression List
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}