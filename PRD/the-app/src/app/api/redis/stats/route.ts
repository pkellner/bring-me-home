import { NextResponse } from 'next/server';
import getRedisConnectionLazy from '@/lib/redis/get-redis-connection-lazy';

export async function GET() {
  try {
    if (!process.env.REDIS_HOST || !process.env.REDIS_PORT) {
      return NextResponse.json({
        connected: false,
        error: 'Redis not configured',
      });
    }

    const redis = getRedisConnectionLazy(
      process.env.REDIS_HOST,
      parseInt(process.env.REDIS_PORT)
    );

    // Get comprehensive Redis info
    const info = await redis.info();
    
    // Parse various sections
    const parseSection = (section: string, key: string) => {
      const regex = new RegExp(`${key}:(.+)`, 'm');
      const match = info.match(regex);
      return match?.[1]?.trim();
    };

    // Server info
    const version = parseSection('server', 'redis_version') || 'unknown';
    const uptimeSeconds = parseInt(parseSection('server', 'uptime_in_seconds') || '0');
    const uptime = formatUptime(uptimeSeconds);
    const tcpPort = parseSection('server', 'tcp_port') || 'unknown';

    // Client info
    const connectedClients = parseInt(parseSection('clients', 'connected_clients') || '0');
    const blockedClients = parseInt(parseSection('clients', 'blocked_clients') || '0');
    const maxClients = parseInt(parseSection('clients', 'maxclients') || '0');

    // Memory info
    const usedMemory = parseSection('memory', 'used_memory_human') || '0B';
    const peakMemory = parseSection('memory', 'used_memory_peak_human') || '0B';
    const rssMemory = parseSection('memory', 'used_memory_rss_human') || '0B';
    const memFragmentation = parseFloat(parseSection('memory', 'mem_fragmentation_ratio') || '1');
    const evictedKeys = parseInt(parseSection('stats', 'evicted_keys') || '0');

    // Stats
    const totalCommands = parseInt(parseSection('stats', 'total_commands_processed') || '0');
    const opsPerSec = parseInt(parseSection('stats', 'instantaneous_ops_per_sec') || '0');
    const keyspaceHits = parseInt(parseSection('stats', 'keyspace_hits') || '0');
    const keyspaceMisses = parseInt(parseSection('stats', 'keyspace_misses') || '0');
    const hitRate = keyspaceHits + keyspaceMisses > 0 
      ? (keyspaceHits / (keyspaceHits + keyspaceMisses)) * 100 
      : 0;
    const expiredKeys = parseInt(parseSection('stats', 'expired_keys') || '0');

    // Persistence
    const loading = parseSection('persistence', 'loading') === '1';
    const lastSaveTime = parseInt(parseSection('persistence', 'rdb_last_save_time') || '0');
    const changesSinceLastSave = parseInt(parseSection('persistence', 'rdb_changes_since_last_save') || '0');

    // Keyspace info
    const keyspaceSection = info.split('# Keyspace')[1] || '';
    const databases = [];
    let totalKeys = 0;
    
    const dbRegex = /db(\d+):keys=(\d+),expires=(\d+)/g;
    let match;
    while ((match = dbRegex.exec(keyspaceSection)) !== null) {
      const db = parseInt(match[1]);
      const keys = parseInt(match[2]);
      const expires = parseInt(match[3]);
      databases.push({ db, keys, expires });
      totalKeys += keys;
    }

    return NextResponse.json({
      connected: true,
      info: {
        server: {
          version,
          uptime,
          tcp_port: tcpPort,
        },
        clients: {
          connected: connectedClients,
          blocked: blockedClients,
          maxClients,
        },
        memory: {
          used: usedMemory,
          peak: peakMemory,
          rss: rssMemory,
          fragmentation: memFragmentation,
          evictedKeys,
        },
        stats: {
          totalCommands,
          opsPerSec,
          hitRate,
          keyspaceHits,
          keyspaceMisses,
          expiredKeys,
        },
        persistence: {
          loading,
          lastSaveTime: new Date(lastSaveTime * 1000).toLocaleString(),
          changes: changesSinceLastSave,
        },
        keyspace: {
          databases,
          totalKeys,
        },
      },
    });
  } catch (error) {
    console.error('Redis stats error:', error);
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}