import { Suspense } from 'react';
import Link from 'next/link';
import { verifyToken } from '@/lib/comment-verification';
import { prisma } from '@/lib/prisma';
import CommentVerificationClient from './CommentVerificationClient';

interface PageProps {
  searchParams: Promise<{ token?: string; action?: string }>;
}

async function CommentVerification({ searchParams }: { searchParams: { token?: string; action?: string } }) {
  const { token, action } = searchParams;
  
  console.log('[CommentVerification] Token:', token);
  console.log('[CommentVerification] Action:', action);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Link</h1>
          <p className="text-gray-600">This verification link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  // Verify the token
  const verificationToken = await verifyToken(token);
  if (!verificationToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Token</h1>
          <p className="text-gray-600">This verification link is invalid or has been revoked.</p>
        </div>
      </div>
    );
  }

  // If action is specified in URL (from email link), process it immediately
  if (action === 'hide' || action === 'unhide') {
    try {
      const hideRequested = action === 'hide';
      
      console.log('[CommentVerification] Processing action:', action);
      console.log('[CommentVerification] Email:', verificationToken.email);
      
      // Update all comments for this email
      const updateResult = await prisma.comment.updateMany({
        where: { email: verificationToken.email },
        data: {
          hideRequested,
          hideRequestedAt: hideRequested ? new Date() : null,
        },
      });
      
      // Update user's allowAnonymousComments setting if they have an account
      if (verificationToken.email) {
        await prisma.user.updateMany({
          where: { email: verificationToken.email },
          data: {
            allowAnonymousComments: !hideRequested, // Disable anonymous comments when hiding
          },
        });
      }
      
      console.log('[CommentVerification] Updated comments:', updateResult.count);

      // Update token usage
      await prisma.commentVerificationToken.update({
        where: { id: verificationToken.id },
        data: {
          lastAction: action,
        },
      });

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
    where: { email: verificationToken.email },
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
    where: { email: verificationToken.email },
    _count: true,
  });

  const hiddenCount = stats.find(s => s.hideRequested)?._count || 0;
  const visibleCount = stats.find(s => !s.hideRequested)?._count || 0;
  const totalCount = hiddenCount + visibleCount;

  // Get comments with person info
  const comments = await prisma.comment.findMany({
    where: { email: verificationToken.email },
    include: {
      person: {
        include: {
          town: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return <CommentVerificationClient 
    token={token}
    email={verificationToken.email}
    totalCount={totalCount}
    hiddenCount={hiddenCount}
    visibleCount={visibleCount}
    hasAccount={!!user}
    allowAnonymousComments={user?.allowAnonymousComments}
    userName={user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : undefined}
    username={user?.username}
    comments={comments.map(c => ({
      id: c.id,
      content: c.content,
      hideRequested: c.hideRequested,
      createdAt: c.createdAt.toISOString(),
      personName: `${c.person.firstName} ${c.person.lastName}`,
      personSlug: c.person.slug,
      townSlug: c.person.town.slug,
    }))}
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