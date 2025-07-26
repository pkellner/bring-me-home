'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Comment {
  id: string;
  content: string | null;
  hideRequested: boolean;
  createdAt: string;
  personName: string;
  personSlug: string;
  townSlug: string;
}

interface CommentVerificationClientProps {
  token: string;
  email: string;
  totalCount: number;
  hiddenCount: number;
  visibleCount: number;
  comments: Comment[];
  hasAccount?: boolean;
  allowAnonymousComments?: boolean;
  userName?: string;
}

export default function CommentVerificationClient({
  token,
  email,
  totalCount,
  hiddenCount,
  visibleCount,
  comments,
  hasAccount,
  allowAnonymousComments,
  userName,
}: CommentVerificationClientProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async (action: 'hide' | 'unhide') => {
    setIsProcessing(true);
    // Simply navigate to the same page with the action parameter
    // The server component will handle the action and show the result
    window.location.href = `/verify/comments?token=${token}&action=${action}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-6">
            <h1 className="text-3xl font-bold text-white">Manage Your Comments</h1>
            <p className="text-indigo-100 mt-2">Control the visibility of comments associated with {email}</p>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-gray-900">{totalCount}</div>
                <div className="text-sm text-gray-600 mt-1">Total Comments</div>
              </div>
              <div className="bg-green-50 rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-green-600">{visibleCount}</div>
                <div className="text-sm text-gray-600 mt-1">Visible Comments</div>
              </div>
              <div className="bg-red-50 rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-red-600">{hiddenCount}</div>
                <div className="text-sm text-gray-600 mt-1">Hidden Comments</div>
              </div>
            </div>

            <div className="space-y-6 mb-8">
              {hasAccount && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h2 className="font-semibold text-lg mb-2 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Account Settings
                  </h2>
                  <div className="space-y-3">
                    {userName && (
                      <p className="text-gray-700">
                        <span className="font-medium">Account holder:</span> {userName}
                      </p>
                    )}
                    <div className="flex items-start space-x-3">
                      <div className={`mt-1 w-5 h-5 rounded-full flex-shrink-0 ${allowAnonymousComments ? 'bg-green-500' : 'bg-red-500'}`}>
                        <svg className="w-5 h-5 text-white p-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {allowAnonymousComments ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                          )}
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-700">
                          <span className="font-medium">Anonymous comments:</span>{' '}
                          {allowAnonymousComments ? 'Allowed' : 'Blocked'}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {allowAnonymousComments
                            ? 'Anonymous comments posted with your email will be visible immediately after approval.'
                            : 'Anonymous comments posted with your email will be automatically hidden and require your approval to be visible.'}
                        </p>
                        <Link href="/profile" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium mt-2 inline-block">
                          Change this setting in your profile →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h2 className="font-semibold text-lg mb-2">Security Notice</h2>
                <p className="text-gray-700">
                  If you did not write these comments, you can hide them all with one click. 
                  Hidden comments will not be visible on the public website.
                </p>
              </div>

              {visibleCount > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-lg mb-2">Hide All Comments</h3>
                  <p className="text-gray-600 mb-4">
                    This will hide all {visibleCount} visible comment{visibleCount !== 1 ? 's' : ''} from public view.
                  </p>
                  <button
                    onClick={() => handleAction('hide')}
                    disabled={isProcessing}
                    className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isProcessing ? 'Processing...' : 'Hide All Comments'}
                  </button>
                </div>
              )}

              {hiddenCount > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-lg mb-2">Show All Comments</h3>
                  <p className="text-gray-600 mb-4">
                    This will make all {hiddenCount} hidden comment{hiddenCount !== 1 ? 's' : ''} visible again.
                  </p>
                  <button
                    onClick={() => handleAction('unhide')}
                    disabled={isProcessing}
                    className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isProcessing ? 'Processing...' : 'Show All Comments'}
                  </button>
                </div>
              )}
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold text-lg mb-4">Your Comments</h3>
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`border rounded-lg p-4 ${
                      comment.hideRequested ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Link
                          href={`/${comment.townSlug}/${comment.personSlug}`}
                          className="font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          {comment.personName}
                        </Link>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </p>
                        {comment.content && (
                          <p className="mt-2 text-gray-700">{comment.content}</p>
                        )}
                      </div>
                      <div className="ml-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            comment.hideRequested
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {comment.hideRequested ? 'Hidden' : 'Visible'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t text-center">
              {!hasAccount ? (
                <>
                  <p className="text-gray-600 mb-2">
                    Want more control over your comments? Create an account to manage them individually.
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    With an account, you can also control whether anonymous comments posted with your email 
                    are automatically hidden or shown.
                  </p>
                  <div className="space-x-4">
                    <Link
                      href="/auth/register"
                      className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                    >
                      Create Account
                    </Link>
                    <Link
                      href="/auth/signin"
                      className="inline-block bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Sign In
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-gray-600 mb-4">
                    Manage your account settings and individual comments in your profile.
                  </p>
                  <Link
                    href="/profile"
                    className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Go to Profile
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}