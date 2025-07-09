'use server';

import { prisma } from '@/lib/prisma';
import * as redisService from '@/lib/redis/redis-service';

export async function testRedisConnection() {
  try {
    const result = await redisService.redisHealthCheck();
    return {
      success: result.connected,
      data: result,
      error: result.error
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error'
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
    databaseInfo: ''
  };

  try {
    // Get database info
    const dbInfo = await prisma.$queryRaw`SELECT VERSION() as version`;
    metrics.databaseInfo = (dbInfo as any)[0]?.version || 'Unknown';

    // Test create operation
    const createStart = Date.now();
    const testRecord = await prisma.healthCheck.create({
      data: {
        testData: `Health check at ${new Date().toISOString()}`,
        testNumber: Math.floor(Math.random() * 1000000)
      }
    });
    metrics.createTime = Date.now() - createStart;

    // Test read operation
    const readStart = Date.now();
    const readRecord = await prisma.healthCheck.findUnique({
      where: { id: testRecord.id }
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
        testNumber: readRecord.testNumber + 1
      }
    });
    metrics.updateTime = Date.now() - updateStart;

    // Test delete operation
    const deleteStart = Date.now();
    await prisma.healthCheck.delete({
      where: { id: testRecord.id }
    });
    metrics.deleteTime = Date.now() - deleteStart;

    metrics.totalTime = Date.now() - startTime;
    metrics.connected = true;

    return {
      success: true,
      data: metrics,
      error: null
    };
  } catch (error) {
    metrics.totalTime = Date.now() - startTime;
    
    return {
      success: false,
      data: metrics,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}