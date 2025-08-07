'use client';

import { useEffect, useRef, useState } from 'react';
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
  privateNoteToFamily?: string;
  wantsToHelpMore: boolean;
  displayNameOnly: boolean;
  requiresFamilyApproval: boolean;
  showOccupation?: boolean;
  showBirthdate?: boolean;
  showCityState?: boolean;
  showComment?: boolean;
}

interface CommentConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  commentData: CommentData;
  isSubmitting?: boolean;
  title?: string;
  description?: string;
  confirmButtonText?: string;
  warningMessage?: string | null;
  isHistoryComment?: boolean; // Add flag to indicate if it's a history comment
}

export default function CommentConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
  commentData,
  isSubmitting = false,
  title = "Review Your Support Message",
  description = "Your message is being reviewed by the family to make sure it is OK with them.",
  confirmButtonText = "OK, Post My Support",
  warningMessage,
  isHistoryComment = false,
}: CommentConfirmationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Handle opening animation
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300); // Match transition duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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

  if (!isVisible) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 ${
          isAnimating ? 'bg-opacity-50' : 'bg-opacity-0'
        }`}
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          tabIndex={-1}
          className={`relative bg-white rounded-lg max-w-md w-full shadow-xl transform transition-all duration-300 ${
            isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
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
                {title}
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                {description}
              </p>
            </div>

            {/* Warning message if email is blocked */}
            {warningMessage && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Comment Will Be Hidden by Default
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>{warningMessage}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Summary of submission */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                {isHistoryComment ? 'Your Comment:' : 'Your Submission:'}
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
                    <span className="font-medium text-gray-700">{isHistoryComment ? 'Comment:' : 'Message:'}</span>
                    <p className="text-gray-900 mt-1">{commentData.content}</p>
                  </div>
                )}

                {commentData.privateNoteToFamily && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <span className="font-medium text-gray-700">Private Note to Family:</span>
                    <p className="text-gray-900 mt-1">{commentData.privateNoteToFamily}</p>
                    <p className="text-xs text-yellow-800 mt-2">
                      This message will only be visible to the family, not publicly.
                    </p>
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
                      Display just my name as supporting (hide occupation, age, and location)
                    </li>
                  )}
                  {commentData.showComment && commentData.content && (
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
                      Display my comment text
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
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center space-x-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Posting...</span>
                  </span>
                ) : (
                  confirmButtonText
                )}
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
