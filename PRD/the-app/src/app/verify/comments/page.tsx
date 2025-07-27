import { Suspense } from 'react';
import Link from 'next/link';
import { verifyToken } from '@/lib/comment-verification';
import { prisma } from '@/lib/prisma';
import CommentVerificationClient from './CommentVerificationClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

interface PageProps {
  searchParams: Promise<{ token?: string; action?: string }>;
}

async function CommentVerification({ searchParams }: { searchParams: { token?: string; action?: string } }) {
  const { token, action } = searchParams;
  const session = await getServerSession(authOptions);
  
  console.log('[CommentVerification] Token:', token);
  console.log('[CommentVerification] Action:', action);

  // Check if user is admin
  const isAdmin = session && hasPermission(session, 'comments', 'read');
  
  // If no token and not admin, show error
  if (!token && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Link</h1>
          <p className="text-gray-600">This verification link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  // Verify the token if provided
  let verificationToken = null;
  let email = '';
  
  if (token) {
    verificationToken = await verifyToken(token);
    if (!verificationToken && !isAdmin) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Token</h1>
            <p className="text-gray-600">This verification link is invalid or has been revoked.</p>
          </div>
        </div>
      );
    }
    if (verificationToken) {
      email = verificationToken.email;
    }
  }
  
  // For admins without token, they need to specify an email
  if (isAdmin && !email) {
    // For now, redirect to admin comments page
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Admin Access</h1>
          <p className="text-gray-600 mb-4">As an admin, you need a valid token to view user comments.</p>
          <Link
            href="/admin/comments"
            className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            Go to Comments Admin
          </Link>
        </div>
      </div>
    );
  }

  // If action is specified in URL (from email link), process it immediately
  if (action === 'hide' || action === 'unhide') {
    try {
      const hideRequested = action === 'hide';
      
      console.log('[CommentVerification] Processing action:', action);
      console.log('[CommentVerification] Email:', email);
      
      // Update all comments for this email
      const updateResult = await prisma.comment.updateMany({
        where: { email: email },
        data: {
          hideRequested,
          hideRequestedAt: hideRequested ? new Date() : null,
        },
      });
      
      // Update user's allowAnonymousComments setting if they have an account
      if (email) {
        await prisma.user.updateMany({
          where: { email: email },
          data: {
            allowAnonymousComments: !hideRequested, // Disable anonymous comments when hiding
          },
        });
      }
      
      console.log('[CommentVerification] Updated comments:', updateResult.count);

      // Update token usage if we have one
      if (verificationToken) {
        await prisma.commentVerificationToken.update({
          where: { id: verificationToken.id },
          data: {
            lastAction: action,
          },
        });
      }

      // Show success message directly - no redirect!
      const isHide = action === 'hide';
      const title = isHide ? 'Comments Hidden' : 'Comments Shown';
      const message = isHide 
        ? `All ${updateResult.count} comments associated with your email have been hidden from public view.`
        : `All ${updateResult.count} comments associated with your email are now visible.`;

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
            <div className="text-center">
              <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${
                isHide ? 'bg-red-100' : 'bg-green-100'
              }`}>
                <svg
                  className={`h-6 w-6 ${isHide ? 'text-red-600' : 'text-green-600'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="mt-4 text-2xl font-bold text-gray-900">{title}</h1>
              <p className="mt-2 text-gray-600">{message}</p>
              
              <div className="mt-8 space-y-4">
                <p className="text-sm text-gray-500">
                  You can change this setting at any time using the link in your email.
                </p>
                
                <div className="space-x-4">
                  <Link
                    href="/"
                    className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Go to Homepage
                  </Link>
                  <Link
                    href={`/verify/comments?token=${token}`}
                    className="inline-block bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Manage Comments
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    } catch (error) {
      console.error('[CommentVerification] Error processing action:', error);
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
            <p className="text-gray-600">An error occurred while processing your request. Please try again later.</p>
            <pre className="mt-4 text-xs text-gray-500 overflow-auto">
              {error instanceof Error ? error.message : 'Unknown error'}
            </pre>
          </div>
        </div>
      );
    }
  }

  // Get user's allowAnonymousComments setting if they have an account
  const user = await prisma.user.findUnique({
    where: { email: email },
    select: { 
      id: true,
      username: true,
      email: true,
      allowAnonymousComments: true,
      firstName: true,
      lastName: true
    }
  });

  // Get comment statistics for this email
  const stats = await prisma.comment.groupBy({
    by: ['hideRequested'],
    where: { email: email },
    _count: true,
  });

  const hiddenCount = stats.find(s => s.hideRequested)?._count || 0;
  const visibleCount = stats.find(s => !s.hideRequested)?._count || 0;
  const totalCount = hiddenCount + visibleCount;

  // Get comments with person info
  const comments = await prisma.comment.findMany({
    where: { email: email },
    include: {
      person: {
        include: {
          town: true,
        },
      },
      personHistory: {
        include: {
          person: {
            include: {
              town: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return <CommentVerificationClient 
    token={token || null}
    email={email}
    totalCount={totalCount}
    hiddenCount={hiddenCount}
    visibleCount={visibleCount}
    hasAccount={!!user}
    allowAnonymousComments={user?.allowAnonymousComments}
    userName={user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : undefined}
    username={user?.username}
    isAdmin={isAdmin || false}
    comments={comments.map(c => {
      const person = c.person || c.personHistory?.person;
      return {
        id: c.id,
        content: c.content,
        hideRequested: c.hideRequested,
        createdAt: c.createdAt.toISOString(),
        personName: person ? `${person.firstName} ${person.lastName}` : 'Unknown',
        personSlug: person?.slug || '',
        townSlug: person?.town?.slug || '',
        isUpdateComment: !!c.personHistoryId,
        updateDescription: c.personHistory?.description || null,
      };
    })}
  />;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying your token...</p>
        </div>
      </div>
    }>
      <CommentVerification searchParams={params} />
    </Suspense>
  );
}