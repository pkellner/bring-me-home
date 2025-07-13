'use client';

import { useState } from 'react';
import { debugPasswordAction } from '@/app/actions/debug-password';
import { resetUserPassword } from '@/app/actions/users';

export default function DebugPasswordPage() {
  const [password, setPassword] = useState('Wj72n8Tz4H1');
  const [userId, setUserId] = useState('');
  const [debugResult, setDebugResult] = useState<any>(null);
  const [resetResult, setResetResult] = useState<any>(null);

  const handleDebugTest = async () => {
    console.log('[DEBUG PAGE] Testing with password:', password);
    const result = await debugPasswordAction(password);
    console.log('[DEBUG PAGE] Result:', result);
    setDebugResult(result);
  };

  const handleResetTest = async () => {
    if (!userId) {
      alert('Please enter a user ID');
      return;
    }
    console.log('[DEBUG PAGE] Resetting password for user:', userId);
    const result = await resetUserPassword(userId, password);
    console.log('[DEBUG PAGE] Reset result:', result);
    setResetResult(result);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Password Reset</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Test Password
          </label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <p className="mt-1 text-sm text-gray-500">
            Current: {password} (Length: {password.length})
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            User ID (for reset test)
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter user ID"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleDebugTest}
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Test Debug Action
          </button>
          <button
            onClick={handleResetTest}
            disabled={!userId}
            className="inline-flex justify-center rounded-md border border-transparent bg-green-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Test Reset Password
          </button>
        </div>

        {debugResult && (
          <div className="mt-6 p-4 bg-gray-100 rounded-md">
            <h3 className="font-medium mb-2">Debug Result:</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(debugResult, null, 2)}
            </pre>
          </div>
        )}

        {resetResult && (
          <div className="mt-6 p-4 bg-gray-100 rounded-md">
            <h3 className="font-medium mb-2">Reset Result:</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(resetResult, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h3 className="font-medium mb-2">Instructions:</h3>
          <ol className="list-decimal list-inside text-sm space-y-1">
            <li>First, test the debug action to verify password hashing works</li>
            <li>Find a user ID (e.g., from the users grid)</li>
            <li>Test the reset password action</li>
            <li>Check browser console for detailed logs</li>
            <li>Try logging in with the new password</li>
          </ol>
        </div>
      </div>
    </div>
  );
}