'use client';

import { useEffect, useState } from 'react';

interface RedisHealth {
  connected: boolean;
  ping?: number;
  memory?: {
    used: string;
    peak: string;
    ratio: number;
  };
  clients?: number;
  error?: string;
}

interface RedisHealthStatsProps {
  minimal?: boolean;
}

export default function RedisHealthStats({ minimal = false }: RedisHealthStatsProps) {
  const [health, setHealth] = useState<RedisHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/redis/health');
        const data = await response.json();
        setHealth(data);
      } catch {
        setHealth({ connected: false, error: 'Failed to fetch' });
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </div>
    );
  }

  if (!health || !health.connected) {
    return (
      <div className="flex items-center gap-2 text-xs text-red-600">
        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
        Redis: Offline
      </div>
    );
  }

  if (minimal) {
    return (
      <div className="flex items-center gap-2 text-xs text-green-600">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        Redis: {health.ping}ms
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-3 text-xs">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Status:</span>
          <span className="flex items-center gap-1 text-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Connected
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Ping:</span>
          <span className="font-mono text-gray-900">{health.ping}ms</span>
        </div>
        {health.memory && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Memory:</span>
              <span className="font-mono text-gray-900">{health.memory.used}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Clients:</span>
              <span className="font-mono text-gray-900">{health.clients}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}