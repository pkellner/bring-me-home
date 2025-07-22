'use client';

import { useState } from 'react';
import {
  testDatabaseConnection,
  testRedisConnection,
  testDatabaseConnectionPool,
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

interface ConnectionPoolResult {
  success: boolean;
  data: {
    connectionPoolStatus: {
      activeConnections: number;
      maxConnections: number;
      utilizationPercent: number;
      connectionLimit: number | string;
      poolTimeout: number | string;
    };
    concurrentTest: {
      attempted: number;
      successful: number;
      failed: number;
      successRate: number;
    };
    topProcesses: {
      id: number;
      command: string;
      state: string;
      duration: number;
    }[];
    queryTime: number;
  } | null;
  error: string | null;
}

export default function HealthCheckSection() {
  const [redisResult, setRedisResult] = useState<HealthCheckResult | null>(
    null
  );
  const [dbResult, setDbResult] = useState<HealthCheckResult | null>(null);
  const [poolResult, setPoolResult] = useState<ConnectionPoolResult | null>(null);
  const [redisLoading, setRedisLoading] = useState(false);
  const [dbLoading, setDbLoading] = useState(false);
  const [poolLoading, setPoolLoading] = useState(false);

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

  const handlePoolTest = async () => {
    setPoolLoading(true);
    setPoolResult(null);

    try {
      const result = await testDatabaseConnectionPool();
      setPoolResult(result);
    } catch (error) {
      setPoolResult({
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setPoolLoading(false);
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

      {/* Database Connection Pool Check */}
      <section className="mb-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">
          Database Connection Pool Status (Admin Only)
        </h2>

        <button
          onClick={handlePoolTest}
          disabled={poolLoading}
          className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {poolLoading ? 'Testing...' : 'Test Connection Pool'}
        </button>

        {poolResult && (
          <div
            className={`p-4 rounded-lg ${
              poolResult.success ? 'bg-green-50' : 'bg-red-50'
            }`}
          >
            <h3
              className={`font-semibold mb-4 ${
                poolResult.success ? 'text-green-800' : 'text-red-800'
              }`}
            >
              {poolResult.success
                ? '✓ Connection Pool Test Complete'
                : '✗ Connection Pool Test Failed'}
            </h3>

            {poolResult.success && poolResult.data && (
              <div className="space-y-4">
                {/* Connection Pool Status */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Connection Pool Status</h4>
                  <dl className="grid grid-cols-2 gap-2 text-sm bg-white p-3 rounded">
                    <dt className="font-medium text-gray-600">Active Connections:</dt>
                    <dd className="text-gray-900">
                      {poolResult.data.connectionPoolStatus.activeConnections} / {poolResult.data.connectionPoolStatus.maxConnections}
                      <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${
                        poolResult.data.connectionPoolStatus.utilizationPercent > 80
                          ? 'bg-red-100 text-red-800'
                          : poolResult.data.connectionPoolStatus.utilizationPercent > 60
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {poolResult.data.connectionPoolStatus.utilizationPercent}% utilized
                      </span>
                    </dd>

                    <dt className="font-medium text-gray-600">Connection Limit:</dt>
                    <dd className="text-gray-900">{poolResult.data.connectionPoolStatus.connectionLimit}</dd>

                    <dt className="font-medium text-gray-600">Pool Timeout:</dt>
                    <dd className="text-gray-900">{poolResult.data.connectionPoolStatus.poolTimeout}s</dd>
                  </dl>
                </div>

                {/* Concurrent Test Results */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Concurrent Connection Test</h4>
                  <dl className="grid grid-cols-2 gap-2 text-sm bg-white p-3 rounded">
                    <dt className="font-medium text-gray-600">Attempted:</dt>
                    <dd className="text-gray-900">{poolResult.data.concurrentTest.attempted}</dd>

                    <dt className="font-medium text-gray-600">Successful:</dt>
                    <dd className="text-gray-900">
                      {poolResult.data.concurrentTest.successful}
                      <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${
                        poolResult.data.concurrentTest.successRate === 100
                          ? 'bg-green-100 text-green-800'
                          : poolResult.data.concurrentTest.successRate >= 80
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {poolResult.data.concurrentTest.successRate}% success rate
                      </span>
                    </dd>

                    <dt className="font-medium text-gray-600">Failed:</dt>
                    <dd className="text-gray-900">{poolResult.data.concurrentTest.failed}</dd>

                    <dt className="font-medium text-gray-600">Query Time:</dt>
                    <dd className="text-gray-900">{poolResult.data.queryTime}ms</dd>
                  </dl>
                </div>

                {/* Top Processes */}
                {poolResult.data.topProcesses.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Active Database Processes</h4>
                    <div className="bg-white rounded overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">PID</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Command</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">State</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {poolResult.data.topProcesses.map((process) => (
                            <tr key={process.id}>
                              <td className="px-3 py-2 text-gray-900">{process.id}</td>
                              <td className="px-3 py-2 text-gray-900">{process.command}</td>
                              <td className="px-3 py-2 text-gray-900">{process.state}</td>
                              <td className="px-3 py-2 text-gray-900">{process.duration}s</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-sm text-blue-700">
                    <strong>Current Configuration:</strong> Using{' '}
                    {typeof poolResult.data.connectionPoolStatus.connectionLimit === 'number' ? 'custom' : 'default'} connection pool settings.
                    {poolResult.data.connectionPoolStatus.utilizationPercent > 60 && (
                      <span className="block mt-1">
                        ⚠️ Connection pool utilization is high. Consider increasing connection_limit if you continue to see timeouts.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {poolResult.error && (
              <p className="text-red-700 text-sm mt-2">
                Error: {poolResult.error}
              </p>
            )}
          </div>
        )}
      </section>
    </>
  );
}
