#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';

async function checkPrismaInstances() {
  console.log('=== Prisma Instance Check ===\n');
  
  // Check if we're in production
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('Global Prisma stored:', !!(globalThis as any).prisma);
  
  // Check database connections
  console.log('\nChecking database connections...');
  
  try {
    // Get process list
    const processList = await prisma.$queryRaw<Array<{ 
      Id: number;
      User: string;
      Host: string;
      db: string | null;
      Command: string;
      Time: number;
      State: string | null;
      Info: string | null;
    }>>`SHOW PROCESSLIST`;
    
    console.log(`\nTotal MySQL connections: ${processList.length}`);
    
    // Group by database
    const connectionsByDb = processList.reduce((acc, proc) => {
      const db = proc.db || 'null';
      acc[db] = (acc[db] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\nConnections by database:');
    Object.entries(connectionsByDb).forEach(([db, count]) => {
      console.log(`  ${db}: ${count}`);
    });
    
    // Show long-running connections
    const longRunning = processList.filter(p => p.Time > 60 && p.Command !== 'Sleep');
    if (longRunning.length > 0) {
      console.log('\nLong-running queries (>60s):');
      longRunning.forEach(p => {
        console.log(`  ID: ${p.Id}, Time: ${p.Time}s, State: ${p.State}`);
        console.log(`  Query: ${p.Info?.substring(0, 100)}...`);
      });
    }
    
    // Check current database
    const currentDb = await prisma.$queryRaw<Array<{ 'DATABASE()': string }>>`SELECT DATABASE()`;
    const dbName = currentDb[0]['DATABASE()'];
    console.log(`\nCurrent database: ${dbName}`);
    
    // Count connections to current database
    const ourConnections = processList.filter(p => p.db === dbName);
    console.log(`Connections to our database: ${ourConnections.length}`);
    
    // Check for sleeping connections
    const sleepingConnections = ourConnections.filter(p => p.Command === 'Sleep');
    console.log(`Sleeping connections: ${sleepingConnections.length}`);
    
    // Kill old sleeping connections (optional - commented out for safety)
    if (sleepingConnections.length > 50) {
      console.log('\nWARNING: Many sleeping connections detected!');
      // Uncomment to kill old sleeping connections:
      // for (const conn of sleepingConnections.filter(c => c.Time > 300)) {
      //   await prisma.$executeRaw`KILL ${conn.Id}`;
      //   console.log(`Killed connection ${conn.Id} (idle for ${conn.Time}s)`);
      // }
    }
    
  } catch (error) {
    console.error('Error checking connections:', error);
  }
  
  await prisma.$disconnect();
}

checkPrismaInstances().catch(console.error);