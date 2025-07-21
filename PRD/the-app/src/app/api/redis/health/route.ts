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

    // Measure ping time
    const start = Date.now();
    await redis.ping();
    const pingTime = Date.now() - start;

    // Get Redis info
    const info = await redis.info();
    
    // Parse memory info
    const memoryUsed = info.match(/used_memory_human:(.+)/)?.[1]?.trim();
    const memoryPeak = info.match(/used_memory_peak_human:(.+)/)?.[1]?.trim();
    const connectedClients = info.match(/connected_clients:(\d+)/)?.[1];
    
    // Calculate memory ratio
    const usedBytes = parseInt(info.match(/used_memory:(\d+)/)?.[1] || '0');
    const peakBytes = parseInt(info.match(/used_memory_peak:(\d+)/)?.[1] || '1');
    const memoryRatio = Math.round((usedBytes / peakBytes) * 100);

    return NextResponse.json({
      connected: true,
      ping: pingTime,
      memory: memoryUsed && memoryPeak ? {
        used: memoryUsed,
        peak: memoryPeak,
        ratio: memoryRatio,
      } : undefined,
      clients: connectedClients ? parseInt(connectedClients) : undefined,
    });
  } catch (error) {
    console.error('Redis health check error:', error);
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}