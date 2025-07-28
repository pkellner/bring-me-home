'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { obfuscateEmail } from '@/lib/email-utils';

interface UnsubscribeData {
  valid: boolean;
  action: string;
  email?: string;
  personName?: string;
  error?: string;
  message?: string;
}

interface UnsubscribeResult {
  success: boolean;
  message: string;
  isGloballyOptedOut: boolean;
  error?: string;
}

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<UnsubscribeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unsubscribed, setUnsubscribed] = useState(false);
  const [unsubscribeResult, setUnsubscribeResult] = useState<UnsubscribeResult | null>(null);
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

        const result: UnsubscribeResult = await unsubscribeResponse.json();

        if (result.success) {
          setUnsubscribed(true);
          setUnsubscribeResult(result);
        } else {
          setError(result.message || result.error || 'Failed to unsubscribe');
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
              {/* Main unsubscribe message */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-gray-700 font-medium mb-2">
                  {action === 'all'
                    ? 'You have been successfully unsubscribed from all Bring Me Home email updates.'
                    : `You have been successfully unsubscribed from updates about ${data.personName}.`}
                </p>
                {data.email && (
                  <p className="text-sm text-gray-600">
                    Email address: <span className="font-mono">{obfuscateEmail(data.email)}</span>
                  </p>
                )}
              </div>
              
              {/* Transactional email notice */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>Important:</strong> You may still receive transactional emails such as password reset requests 
                  or important account notifications, as required by law. These are essential for maintaining 
                  the security and functionality of your account.
                </p>
              </div>
              
              {/* Resubscribe information */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>Want to receive updates again?</strong> Simply post another comment or send a message 
                  of support to any family, and check the &ldquo;Keep me updated&rdquo; box. Your email preferences will 
                  be automatically restored.
                </p>
              </div>
              
              {action === 'person' && unsubscribeResult?.isGloballyOptedOut && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    <strong>Note:</strong> You are currently opted out from all emails from Bring Me Home. 
                    To receive any updates, you&apos;ll need to re-enable emails when posting a new comment or message of support.
                  </p>
                </div>
              )}
            </div>
            
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

  // This should never show since we're doing one-click unsubscribe
  return null;
}