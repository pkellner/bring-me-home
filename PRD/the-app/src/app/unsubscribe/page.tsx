'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface UnsubscribeData {
  valid: boolean;
  action: string;
  email?: string;
  personName?: string;
  error?: string;
  message?: string;
}

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<UnsubscribeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unsubscribed, setUnsubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get('token');
  const action = searchParams.get('action');

  useEffect(() => {
    if (!token || !action) {
      setError('Invalid unsubscribe link');
      setLoading(false);
      return;
    }

    // One-click unsubscribe - immediately process the unsubscribe
    const processUnsubscribe = async () => {
      try {
        // First validate the token
        const validateResponse = await fetch(`/api/unsubscribe?token=${token}&action=${action}`);
        const validateData = await validateResponse.json();
        
        if (!validateData.valid) {
          setError(validateData.message || validateData.error || 'Invalid or expired link');
          setLoading(false);
          return;
        }
        
        setData(validateData);
        
        // Immediately process the unsubscribe
        const unsubscribeResponse = await fetch('/api/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const result = await unsubscribeResponse.json();

        if (result.success) {
          setUnsubscribed(true);
        } else {
          setError(result.message || result.error);
        }
      } catch {
        setError('Failed to process unsubscribe request');
      } finally {
        setLoading(false);
      }
    };

    processUnsubscribe();
  }, [token, action]);


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Invalid or Expired Link</h2>
            <p className="mt-2 text-gray-600">
              {error || 'This unsubscribe link is no longer valid.'}
            </p>
            <div className="mt-6">
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Homepage
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (unsubscribed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
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
            <h2 className="mt-4 text-2xl font-bold text-gray-900">You&apos;ve Been Unsubscribed</h2>
            <div className="mt-4 space-y-4">
              <p className="text-gray-700 font-medium">
                {action === 'all'
                  ? 'You have been successfully unsubscribed from all Bring Me Home emails.'
                  : `You have been successfully unsubscribed from email updates about ${data.personName}.`}
              </p>
              
              {action !== 'all' && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    Thank you for showing interest in {data.personName} and their well-being. 
                    Your support has meant a lot to their family and community.
                  </p>
                </div>
              )}
              
              <p className="text-sm text-gray-600">
                You will no longer receive{' '}
                {action === 'all'
                  ? 'any emails from Bring Me Home'
                  : `email notifications when there are updates about ${data.personName}`}.
              </p>
            </div>
            
            <div className="mt-6 bg-blue-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Changed your mind?</h3>
              <p className="text-sm text-gray-600">
                To resubscribe or manage your email preferences:{' '}
              </p>
              <ol className="mt-2 text-sm text-gray-600 list-decimal list-inside space-y-1">
                <li>
                  <Link href="/auth/signin" className="text-blue-600 hover:text-blue-700 underline">
                    Sign in to your account
                  </Link>
                </li>
                <li>Go to your Profile settings</li>
                <li>Navigate to Email Preferences</li>
                <li>Select which updates you&apos;d like to receive</li>
              </ol>
            </div>
            
            <div className="mt-6 space-y-3">
              <Link
                href="/"
                className="block w-full text-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Homepage
              </Link>
              <Link
                href="/profile"
                className="block w-full text-center px-4 py-2 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Manage Email Preferences
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // This should never show since we're doing one-click unsubscribe
  return null;
}