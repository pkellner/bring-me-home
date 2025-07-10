'use client';

import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import {
  approveComment,
  rejectComment,
  updateCommentAndApprove,
} from '@/app/actions/comments';

interface Comment extends Record<string, unknown> {
  id: string;
  content: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  occupation: string | null;
  birthdate: Date | null;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  showOccupation: boolean;
  showBirthdate: boolean;
  showCityState: boolean;
  wantsToHelpMore: boolean;
  displayNameOnly: boolean;
  requiresFamilyApproval: boolean;
  type: string;
  visibility: string;
  familyVisibilityOverride: string | null;
  isActive: boolean;
  isApproved: boolean;
  moderatorNotes: string | null;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    town: {
      name: string;
      id: string;
      state: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

interface CommentModerationModalProps {
  comment: Comment;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (commentId: string, approved: boolean, updatedData?: Partial<Comment>) => void;
}

export default function CommentModerationModal({
  comment,
  isOpen,
  onClose,
  onUpdate,
}: CommentModerationModalProps) {
  const [editedContent, setEditedContent] = useState(comment.content || '');
  const [editedOccupation, setEditedOccupation] = useState(
    comment.occupation || ''
  );
  const [editedBirthdate, setEditedBirthdate] = useState(
    comment.birthdate
      ? new Date(comment.birthdate).toISOString().split('T')[0]
      : ''
  );
  const [showOccupation, setShowOccupation] = useState(comment.showOccupation);
  const [showBirthdate, setShowBirthdate] = useState(comment.showBirthdate);
  const [moderatorNotes, setModeratorNotes] = useState(
    comment.moderatorNotes || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const hasChanges =
        editedContent !== comment.content ||
        editedOccupation !== (comment.occupation || '') ||
        editedBirthdate !==
          (comment.birthdate
            ? new Date(comment.birthdate).toISOString().split('T')[0]
            : '') ||
        showOccupation !== comment.showOccupation ||
        showBirthdate !== comment.showBirthdate;

      if (hasChanges) {
        await updateCommentAndApprove(
          comment.id,
          editedContent,
          moderatorNotes,
          {
            occupation: editedOccupation || undefined,
            birthdate: editedBirthdate || undefined,
            showOccupation,
            showBirthdate,
          }
        );
        onUpdate(comment.id, true, {
          content: editedContent,
          occupation: editedOccupation || null,
          birthdate: editedBirthdate ? new Date(editedBirthdate) : null,
          showOccupation,
          showBirthdate,
          moderatorNotes,
        });
      } else {
        await approveComment(comment.id, moderatorNotes);
        onUpdate(comment.id, true, { moderatorNotes });
      }
      onClose();
    } catch (error) {
      console.error('Failed to approve comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!moderatorNotes.trim()) {
      alert('Please provide a reason for rejection in the moderator notes.');
      return;
    }

    setIsSubmitting(true);
    try {
      await rejectComment(comment.id, moderatorNotes);
      onUpdate(comment.id, false, { moderatorNotes });
      onClose();
    } catch (error) {
      console.error('Failed to reject comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Moderate Comment
              </h3>
              <button
                type="button"
                className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                onClick={onClose}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Commenter Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">
                  Commenter Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Name:</span>{' '}
                    {comment.firstName} {comment.lastName}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span>{' '}
                    {comment.email || 'Not provided'}
                  </div>
                  <div>
                    <span className="font-medium">Phone:</span>{' '}
                    {comment.phone || 'Not provided'}
                  </div>
                  <div>
                    <span className="font-medium">Date:</span>{' '}
                    {new Date(comment.createdAt).toLocaleString()}
                  </div>
                  {comment.occupation && (
                    <div>
                      <span className="font-medium">Occupation:</span>{' '}
                      {comment.occupation}
                    </div>
                  )}
                  {comment.birthdate && (
                    <div>
                      <span className="font-medium">Birth Date:</span>{' '}
                      {new Date(comment.birthdate).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="mt-3 space-y-1">
                  {comment.wantsToHelpMore && (
                    <div className="text-sm text-green-700 bg-green-100 px-2 py-1 rounded inline-block">
                      ✓ Wants to provide letter of support
                    </div>
                  )}
                  {comment.displayNameOnly && (
                    <div className="text-sm text-blue-700 bg-blue-100 px-2 py-1 rounded inline-block ml-2">
                      ✓ Display name only
                    </div>
                  )}
                  {comment.requiresFamilyApproval && (
                    <div className="text-sm text-yellow-700 bg-yellow-100 px-2 py-1 rounded inline-block ml-2">
                      ✓ Requires family approval
                    </div>
                  )}
                </div>
              </div>

              {/* Person Information */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-1">Supporting</h4>
                <p className="text-sm">
                  {comment.person.firstName} {comment.person.lastName}
                </p>
              </div>

              {/* Comment Content */}
              <div>
                <label
                  htmlFor="content"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Comment Content (you can edit this before approving)
                </label>
                <textarea
                  id="content"
                  rows={6}
                  value={editedContent}
                  onChange={e => setEditedContent(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="No comment provided - supporter is showing support only"
                />
              </div>

              {/* Additional Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="occupation"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Occupation
                  </label>
                  <input
                    type="text"
                    id="occupation"
                    value={editedOccupation}
                    onChange={e => setEditedOccupation(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="e.g., Teacher, Engineer"
                  />
                  <label className="flex items-center mt-1">
                    <input
                      type="checkbox"
                      checked={showOccupation}
                      onChange={e => setShowOccupation(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-600">
                      Show occupation publicly
                    </span>
                  </label>
                </div>

                <div>
                  <label
                    htmlFor="birthdate"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Birth Date
                  </label>
                  <input
                    type="date"
                    id="birthdate"
                    value={editedBirthdate}
                    onChange={e => setEditedBirthdate(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  <label className="flex items-center mt-1">
                    <input
                      type="checkbox"
                      checked={showBirthdate}
                      onChange={e => setShowBirthdate(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-600">
                      Show birthdate publicly
                    </span>
                  </label>
                </div>
              </div>

              {/* Moderator Notes */}
              <div>
                <label
                  htmlFor="moderatorNotes"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Moderator Notes (internal only)
                </label>
                <textarea
                  id="moderatorNotes"
                  rows={3}
                  value={moderatorNotes}
                  onChange={e => setModeratorNotes(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Add any internal notes about this comment..."
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleApprove}
              className="inline-flex w-full justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 sm:ml-3 sm:w-auto disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : 'Approve & Publish'}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleReject}
              className="mt-3 inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:mt-0 sm:w-auto disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : 'Reject'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
