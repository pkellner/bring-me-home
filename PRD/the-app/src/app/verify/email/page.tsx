import { Suspense } from 'react';
import Link from 'next/link';
import { verifyEmail } from '@/app/actions/email-verification';

interface VerifyEmailPageProps {
  searchParams: Promise<{
    token?: string;
  }>;
}

async function VerifyEmailContent({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token;

  if (!token) {
    return (
      <div className="text-center">
        <div className="mb-6">
          <svg className="mx-auto h-12 w-12 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Verification Link</h1>
        <p className="text-gray-600 mb-8">The verification link appears to be invalid or incomplete.</p>
        <Link
          href="/auth/signin"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Go to Sign In
        </Link>
      </div>
    );
  }

  const result = await verifyEmail(token);

  if (result.success) {
    const personName = result.person ? `${result.person.firstName} ${result.person.lastName}` : null;
    const personUrl = result.person ? `/${result.person.townSlug}/${result.person.slug}` : '/';
    
    return (
      <div className="text-center">
        <div className="mb-6">
          <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h1>
        <p className="text-gray-600 mb-4">Thank you for verifying your email address.</p>
        
        {personName && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 text-sm">
              The family of <strong>{personName}</strong> will be notified that you&apos;ve verified your email.
              This helps them know that messages of support are from real people who care.
            </p>
          </div>
        )}
        
        <p className="text-gray-600 mb-8">
          Your support means a lot to the families with loved ones in detention.
        </p>
        
        <Link
          href={personUrl}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {personName ? `View ${personName}'s Page` : 'Go to Homepage'}
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="mb-6">
        <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h1>
      <p className="text-gray-600 mb-8">{result.error || 'Unable to verify your email address.'}</p>
      <div className="space-y-4">
        <Link
          href="/profile"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Go to Profile
        </Link>
        <p className="text-sm text-gray-500">
          You can request a new verification email from your profile page.
        </p>
      </div>
    </div>
  );
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Suspense fallback={
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Verifying your email...</p>
          </div>
        }>
          <VerifyEmailContent searchParams={params} />
        </Suspense>
      </div>
    </div>
  );
}