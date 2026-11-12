#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';
import {
  getConnectionCounts,
  getDatabaseSessions,
  getDatabaseVersion,
  poolSettingsFromUrl,
  runConcurrentSleeps,
} from '../src/lib/database-health';

async function monitorDatabaseConnections() {
  console.log('Database Connection Pool Monitor');
  console.log('================================\n');

  try {
    // Test basic connectivity
    console.log('Testing database connection...');
    const startTime = Date.now();
    const version = await getDatabaseVersion();
    const connectionTime = Date.now() - startTime;
    console.log(`✓ Connected to ${version} (${connectionTime}ms)\n`);

    console.log('PostgreSQL Connection Status:');
    console.log('-----------------------------');
    const { activeConnections, maxConnections } = await getConnectionCounts();
    console.log(`Client connections to this database: ${activeConnections}`);
    console.log(`Server max_connections (shared by every database on the server): ${maxConnections}`);

    console.log('\nDatabase Sessions (longest in their state first):');
    console.log('-------------------------------------------------');
    const sessions = await getDatabaseSessions(10);
    if (sessions.length === 0) {
      console.log('No sessions found');
    } else {
      sessions.forEach(session => {
        const waiting = session.waitEvent ? `, waiting on ${session.waitEvent}` : '';
        const seconds = session.secondsInState === null ? '?' : session.secondsInState;
        console.log(`PID ${session.pid}: ${session.state ?? 'unknown'}${waiting} (${seconds}s)`);
      });
    }

    console.log('\nTesting concurrent connections...');
    const concurrent = await runConcurrentSleeps(20, 0.1);
    console.log(`Concurrent test: ${concurrent.successful}/${concurrent.attempted} queries successful`);
    if (concurrent.firstError) {
      console.log(`First error: ${concurrent.firstError}`);
    }

    const { connectionLimit, poolTimeout } = poolSettingsFromUrl(process.env.DATABASE_URL);
    console.log('\nPool settings in DATABASE_URL:');
    console.log('------------------------------');
    console.log(`- connection_limit=${connectionLimit ?? 'not set (Prisma default: 2 × CPU cores + 1)'}`);
    console.log(`- pool_timeout=${poolTimeout ?? 'not set (Prisma default: 10s)'}`);
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
