'use client';

import { useState, useEffect } from 'react';
import { ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline';

interface KeyStats {
  hits: number;
  misses: number;
  lastAccess: string;
  size: number;
  ttl?: number;
  cachedAt?: string;
  expiresAt?: string;
}

interface CacheStats {
  memory: {
    hits: number;
    misses: number;
    hitRate: number;
    totalSize: number;
    byKey: Record<string, KeyStats>;
  };
  redis: {
    hits: number;
    misses: number;
    hitRate: number;
    totalSize: number;
    byKey: Record<string, KeyStats>;
  };
  database: {
    queries: number;
    byKey: Record<string, number>;
  };
  lastReset: string;
}

interface CacheEnvConfig {
  CACHE_MEMORY_ENABLE: string;
  CACHE_REDIS_ENABLE: string;
  CACHE_MEMORY_TTL: string;
  CACHE_MEMORY_MAX_SIZE_MB: string;
  CACHE_MEMORY_CLEANUP_ENABLED: string;
  CACHE_MEMORY_CLEANUP_INTERVAL_MS: string;
  CACHE_REDIS_TTL: string;
  REDIS_HOST: string;
  REDIS_PORT: string;
}

export default function CacheStatsSection() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [clearingMemory, setClearingMemory] = useState(false);
  const [clearingRedis, setClearingRedis] = useState(false);
  const [cacheEnvConfig, setCacheEnvConfig] = useState<CacheEnvConfig | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both stats and config in parallel
      const [statsResponse, configResponse] = await Promise.all([
        fetch('/api/cache/stats'),
        fetch('/api/cache/config')
      ]);

      if (!statsResponse.ok) {
        if (statsResponse.status === 401) {
          setError('Unauthorized');
        } else if (statsResponse.status === 403) {
          setError('Access denied - admin access required');
        } else {
          setError('Failed to fetch cache stats');
        }
        return;
      }

      const statsData = await statsResponse.json();
      setStats(statsData.stats);

      if (configResponse.ok) {
        const configData = await configResponse.json();
        setCacheEnvConfig(configData);
      }
    } catch (err) {
      setError('Failed to fetch cache stats');
      console.error('Error fetching cache stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetStats = async () => {
    if (typeof window !== 'undefined' && !window.confirm('Are you sure you want to reset cache statistics?')) {
      return;
    }

    try {
      setResetting(true);
      const response = await fetch('/api/cache/stats', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to reset stats');
      }

      await fetchStats();
    } catch (err) {
      console.error('Error resetting cache stats:', err);
      alert('Failed to reset cache statistics');
    } finally {
      setResetting(false);
    }
  };

  const clearMemoryCache = async () => {
    if (typeof window !== 'undefined' && !window.confirm('Are you sure you want to clear the memory cache?')) {
      return;
    }

    try {
      setClearingMemory(true);
      const response = await fetch('/api/cache/clear/memory', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to clear memory cache');
      }

      await fetchStats();
    } catch (err) {
      console.error('Error clearing memory cache:', err);
      alert('Failed to clear memory cache');
    } finally {
      setClearingMemory(false);
    }
  };

  const clearRedisCache = async () => {
    if (typeof window !== 'undefined' && !window.confirm('Are you sure you want to clear the Redis cache?')) {
      return;
    }

    try {
      setClearingRedis(true);
      const response = await fetch('/api/cache/clear/redis', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to clear Redis cache');
      }

      await fetchStats();
    } catch (err) {
      console.error('Error clearing Redis cache:', err);
      alert('Failed to clear Redis cache');
    } finally {
      setClearingRedis(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !stats) {
    return (
      <section>
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Cache Statistics
        </h2>
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-500">Loading cache statistics...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Cache Statistics
        </h2>
        <div className="bg-red-50 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </section>
    );
  }

  if (!stats) return null;

  const formatHitRate = (rate: number) => {
    const rounded = Math.round(rate);
    const color = rounded >= 80 ? 'text-green-600' : rounded >= 50 ? 'text-yellow-600' : 'text-red-600';
    return <span className={`font-medium ${color}`}>{rounded}%</span>;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ago`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s ago`;
    } else {
      return `${seconds}s ago`;
    }
  };

  // Sort keys by total accesses (hits + misses)
  const sortKeysByActivity = (byKey: Record<string, KeyStats>) => {
    return Object.entries(byKey).sort((a, b) => {
      const totalA = a[1].hits + a[1].misses;
      const totalB = b[1].hits + b[1].misses;
      return totalB - totalA;
    });
  };

  const sortDatabaseKeys = (byKey: Record<string, number>) => {
    return Object.entries(byKey).sort((a, b) => b[1] - a[1]);
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900">
          Cache Statistics
        </h2>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">
            Last reset: {formatDate(stats.lastReset)}
          </span>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            title="Refresh stats"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={resetStats}
            disabled={resetting}
            className="px-3 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {resetting ? 'Resetting...' : 'Reset Stats'}
          </button>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 space-y-6">
        {/* Cache Control Buttons */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Cache Control</h3>
          <div className="flex space-x-3">
            <button
              onClick={clearMemoryCache}
              disabled={clearingMemory}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <TrashIcon className="h-3.5 w-3.5 mr-1.5" />
              {clearingMemory ? 'Clearing...' : 'Clear Memory Cache'}
            </button>
            <button
              onClick={clearRedisCache}
              disabled={clearingRedis}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <TrashIcon className="h-3.5 w-3.5 mr-1.5" />
              {clearingRedis ? 'Clearing...' : 'Clear Redis Cache'}
            </button>
          </div>
        </div>

        {/* Overall Statistics */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Overall Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Memory Cache */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Memory Cache</h4>
              <dl className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Hits:</dt>
                  <dd className="font-medium text-gray-900">{stats.memory.hits}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Misses:</dt>
                  <dd className="font-medium text-gray-900">{stats.memory.misses}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Hit Rate:</dt>
                  <dd>{formatHitRate(stats.memory.hitRate)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Total Size:</dt>
                  <dd className="font-medium text-gray-900">{formatBytes(stats.memory.totalSize)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Total Requests:</dt>
                  <dd className="font-medium text-gray-900">
                    {stats.memory.hits + stats.memory.misses}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Redis Cache */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Redis Cache</h4>
              <dl className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Hits:</dt>
                  <dd className="font-medium text-gray-900">{stats.redis.hits}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Misses:</dt>
                  <dd className="font-medium text-gray-900">{stats.redis.misses}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Hit Rate:</dt>
                  <dd>{formatHitRate(stats.redis.hitRate)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Total Size:</dt>
                  <dd className="font-medium text-gray-900">{formatBytes(stats.redis.totalSize)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Total Requests:</dt>
                  <dd className="font-medium text-gray-900">
                    {stats.redis.hits + stats.redis.misses}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Database */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Database</h4>
              <dl className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Queries:</dt>
                  <dd className="font-medium text-gray-900">{stats.database.queries}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Unique Keys:</dt>
                  <dd className="font-medium text-gray-900">
                    {Object.keys(stats.database.byKey).length}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Per-Key Statistics */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Per-Key Statistics</h3>

          {/* Memory Cache Keys */}
          {Object.keys(stats.memory.byKey).length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-600 mb-2">Memory Cache Keys</h4>
              <div className="bg-white rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Key
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hits
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Misses
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hit Rate
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        TTL
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expires In
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Access
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortKeysByActivity(stats.memory.byKey).slice(0, 10).map(([key, keyStats]) => {
                      const total = keyStats.hits + keyStats.misses;
                      const hitRate = total > 0 ? (keyStats.hits / total) * 100 : 0;
                      return (
                        <tr key={key} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-xs font-mono text-gray-900 truncate max-w-xs" title={key}>
                            {key}
                          </td>
                          <td className="px-3 py-2 text-xs text-center text-gray-900">{keyStats.hits}</td>
                          <td className="px-3 py-2 text-xs text-center text-gray-900">{keyStats.misses}</td>
                          <td className="px-3 py-2 text-xs text-center">{formatHitRate(hitRate)}</td>
                          <td className="px-3 py-2 text-xs text-center text-gray-900">{formatBytes(keyStats.size)}</td>
                          <td className="px-3 py-2 text-xs text-center text-gray-900">
                            {keyStats.ttl ? `${keyStats.ttl}s` : '-'}
                          </td>
                          <td className="px-3 py-2 text-xs text-center text-gray-900">
                            {keyStats.expiresAt ? (() => {
                              const now = new Date();
                              const expires = new Date(keyStats.expiresAt);
                              const seconds = Math.floor((expires.getTime() - now.getTime()) / 1000);
                              if (seconds <= 0) return 'Expired';
                              if (seconds < 60) return `${seconds}s`;
                              const minutes = Math.floor(seconds / 60);
                              return `${minutes}m ${seconds % 60}s`;
                            })() : '-'}
                          </td>
                          <td className="px-3 py-2 text-xs text-right text-gray-500">
                            {formatDate(keyStats.lastAccess)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {Object.keys(stats.memory.byKey).length > 10 && (
                  <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500 text-center">
                    Showing top 10 of {Object.keys(stats.memory.byKey).length} keys
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Redis Cache Keys */}
          {Object.keys(stats.redis.byKey).length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-600 mb-2">Redis Cache Keys</h4>
              <div className="bg-white rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Key
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hits
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Misses
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hit Rate
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        TTL
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expires In
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Access
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortKeysByActivity(stats.redis.byKey).slice(0, 10).map(([key, keyStats]) => {
                      const total = keyStats.hits + keyStats.misses;
                      const hitRate = total > 0 ? (keyStats.hits / total) * 100 : 0;
                      return (
                        <tr key={key} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-xs font-mono text-gray-900 truncate max-w-xs" title={key}>
                            {key}
                          </td>
                          <td className="px-3 py-2 text-xs text-center text-gray-900">{keyStats.hits}</td>
                          <td className="px-3 py-2 text-xs text-center text-gray-900">{keyStats.misses}</td>
                          <td className="px-3 py-2 text-xs text-center">{formatHitRate(hitRate)}</td>
                          <td className="px-3 py-2 text-xs text-center text-gray-900">{formatBytes(keyStats.size)}</td>
                          <td className="px-3 py-2 text-xs text-center text-gray-900">
                            {keyStats.ttl ? `${keyStats.ttl}s` : '-'}
                          </td>
                          <td className="px-3 py-2 text-xs text-center text-gray-900">
                            {keyStats.expiresAt ? (() => {
                              const now = new Date();
                              const expires = new Date(keyStats.expiresAt);
                              const seconds = Math.floor((expires.getTime() - now.getTime()) / 1000);
                              if (seconds <= 0) return 'Expired';
                              if (seconds < 60) return `${seconds}s`;
                              const minutes = Math.floor(seconds / 60);
                              return `${minutes}m ${seconds % 60}s`;
                            })() : '-'}
                          </td>
                          <td className="px-3 py-2 text-xs text-right text-gray-500">
                            {formatDate(keyStats.lastAccess)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {Object.keys(stats.redis.byKey).length > 10 && (
                  <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500 text-center">
                    Showing top 10 of {Object.keys(stats.redis.byKey).length} keys
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Database Query Keys */}
          {Object.keys(stats.database.byKey).length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-600 mb-2">Database Query Keys</h4>
              <div className="bg-white rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Key
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Queries
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortDatabaseKeys(stats.database.byKey).slice(0, 10).map(([key, count]) => (
                      <tr key={key} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs font-mono text-gray-900 truncate max-w-xs" title={key}>
                          {key}
                        </td>
                        <td className="px-3 py-2 text-xs text-center text-gray-900">{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {Object.keys(stats.database.byKey).length > 10 && (
                  <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500 text-center">
                    Showing top 10 of {Object.keys(stats.database.byKey).length} keys
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Cache Environment Variables */}
        {cacheEnvConfig && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Cache Configuration</h3>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Memory Cache Settings</h4>
                  <dl className="space-y-1">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">CACHE_MEMORY_ENABLE:</dt>
                      <dd className="font-mono text-gray-900">{cacheEnvConfig.CACHE_MEMORY_ENABLE}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">CACHE_MEMORY_TTL:</dt>
                      <dd className="font-mono text-gray-900">{cacheEnvConfig.CACHE_MEMORY_TTL}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">CACHE_MEMORY_MAX_SIZE_MB:</dt>
                      <dd className="font-mono text-gray-900">{cacheEnvConfig.CACHE_MEMORY_MAX_SIZE_MB}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">CACHE_MEMORY_CLEANUP_ENABLED:</dt>
                      <dd className="font-mono text-gray-900">{cacheEnvConfig.CACHE_MEMORY_CLEANUP_ENABLED}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">CACHE_MEMORY_CLEANUP_INTERVAL_MS:</dt>
                      <dd className="font-mono text-gray-900">{cacheEnvConfig.CACHE_MEMORY_CLEANUP_INTERVAL_MS}</dd>
                    </div>
                </dl>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Redis Cache Settings</h4>
                <dl className="space-y-1">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">CACHE_REDIS_ENABLE:</dt>
                    <dd className="font-mono text-gray-900">{cacheEnvConfig.CACHE_REDIS_ENABLE}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">CACHE_REDIS_TTL:</dt>
                    <dd className="font-mono text-gray-900">{cacheEnvConfig.CACHE_REDIS_TTL}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">REDIS_HOST:</dt>
                    <dd className="font-mono text-gray-900">{cacheEnvConfig.REDIS_HOST}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">REDIS_PORT:</dt>
                    <dd className="font-mono text-gray-900">{cacheEnvConfig.REDIS_PORT}</dd>
                  </div>
                </dl>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Note: These values are from server-side environment variables.
                Values showing &quot;not set&quot; may be configured on the server but not exposed to the client.
              </p>
            </div>
          </div>
        </div>
        )}
      </div>
    </section>
  );
}