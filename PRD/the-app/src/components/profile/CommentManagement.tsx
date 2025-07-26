'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  toggleCommentVisibility,
  deleteUserComment,
  bulkUpdateComments,
} from '@/app/actions/user-comments';

interface Comment {
  id: string;
  content: string | null;
  createdAt: Date;
  hideRequested: boolean;
  isActive: boolean;
  isApproved: boolean;
}

interface PersonGroup {
  person: {
    id: string;
    name: string;
    slug: string;
    townSlug: string;
  };
  comments: Comment[];
}

interface CommentManagementProps {
  userId: string;
  comments: Array<{
    id: string;
    content: string | null;
    createdAt: Date;
    hideRequested: boolean;
    isActive: boolean;
    isApproved: boolean;
    personName: string;
    personSlug: string;
    townSlug: string;
  }>;
  groupedByPerson: Record<string, PersonGroup>;
}

export default function CommentManagement({
  userId,
  comments,
  groupedByPerson,
}: CommentManagementProps) {
  const [expandedSection, setExpandedSection] = useState(false);
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
  const [processingComment, setProcessingComment] = useState<string | null>(null);
  const [processingBulk, setProcessingBulk] = useState<string | null>(null);

  const activeComments = comments.filter(c => c.isActive);
  const totalCount = activeComments.length;
  const hiddenCount = activeComments.filter(c => c.hideRequested).length;
  const visibleCount = totalCount - hiddenCount;
  const peopleCount = Object.keys(groupedByPerson).length;

  const handleToggleVisibility = async (commentId: string) => {
    setProcessingComment(commentId);
    try {
      await toggleCommentVisibility(commentId, userId);
    } catch (error) {
      console.error('Error toggling visibility:', error);
      alert('Failed to update comment visibility');
    } finally {
      setProcessingComment(null);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
      return;
    }
    
    setProcessingComment(commentId);
    try {
      await deleteUserComment(commentId, userId);
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment');
    } finally {
      setProcessingComment(null);
    }
  };

  const handleBulkAction = async (action: 'hide' | 'show' | 'delete') => {
    let message = '';
    switch (action) {
      case 'hide':
        message = 'Are you sure you want to hide all your comments?';
        break;
      case 'show':
        message = 'Are you sure you want to show all your comments?';
        break;
      case 'delete':
        message = 'Are you sure you want to delete all your comments? This action cannot be undone.';
        break;
    }

    if (!confirm(message)) {
      return;
    }

    setProcessingBulk(action);
    try {
      await bulkUpdateComments(action, userId);
    } catch (error) {
      console.error('Error with bulk action:', error);
      alert('Failed to update comments');
    } finally {
      setProcessingBulk(null);
    }
  };

  if (totalCount === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <button
        onClick={() => setExpandedSection(!expandedSection)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="text-left">
          <h2 className="text-lg font-semibold text-gray-900">My Comments</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage visibility of comments linked to your email
          </p>
          <p className="text-sm text-gray-500 mt-1">
            You have {totalCount} comment{totalCount !== 1 ? 's' : ''} across {peopleCount} {peopleCount === 1 ? 'person' : 'people'}
          </p>
        </div>
        <svg
          className={`h-5 w-5 text-gray-400 transition-transform ${
            expandedSection ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {expandedSection && (
        <div className="border-t">
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
                <div className="text-sm text-gray-600">Total Comments</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{visibleCount}</div>
                <div className="text-sm text-gray-600">Visible</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{hiddenCount}</div>
                <div className="text-sm text-gray-600">Hidden</div>
              </div>
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
              <button
                onClick={() => handleBulkAction('hide')}
                disabled={processingBulk !== null || visibleCount === 0}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processingBulk === 'hide' ? 'Processing...' : 'Hide All Comments'}
              </button>
              <button
                onClick={() => handleBulkAction('show')}
                disabled={processingBulk !== null || hiddenCount === 0}
                className="px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processingBulk === 'show' ? 'Processing...' : 'Show All Comments'}
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                disabled={processingBulk !== null}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processingBulk === 'delete' ? 'Processing...' : 'Delete All Comments'}
              </button>
            </div>

            <div className="space-y-2">
              {Object.entries(groupedByPerson).map(([personId, group]) => {
                const personComments = group.comments.filter(c => c.isActive);
                const isExpanded = expandedPerson === personId;
                
                return (
                  <div key={personId} className="border rounded-lg">
                    <button
                      onClick={() => setExpandedPerson(isExpanded ? null : personId)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/${group.person.townSlug}/${group.person.slug}`}
                          className="font-medium text-indigo-600 hover:text-indigo-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {group.person.name}
                        </Link>
                        <span className="text-sm text-gray-500">
                          ({personComments.length} comment{personComments.length !== 1 ? 's' : ''})
                        </span>
                      </div>
                      <svg
                        className={`h-4 w-4 text-gray-400 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {isExpanded && (
                      <div className="border-t p-4 space-y-3">
                        {personComments.map((comment) => (
                          <div
                            key={comment.id}
                            className={`p-3 rounded-lg border ${
                              comment.hideRequested
                                ? 'bg-red-50 border-red-200'
                                : 'bg-white border-gray-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-500">
                                  {new Date(comment.createdAt).toLocaleDateString()}
                                </p>
                                {comment.content && (
                                  <p className="mt-1 text-sm text-gray-700 break-words">
                                    {comment.content.length > 100
                                      ? comment.content.substring(0, 100) + '...'
                                      : comment.content}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    comment.isApproved
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-yellow-100 text-yellow-700'
                                  }`}
                                >
                                  {comment.isApproved ? 'Approved by family' : 'Awaiting approval'}
                                </span>
                                <span
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    comment.hideRequested
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-green-100 text-green-700'
                                  }`}
                                >
                                  {comment.hideRequested ? 'Hidden' : 'Visible'}
                                </span>
                                <button
                                  onClick={() => handleToggleVisibility(comment.id)}
                                  disabled={processingComment === comment.id}
                                  className="text-sm text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                                >
                                  {processingComment === comment.id
                                    ? 'Processing...'
                                    : comment.hideRequested
                                    ? 'Show'
                                    : 'Hide'}
                                </button>
                                <button
                                  onClick={() => handleDelete(comment.id)}
                                  disabled={processingComment === comment.id}
                                  className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                                >
                                  {processingComment === comment.id ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}