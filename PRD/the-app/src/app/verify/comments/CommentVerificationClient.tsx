'use client';

import { useState } from 'react';
import Link from 'next/link';
import CommentHideToggle from '@/components/admin/CommentHideToggle';
import AnonymousCommentsToggle from '@/components/admin/AnonymousCommentsToggle';

interface Comment {
  id: string;
  content: string | null;
  hideRequested: boolean;
  createdAt: string;
  personName: string;
  personSlug: string;
  townSlug: string;
  isUpdateComment: boolean;
  updateDescription: string | null;
}

interface CommentVerificationClientProps {
  token: string | null;
  email: string;
  totalCount: number;
  hiddenCount: number;
  visibleCount: number;
  comments: Comment[];
  hasAccount?: boolean;
  allowAnonymousComments?: boolean;
  userName?: string;
  username?: string;
  isAdmin?: boolean;
}

export default function CommentVerificationClient({
  token,
  email,
  totalCount,
  hiddenCount,
  visibleCount,
  comments: initialComments,
  hasAccount,
  allowAnonymousComments,
  userName,
  username,
  isAdmin,
}: CommentVerificationClientProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [comments, setComments] = useState(initialComments);
  const [currentAllowAnonymousComments, setCurrentAllowAnonymousComments] = useState(allowAnonymousComments ?? true);

  const handleAction = async (action: 'hide' | 'unhide') => {
    setIsProcessing(true);
    // Simply navigate to the same page with the action parameter
    // The server component will handle the action and show the result
    const url = token 
      ? `/verify/comments?token=${token}&action=${action}`
      : `/verify/comments?action=${action}`;
    window.location.href = url;
  };
  
  const handleCommentUpdate = (commentId: string, hideRequested: boolean) => {
    setComments(prevComments => 
      prevComments.map(comment => 
        comment.id === commentId 
          ? { ...comment, hideRequested } 
          : comment
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 sm:px-8 py-4 sm:py-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Manage Your Comments</h1>
            <p className="text-indigo-100 mt-2 text-sm sm:text-base break-all">Control the visibility of comments associated with {email}</p>
          </div>

          <div className="p-6 sm:p-8">
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
                  <h2 className="font-semibold text-lg mb-2 flex items-center" style={{ color: '#111827' }}>
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
                      <div className="flex-shrink-0 mt-1">
                        <AnonymousCommentsToggle
                          initialAllowAnonymousComments={currentAllowAnonymousComments}
                          email={email}
                          token={token}
                          onUpdate={setCurrentAllowAnonymousComments}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-700 font-medium mb-1">
                          Anonymous comments
                        </p>
                        <p className="text-sm text-gray-600">
                          {currentAllowAnonymousComments
                            ? 'New anonymous comments posted with your email will be visible on the site immediately after admin approval.'
                            : 'New anonymous comments posted with your email will be automatically hidden. You can review and unhide them individually using this page.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h2 className="font-semibold text-lg mb-2" style={{ color: '#111827' }}>Security Notice</h2>
                <p className="text-gray-700">
                  {currentAllowAnonymousComments
                    ? 'If you did not write these comments, you can hide them all with one click. You can also disable anonymous comments above to automatically hide future comments posted with your email.'
                    : 'Anonymous comments are currently disabled. Any new comments posted with your email will be automatically hidden until you review them. You can enable anonymous comments above if you trust comments posted with your email.'}
                </p>
              </div>

              {visibleCount > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-lg mb-2" style={{ color: '#111827' }}>Hide All Comments</h3>
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
                  <h3 className="font-semibold text-lg mb-2" style={{ color: '#111827' }}>Show All Comments</h3>
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
              <h3 className="font-semibold text-lg mb-4" style={{ color: '#111827' }}>Your Comments</h3>
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`border rounded-lg p-4 ${
                      comment.hideRequested ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Link
                            href={`/${comment.townSlug}/${comment.personSlug}`}
                            className="font-medium text-indigo-600 hover:text-indigo-700 break-words"
                          >
                            {comment.personName}
                          </Link>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            comment.isUpdateComment 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {comment.isUpdateComment ? 'Update Comment' : 'General Comment'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {new Date(comment.createdAt).toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </p>
                        {comment.isUpdateComment && comment.updateDescription && (
                          <p className="text-sm text-gray-600 mt-1 italic">
                            On update: &ldquo;{comment.updateDescription}&rdquo;
                          </p>
                        )}
                        {comment.content ? (
                          <p className="mt-3 text-gray-700 whitespace-pre-wrap break-words">{comment.content}</p>
                        ) : (
                          <p className="mt-3 text-gray-500 italic">No message content</p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {isAdmin || token ? (
                          <CommentHideToggle
                            commentId={comment.id}
                            initialHideRequested={comment.hideRequested}
                            onUpdate={handleCommentUpdate}
                            token={token}
                          />
                        ) : (
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              comment.hideRequested
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {comment.hideRequested ? 'Hidden' : 'Visible'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t">
              <details className="group">
                <summary className="cursor-pointer text-center">
                  <span className="inline-flex items-center text-gray-600 hover:text-gray-800 transition-colors">
                    <span>Advanced Usage of Bring-me-home.com</span>
                    <svg className="ml-2 h-5 w-5 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                
                <div className="mt-6 space-y-6">
                  {!hasAccount ? (
                    <div className="text-center">
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
                    </div>
                  ) : (
                    <>
                      <div className="text-center mb-6">
                        <p className="text-gray-600 mb-4">
                          You have an account associated with this email. You can access additional features by logging in.
                        </p>
                        <Link
                          href="/profile"
                          className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                        >
                          Go to Profile
                        </Link>
                      </div>
                      
                      {username && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto">
                          <h4 className="font-semibold mb-3" style={{ color: '#111827' }}>About Your Profile Access</h4>
                          <div className="space-y-3 text-sm text-gray-700">
                            <p>
                              To modify more information about your account at bring-me-home.com, you&apos;ll need to log in with your username and password.
                            </p>
                            <p>
                              <strong>Important:</strong> Your username is: <strong>{username}</strong> 
                              {username !== email && ' (not your email address)'}.
                            </p>
                            <p>
                              If you don&apos;t remember your password, you&apos;ll need to use the &quot;Forgot Password&quot; option on the login page. This will send a password reset email to {email}, allowing you to set a new password that you know.
                            </p>
                            <p>
                              <strong>Note:</strong> You don&apos;t need to log in to comment on detained people and provide encouragement. Account access is only needed if you want more control over your profile settings, such as:
                            </p>
                            <ul className="list-disc list-inside ml-4 space-y-1">
                              <li>Managing individual comments</li>
                              <li>Controlling how anonymous comments are handled</li>
                              <li>Updating your email preferences</li>
                              <li>Changing your account information</li>
                            </ul>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}