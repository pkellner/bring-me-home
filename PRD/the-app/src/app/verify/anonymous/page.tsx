import { Suspense } from 'react';
import Link from 'next/link';
import { verifyAnonymousEmail } from '@/app/actions/email-verification';

interface VerifyAnonymousPageProps {
  searchParams: Promise<{
    token?: string;
  }>;
}

async function VerifyAnonymousContent({ searchParams }: { searchParams: { token?: string } }) {
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
          href="/"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Return Home
        </Link>
      </div>
    );
  }

  const result = await verifyAnonymousEmail(token);

  if (result.success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="mb-6">
            <svg className="mx-auto h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Thank You!</h1>
          <p className="text-xl text-gray-600">Your email has been verified successfully.</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-green-900 mb-2">What this means:</h2>
          <ul className="list-disc list-inside text-green-800 space-y-1">
            <li>Your support messages will be marked as verified</li>
            <li>Families will know your messages are from a real person</li>
            <li>You&apos;ll receive updates when your messages are approved</li>
          </ul>
        </div>

        {/* Optional account creation */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Want to do more?</h2>
          <p className="text-blue-800 mb-4">
            Creating an account is completely optional, but it allows you to:
          </p>
          <ul className="list-disc list-inside text-blue-800 space-y-1 mb-4">
            <li>Manage all your support messages in one place</li>
            <li>Control your privacy settings</li>
            <li>Follow multiple people and get updates</li>
            <li>Hide or delete your messages if needed</li>
          </ul>
          <div className="flex gap-4">
            <Link
              href="/auth/register"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Create Account (Optional)
            </Link>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              No Thanks, Continue
            </Link>
          </div>
        </div>

        {/* Privacy and unsubscribe options */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Privacy & Email Settings</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">If this wasn&apos;t you:</h3>
              <p className="text-sm text-gray-600 mb-2">
                If you didn&apos;t submit any support messages, someone may have used your email by mistake.
              </p>
              <Link
                href={`/profile?email=${result.email || ''}`}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                Block future use of your email →
              </Link>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-900 mb-2">Email preferences:</h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  To manage your email preferences or unsubscribe, please use the links in any email you receive from us.
                </p>
              </div>
            </div>
          </div>
        </div>
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
          href="/"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Return Home
        </Link>
        <p className="text-sm text-gray-500">
          If you continue to have issues, please contact support.
        </p>
      </div>
    </div>
  );
}

export default async function VerifyAnonymousPage({ searchParams }: VerifyAnonymousPageProps) {
  const params = await searchParams;
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full">
        <Suspense fallback={
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Verifying your email...</p>
          </div>
        }>
          <VerifyAnonymousContent searchParams={params} />
        </Suspense>
      </div>
    </div>
  );
}