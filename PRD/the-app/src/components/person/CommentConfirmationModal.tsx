'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface CommentData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  occupation?: string;
  birthdate?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  content?: string;
  wantsToHelpMore: boolean;
  displayNameOnly: boolean;
  requiresFamilyApproval: boolean;
  showOccupation?: boolean;
  showBirthdate?: boolean;
  showCityState?: boolean;
}

interface CommentConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  commentData: CommentData;
}

export default function CommentConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
  commentData,
}: CommentConfirmationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          tabIndex={-1}
          className="relative bg-white rounded-lg max-w-md w-full shadow-xl transform transition-all"
        >
          <div className="p-6">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <svg
                  className="h-6 w-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                Review Your Support Message
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Your message is being reviewed by the family to make sure it is
                OK with them.
              </p>
            </div>

            {/* Summary of submission */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Your Submission:
              </h4>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Name:</span>{' '}
                  <span className="text-gray-900">
                    {commentData.firstName} {commentData.lastName}
                  </span>
                </div>

                {commentData.email && (
                  <div>
                    <span className="font-medium text-gray-700">Email:</span>{' '}
                    <span className="text-gray-900">{commentData.email}</span>
                  </div>
                )}

                {commentData.phone && (
                  <div>
                    <span className="font-medium text-gray-700">Phone:</span>{' '}
                    <span className="text-gray-900">{commentData.phone}</span>
                  </div>
                )}

                {commentData.occupation && (
                  <div>
                    <span className="font-medium text-gray-700">
                      Occupation:
                    </span>{' '}
                    <span className="text-gray-900">
                      {commentData.occupation}
                    </span>
                  </div>
                )}

                {commentData.birthdate && (
                  <div>
                    <span className="font-medium text-gray-700">
                      Birth Date:
                    </span>{' '}
                    <span className="text-gray-900">
                      {new Date(commentData.birthdate).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {commentData.content && (
                  <div>
                    <span className="font-medium text-gray-700">Message:</span>
                    <p className="text-gray-900 mt-1">{commentData.content}</p>
                  </div>
                )}
              </div>

              {/* Selected preferences */}
              <div className="mt-4 pt-3 border-t border-gray-200">
                <h5 className="text-sm font-medium text-gray-900 mb-2">
                  Your selected preferences:
                </h5>
                <ul className="space-y-1 text-sm text-gray-700">
                  {commentData.wantsToHelpMore && (
                    <li className="flex items-start">
                      <svg
                        className="h-4 w-4 text-green-500 mt-0.5 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      I want to help more, please contact me
                    </li>
                  )}
                  {commentData.displayNameOnly && (
                    <li className="flex items-start">
                      <svg
                        className="h-4 w-4 text-green-500 mt-0.5 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Display just my name as supporting
                    </li>
                  )}
                  {commentData.requiresFamilyApproval && (
                    <li className="flex items-start">
                      <svg
                        className="h-4 w-4 text-green-500 mt-0.5 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Display my name and comment if family approves
                    </li>
                  )}
                  {commentData.showOccupation && commentData.occupation && (
                    <li className="flex items-start">
                      <svg
                        className="h-4 w-4 text-green-500 mt-0.5 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Show my occupation publicly
                    </li>
                  )}
                  {commentData.showBirthdate && commentData.birthdate && (
                    <li className="flex items-start">
                      <svg
                        className="h-4 w-4 text-green-500 mt-0.5 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Show my birthdate publicly
                    </li>
                  )}
                  {commentData.showCityState &&
                    commentData.city &&
                    commentData.state && (
                      <li className="flex items-start">
                        <svg
                          className="h-4 w-4 text-green-500 mt-0.5 mr-2"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Show my city and state publicly
                      </li>
                    )}
                </ul>
              </div>

              {/* Address Privacy Notice */}
              {(commentData.streetAddress ||
                commentData.city ||
                commentData.state ||
                commentData.zipCode) && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Address Privacy:</strong> Your full address (
                    {commentData.streetAddress &&
                      `${commentData.streetAddress}, `}
                    {commentData.city}, {commentData.state}{' '}
                    {commentData.zipCode}) will be stored securely but NEVER
                    displayed publicly.{' '}
                    {commentData.showCityState
                      ? 'Only your city and state will be shown.'
                      : 'Your location will not be shown publicly.'}
                  </p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                OK, Post My Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Portal to render modal at document root
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
}
