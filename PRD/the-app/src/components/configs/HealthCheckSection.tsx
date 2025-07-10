'use client';

import { useState } from 'react';
import {
  testDatabaseConnection,
  testRedisConnection,
} from '@/app/actions/health-check';

interface HealthCheckResult {
  success: boolean;
  data: {
    connected?: boolean;
    error?: string | null;
    createTime?: number;
    readTime?: number;
    updateTime?: number;
    deleteTime?: number;
    totalTime?: number;
    databaseInfo?: string;
    writeTime?: number;
  } | null;
  error: string | null;
}

export default function HealthCheckSection() {
  const [redisResult, setRedisResult] = useState<HealthCheckResult | null>(
    null
  );
  const [dbResult, setDbResult] = useState<HealthCheckResult | null>(null);
  const [redisLoading, setRedisLoading] = useState(false);
  const [dbLoading, setDbLoading] = useState(false);

  const handleRedisTest = async () => {
    setRedisLoading(true);
    setRedisResult(null);

    try {
      const result = await testRedisConnection();
      setRedisResult(result);
    } catch (error) {
      setRedisResult({
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setRedisLoading(false);
    }
  };

  const handleDatabaseTest = async () => {
    setDbLoading(true);
    setDbResult(null);

    try {
      const result = await testDatabaseConnection();
      setDbResult(result);
    } catch (error) {
      setDbResult({
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setDbLoading(false);
    }
  };

  return (
    <>
      {/* Redis Health Check */}
      <section className="mb-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">
          Redis Health Check (Admin Only)
        </h2>

        <button
          onClick={handleRedisTest}
          disabled={redisLoading}
          className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {redisLoading ? 'Testing...' : 'Test Redis Connection'}
        </button>

        {redisResult && (
          <div
            className={`p-4 rounded-lg ${
              redisResult.success ? 'bg-green-50' : 'bg-red-50'
            }`}
          >
            <h3
              className={`font-semibold mb-2 ${
                redisResult.success ? 'text-green-800' : 'text-red-800'
              }`}
            >
              {redisResult.success
                ? '✓ Redis Connected'
                : '✗ Redis Connection Failed'}
            </h3>

            {redisResult.success && redisResult.data && (
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="font-medium text-gray-600">Write Time:</dt>
                <dd className="text-gray-900">
                  {redisResult.data.writeTime}ms
                </dd>

                <dt className="font-medium text-gray-600">Read Time:</dt>
                <dd className="text-gray-900">{redisResult.data.readTime}ms</dd>

                <dt className="font-medium text-gray-600">Delete Time:</dt>
                <dd className="text-gray-900">
                  {redisResult.data.deleteTime}ms
                </dd>

                <dt className="font-medium text-gray-600">Total Time:</dt>
                <dd className="text-gray-900 font-semibold">
                  {redisResult.data.totalTime}ms
                </dd>
              </dl>
            )}

            {redisResult.error && (
              <p className="text-red-700 text-sm mt-2">
                Error: {redisResult.error}
              </p>
            )}
          </div>
        )}
      </section>

      {/* Database Health Check */}
      <section className="mb-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">
          Database Health Check (Admin Only)
        </h2>

        <button
          onClick={handleDatabaseTest}
          disabled={dbLoading}
          className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {dbLoading ? 'Testing...' : 'Test Database Connection'}
        </button>

        {dbResult && (
          <div
            className={`p-4 rounded-lg ${
              dbResult.success ? 'bg-green-50' : 'bg-red-50'
            }`}
          >
            <h3
              className={`font-semibold mb-2 ${
                dbResult.success ? 'text-green-800' : 'text-red-800'
              }`}
            >
              {dbResult.success
                ? '✓ Database Connected'
                : '✗ Database Connection Failed'}
            </h3>

            {dbResult.success && dbResult.data && (
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="font-medium text-gray-600">Database:</dt>
                <dd className="text-gray-900 text-xs">
                  {dbResult.data.databaseInfo}
                </dd>

                <dt className="font-medium text-gray-600">Create Time:</dt>
                <dd className="text-gray-900">{dbResult.data.createTime}ms</dd>

                <dt className="font-medium text-gray-600">Read Time:</dt>
                <dd className="text-gray-900">{dbResult.data.readTime}ms</dd>

                <dt className="font-medium text-gray-600">Update Time:</dt>
                <dd className="text-gray-900">{dbResult.data.updateTime}ms</dd>

                <dt className="font-medium text-gray-600">Delete Time:</dt>
                <dd className="text-gray-900">{dbResult.data.deleteTime}ms</dd>

                <dt className="font-medium text-gray-600">Total Time:</dt>
                <dd className="text-gray-900 font-semibold">
                  {dbResult.data.totalTime}ms
                </dd>
              </dl>
            )}

            {dbResult.error && (
              <p className="text-red-700 text-sm mt-2">
                Error: {dbResult.error}
              </p>
            )}
          </div>
        )}
      </section>
    </>
  );
}
