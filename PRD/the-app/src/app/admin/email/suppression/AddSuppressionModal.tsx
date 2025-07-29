'use client';

import { useEffect, useRef } from 'react';
import {
  ExclamationTriangleIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import { SUPPRESSION_REASONS, type SuppressionReason } from '@/lib/email-suppression-constants';

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

interface AddSuppressionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: () => void;
  newEmail: string;
  setNewEmail: (email: string) => void;
  newReason: SuppressionReason;
  setNewReason: (reason: SuppressionReason) => void;
  newReasonDetails: string;
  setNewReasonDetails: (details: string) => void;
  existingSuppression: EmailSuppression | null;
  showOverwriteConfirm: boolean;
  checkExistingEmail: () => void;
  isPending: boolean;
}

const reasonLabels: Record<string, string> = {
  [SUPPRESSION_REASONS.BOUNCE_PERMANENT]: 'Permanent Bounce',
  [SUPPRESSION_REASONS.BOUNCE_TRANSIENT]: 'Transient Bounce',
  [SUPPRESSION_REASONS.SPAM_COMPLAINT]: 'Spam Complaint',
  [SUPPRESSION_REASONS.MANUAL]: 'Manual',
  [SUPPRESSION_REASONS.UNSUBSCRIBE_LINK]: 'Unsubscribe Link',
};

export default function AddSuppressionModal({
  isOpen,
  onClose,
  onAdd,
  newEmail,
  setNewEmail,
  newReason,
  setNewReason,
  newReasonDetails,
  setNewReasonDetails,
  existingSuppression,
  showOverwriteConfirm,
  checkExistingEmail,
  isPending,
}: AddSuppressionModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      // Focus the email input when modal opens
      const emailInput = document.getElementById('modal-email');
      if (emailInput) {
        (emailInput as HTMLInputElement).focus();
      }
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          aria-hidden="true"
          onClick={onClose}
        />

        {/* This element is to trick the browser into centering the modal contents. */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal panel */}
        <div 
          ref={modalRef}
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
        >
          <form onSubmit={(e) => { e.preventDefault(); onAdd(); }}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                  <UserPlusIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    Add Email to Suppression List
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    This email will not receive any communications from the system.
                  </p>
                  
                  {showOverwriteConfirm && existingSuppression && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div className="flex">
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-yellow-800">This email is already suppressed</p>
                          <div className="mt-2 text-yellow-700">
                            <p><span className="font-medium">Reason:</span> {reasonLabels[existingSuppression.reason]}</p>
                            {existingSuppression.reasonDetails && (
                              <p><span className="font-medium">Details:</span> {existingSuppression.reasonDetails}</p>
                            )}
                            <p><span className="font-medium">Added:</span> {new Date(existingSuppression.createdAt).toLocaleDateString()}</p>
                          </div>
                          <p className="mt-2 text-yellow-800 font-medium">Do you want to update this suppression?</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="modal-email" className="block text-sm font-medium text-gray-700">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="modal-email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        onBlur={checkExistingEmail}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                        placeholder="user@example.com"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="modal-reason" className="block text-sm font-medium text-gray-700">
                        Reason
                      </label>
                      <select
                        id="modal-reason"
                        value={newReason}
                        onChange={(e) => setNewReason(e.target.value as SuppressionReason)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                      >
                        {Object.entries(reasonLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="modal-details" className="block text-sm font-medium text-gray-700">
                        Details (Optional)
                      </label>
                      <textarea
                        id="modal-details"
                        value={newReasonDetails}
                        onChange={(e) => setNewReasonDetails(e.target.value)}
                        rows={3}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                        placeholder="Additional information about why this email is suppressed..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isPending || !newEmail}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 transition-colors duration-200"
              >
                {showOverwriteConfirm ? 'Update Suppression' : 'Add to Suppression List'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}