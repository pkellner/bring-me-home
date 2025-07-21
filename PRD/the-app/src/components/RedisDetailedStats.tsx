'use client';

import { useEffect, useState, useRef } from 'react';

interface RedisStats {
  connected: boolean;
  error?: string;
  info?: {
    server: {
      version: string;
      uptime: string;
      tcp_port: string;
    };
    clients: {
      connected: number;
      blocked: number;
      maxClients: number;
    };
    memory: {
      used: string;
      peak: string;
      rss: string;
      fragmentation: number;
      evictedKeys: number;
    };
    stats: {
      totalCommands: number;
      opsPerSec: number;
      hitRate: number;
      keyspaceHits: number;
      keyspaceMisses: number;
      expiredKeys: number;
    };
    persistence: {
      loading: boolean;
      lastSaveTime: string;
      changes: number;
    };
    keyspace: {
      databases: { db: number; keys: number; expires: number }[];
      totalKeys: number;
    };
  };
  healthCheck?: {
    writeTime: number;
    readTime: number;
    deleteTime: number;
    totalTime: number;
  };
}

export default function RedisDetailedStats() {
  const [stats, setStats] = useState<RedisStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updateCount, setUpdateCount] = useState(0);
  const [isUpdating, setIsUpdating] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_UPDATES = 30; // 30 updates = 1 minute at 2 second intervals

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/redis/stats');
      const data = await response.json();
      
      // Also get health check data
      const healthResponse = await fetch('/api/redis/health');
      const healthData = await healthResponse.json();
      
      setStats({
        ...data,
        healthCheck: healthData.connected && healthData.ping ? {
          writeTime: healthData.ping,
          readTime: healthData.ping,
          deleteTime: healthData.ping,
          totalTime: healthData.ping * 3,
        } : undefined,
      });
    } catch (error) {
      setStats({ 
        connected: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch stats' 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    if (isUpdating) {
      intervalRef.current = setInterval(() => {
        setUpdateCount(prev => {
          const newCount = prev + 1;
          if (newCount >= MAX_UPDATES) {
            setIsUpdating(false);
          }
          return newCount;
        });
        fetchStats();
      }, 2000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isUpdating]);

  const handleCancel = () => {
    setIsUpdating(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const handleResume = () => {
    setUpdateCount(0);
    setIsUpdating(true);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats || !stats.connected) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-red-600 mb-2">Redis Offline</h3>
        <p className="text-gray-600">{stats?.error || 'Redis is not connected'}</p>
      </div>
    );
  }

  const { info, healthCheck } = stats;

  return (
    <div className="bg-gray-50 rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Redis Server Statistics</h3>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {isUpdating 
                ? `Update ${updateCount}/${MAX_UPDATES}` 
                : 'Updates paused'}
            </span>
            {isUpdating ? (
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            ) : (
              <button
                onClick={handleResume}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Resume
              </button>
            )}
          </div>
        </div>

        {info && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Server Info */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Server</h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Version:</dt>
                  <dd className="font-mono text-gray-900">{info.server.version}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Uptime:</dt>
                  <dd className="font-mono text-gray-900">{info.server.uptime}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Port:</dt>
                  <dd className="font-mono text-gray-900">{info.server.tcp_port}</dd>
                </div>
              </dl>
            </div>

            {/* Memory Info */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Memory</h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Used:</dt>
                  <dd className="font-mono text-gray-900">{info.memory.used}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Peak:</dt>
                  <dd className="font-mono text-gray-900">{info.memory.peak}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">RSS:</dt>
                  <dd className="font-mono text-gray-900">{info.memory.rss}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Fragmentation:</dt>
                  <dd className="font-mono text-gray-900">{info.memory.fragmentation.toFixed(2)}</dd>
                </div>
              </dl>
            </div>

            {/* Performance Stats */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Performance</h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Commands:</dt>
                  <dd className="font-mono text-gray-900">{info.stats.totalCommands.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Ops/sec:</dt>
                  <dd className="font-mono text-gray-900">{info.stats.opsPerSec}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Hit Rate:</dt>
                  <dd className="font-mono text-gray-900">{info.stats.hitRate.toFixed(1)}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Expired Keys:</dt>
                  <dd className="font-mono text-gray-900">{info.stats.expiredKeys.toLocaleString()}</dd>
                </div>
              </dl>
            </div>

            {/* Clients Info */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Clients</h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Connected:</dt>
                  <dd className="font-mono text-gray-900">{info.clients.connected}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Blocked:</dt>
                  <dd className="font-mono text-gray-900">{info.clients.blocked}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Max Clients:</dt>
                  <dd className="font-mono text-gray-900">{info.clients.maxClients.toLocaleString()}</dd>
                </div>
              </dl>
            </div>

            {/* Keyspace Info */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Keyspace</h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Total Keys:</dt>
                  <dd className="font-mono text-gray-900">{info.keyspace.totalKeys.toLocaleString()}</dd>
                </div>
                {info.keyspace.databases.map(db => (
                  <div key={db.db} className="flex justify-between">
                    <dt className="text-gray-600">DB{db.db}:</dt>
                    <dd className="font-mono text-xs text-gray-900">
                      {db.keys} keys, {db.expires} exp
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Health Check Performance */}
            {healthCheck && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Operation Latency</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Write:</dt>
                    <dd className="font-mono text-gray-900">{healthCheck.writeTime}ms</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Read:</dt>
                    <dd className="font-mono text-gray-900">{healthCheck.readTime}ms</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Delete:</dt>
                    <dd className="font-mono text-gray-900">{healthCheck.deleteTime}ms</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Total Test:</dt>
                    <dd className="font-mono text-gray-900">{healthCheck.totalTime}ms</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        )}

        {/* Progress bar for updates */}
        {isUpdating && (
          <div className="mt-6">
            <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-blue-500 h-full transition-all duration-1000 ease-linear"
                style={{ width: `${(updateCount / MAX_UPDATES) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}