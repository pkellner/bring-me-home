#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';

async function monitorDatabaseConnections() {
  console.log('Database Connection Pool Monitor');
  console.log('================================\n');

  try {
    // Test basic connectivity
    console.log('Testing database connection...');
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const connectionTime = Date.now() - startTime;
    console.log(`✓ Database connected successfully (${connectionTime}ms)\n`);

    // Get MySQL connection information
    console.log('MySQL Connection Pool Status:');
    console.log('-----------------------------');
    
    // Check current connections
    const [connections] = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count 
      FROM information_schema.processlist 
      WHERE db = DATABASE()
    `;
    console.log(`Active connections to database: ${connections.count}`);

    // Check max connections setting
    const [maxConnections] = await prisma.$queryRaw<any[]>`
      SHOW VARIABLES LIKE 'max_connections'
    `;
    console.log(`MySQL max_connections setting: ${maxConnections.Value}`);

    // Show current processes
    console.log('\nActive Database Processes:');
    console.log('-------------------------');
    const processes = await prisma.$queryRaw<any[]>`
      SELECT id, user, host, db, command, time, state
      FROM information_schema.processlist
      WHERE db = DATABASE()
      ORDER BY time DESC
      LIMIT 10
    `;
    
    if (processes.length === 0) {
      console.log('No active processes found');
    } else {
      processes.forEach((proc: any) => {
        console.log(`PID ${proc.id}: ${proc.command} - ${proc.state} (${proc.time}s)`);
      });
    }

    // Test concurrent connections
    console.log('\nTesting concurrent connections...');
    const concurrentTests = 20;
    const promises = [];
    
    for (let i = 0; i < concurrentTests; i++) {
      promises.push(
        prisma.$queryRaw`SELECT SLEEP(0.1)`.then(() => true).catch(() => false)
      );
    }
    
    const results = await Promise.all(promises);
    const successful = results.filter(r => r).length;
    console.log(`Concurrent test: ${successful}/${concurrentTests} connections successful`);

    // Connection pool recommendations
    console.log('\nRecommendations:');
    console.log('----------------');
    console.log('Current DATABASE_URL parameters:');
    console.log('- connection_limit=100 (increased from default 33)');
    console.log('- pool_timeout=30 (increased from default 10)');
    console.log('- connect_timeout=30 (increased from default 10)');
    console.log('\nIf you continue to see timeout errors:');
    console.log('1. Check for long-running queries that hold connections');
    console.log('2. Ensure all Prisma queries are properly awaited');
    console.log('3. Consider implementing query result caching');
    console.log('4. Monitor for connection leaks in your application');

  } catch (error) {
    console.error('Error monitoring database connections:', error);
  } finally {
    await prisma.$disconnect();
  }
}

monitorDatabaseConnections();