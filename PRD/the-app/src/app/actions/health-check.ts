'use server';

import { prisma } from '@/lib/prisma';
import {
  getConnectionCounts,
  getDatabaseSessions,
  getDatabaseVersion,
  poolSettingsFromUrl,
  runConcurrentSleeps,
} from '@/lib/database-health';
import * as redisService from '@/lib/redis/redis-service';

export async function testRedisConnection() {
  try {
    const result = await redisService.redisHealthCheck();
    return {
      success: result.connected,
      data: result,
      error: result.error || null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function testDatabaseConnection() {
  const startTime = Date.now();
  const metrics = {
    connected: false,
    createTime: 0,
    readTime: 0,
    updateTime: 0,
    deleteTime: 0,
    totalTime: 0,
    databaseInfo: '',
  };

  try {
    metrics.databaseInfo = await getDatabaseVersion();

    // Test create operation
    const createStart = Date.now();
    const testRecord = await prisma.healthCheck.create({
      data: {
        testData: `Health check at ${new Date().toISOString()}`,
        testNumber: Math.floor(Math.random() * 1000000),
      },
    });
    metrics.createTime = Date.now() - createStart;

    // Test read operation
    const readStart = Date.now();
    const readRecord = await prisma.healthCheck.findUnique({
      where: { id: testRecord.id },
    });
    metrics.readTime = Date.now() - readStart;

    if (!readRecord) {
      throw new Error('Failed to read test record');
    }

    // Test update operation
    const updateStart = Date.now();
    await prisma.healthCheck.update({
      where: { id: testRecord.id },
      data: {
        testData: `Updated at ${new Date().toISOString()}`,
        testNumber: readRecord.testNumber + 1,
      },
    });
    metrics.updateTime = Date.now() - updateStart;

    // Test delete operation
    const deleteStart = Date.now();
    await prisma.healthCheck.delete({
      where: { id: testRecord.id },
    });
    metrics.deleteTime = Date.now() - deleteStart;

    metrics.totalTime = Date.now() - startTime;
    metrics.connected = true;

    return {
      success: true,
      data: metrics,
      error: null,
    };
  } catch (error) {
    metrics.totalTime = Date.now() - startTime;

    return {
      success: false,
      data: metrics,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function testDatabaseConnectionPool() {
  try {
    const startTime = Date.now();

    const { activeConnections, maxConnections } = await getConnectionCounts();
    const sessions = await getDatabaseSessions(5);
    const concurrentTest = await runConcurrentSleeps(20, 0.1);
    const { connectionLimit, poolTimeout } = poolSettingsFromUrl(process.env.DATABASE_URL);

    const queryTime = Date.now() - startTime;

    return {
      success: true,
      data: {
        connectionPoolStatus: {
          activeConnections,
          maxConnections,
          utilizationPercent: Math.round((activeConnections / maxConnections) * 100),
          // Prisma's defaults for PostgreSQL when the URL sets neither.
          connectionLimit: connectionLimit ?? 'Default (2 × CPU cores + 1)',
          poolTimeout: poolTimeout ?? 'Default (10s)',
        },
        concurrentTest: {
          ...concurrentTest,
          successRate: Math.round((concurrentTest.successful / concurrentTest.attempted) * 100),
        },
        topProcesses: sessions,
        queryTime: queryTime,
      },
      error: null,
    };
  } catch (error) {
    console.error('Connection pool test failed:', error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
