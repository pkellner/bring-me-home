'use server';

import { prisma } from '@/lib/prisma';
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
    // Get database info
    const dbInfo = await prisma.$queryRaw`SELECT VERSION() as version`;
    metrics.databaseInfo =
      (dbInfo as Array<{ version: string }>)[0]?.version || 'Unknown';

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
    
    // Get current connection count
    const connectionsResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count 
      FROM information_schema.processlist 
      WHERE db = DATABASE()
    `;
    const connectionCount = Number(connectionsResult[0]?.count || 0);
    
    // Get max connections setting
    const [maxConnections] = await prisma.$queryRaw<[{ Variable_name: string; Value: string }]>`
      SHOW VARIABLES LIKE 'max_connections'
    `;
    
    // Get active processes
    const processes = await prisma.$queryRaw<Array<{
      id: number;
      user: string;
      host: string;
      db: string;
      command: string;
      time: number;
      state: string | null;
    }>>`
      SELECT id, user, host, db, command, time, state
      FROM information_schema.processlist
      WHERE db = DATABASE()
      ORDER BY time DESC
      LIMIT 20
    `;
    
    // Test concurrent connections
    const concurrentTests = 20;
    const promises = [];
    
    for (let i = 0; i < concurrentTests; i++) {
      promises.push(
        prisma.$queryRaw`SELECT SLEEP(0.1)`.then(() => true).catch(() => false)
      );
    }
    
    const results = await Promise.all(promises);
    const successful = results.filter(r => r).length;
    
    const queryTime = Date.now() - startTime;
    
    return {
      success: true,
      data: {
        connectionPoolStatus: {
          activeConnections: connectionCount,
          maxConnections: parseInt(maxConnections.Value),
          utilizationPercent: Math.round((connectionCount / parseInt(maxConnections.Value)) * 100),
          connectionLimit: process.env.DATABASE_URL?.includes('connection_limit=') 
            ? parseInt(process.env.DATABASE_URL.match(/connection_limit=(\d+)/)?.[1] || '0')
            : 'Default (33)',
          poolTimeout: process.env.DATABASE_URL?.includes('pool_timeout=')
            ? parseInt(process.env.DATABASE_URL.match(/pool_timeout=(\d+)/)?.[1] || '0')
            : 'Default (10s)',
        },
        concurrentTest: {
          attempted: concurrentTests,
          successful: successful,
          failed: concurrentTests - successful,
          successRate: Math.round((successful / concurrentTests) * 100),
        },
        topProcesses: processes.slice(0, 5).map((proc) => ({
          id: proc.id,
          command: proc.command,
          state: proc.state || 'Sleep',
          duration: proc.time,
        })),
        queryTime: queryTime,
      },
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
