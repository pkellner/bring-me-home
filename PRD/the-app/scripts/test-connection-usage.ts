#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';

async function monitorConnectionUsage() {
  console.log('=== Connection Usage Test ===\n');
  console.log('Starting test at:', new Date().toISOString());
  console.log('DATABASE_URL connection settings:');
  console.log(`  connection_limit: ${process.env.DATABASE_URL?.match(/connection_limit=(\d+)/)?.[1] || 'default'}`);
  console.log(`  pool_timeout: ${process.env.DATABASE_URL?.match(/pool_timeout=(\d+)/)?.[1] || 'default'}`);
  console.log('\n');

  // Test 1: Check initial database connections
  console.log('Test 1: Initial Database Connection Count');
  try {
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count 
      FROM information_schema.processlist 
      WHERE db = DATABASE()
    `;
    console.log(`Active connections: ${result[0]?.count || 0}`);
    
    const maxConnResult = await prisma.$queryRaw<Array<{ value: string }>>`
      SHOW VARIABLES LIKE 'max_connections'
    `;
    console.log(`Max connections allowed: ${maxConnResult[0]?.value || 'unknown'}`);
  } catch (error) {
    console.error('Error checking connections:', error);
  }

  console.log('\n---\n');

  // Test 2: Make a request to the person page API
  console.log('Test 2: Fetching Person Data via API');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  try {
    console.log('Making request to /api/person-data/borrego_springs/joe_plumber');
    const startTime = Date.now();
    
    // Check connection stats before
    const statsBefore = await fetch(`${baseUrl}/api/debug/connection-stats`).then(r => r.json());
    console.log('\nStats BEFORE request:');
    console.log(`  Total queries: ${statsBefore.prismaStats.totalQueries}`);
    console.log(`  Active queries: ${statsBefore.prismaStats.activeQueries}`);
    console.log(`  DB connections: ${statsBefore.databaseInfo?.activeConnections || 'N/A'}`);
    
    // Make the actual request
    const response = await fetch(`${baseUrl}/api/person-data/borrego_springs/joe_plumber`);
    const data = await response.json();
    
    const duration = Date.now() - startTime;
    console.log(`\nRequest completed in ${duration}ms`);
    console.log(`Response status: ${response.status}`);
    
    // Check connection stats after
    const statsAfter = await fetch(`${baseUrl}/api/debug/connection-stats`).then(r => r.json());
    console.log('\nStats AFTER request:');
    console.log(`  Total queries: ${statsAfter.prismaStats.totalQueries}`);
    console.log(`  Active queries: ${statsAfter.prismaStats.activeQueries}`);
    console.log(`  DB connections: ${statsAfter.databaseInfo?.activeConnections || 'N/A'}`);
    
    console.log('\nQuery increase:', statsAfter.prismaStats.totalQueries - statsBefore.prismaStats.totalQueries);
    
    // Show recent queries
    console.log('\nRecent queries:');
    statsAfter.prismaStats.recentQueries.forEach((q: any, i: number) => {
      console.log(`  ${i + 1}. ${q.query} (${q.duration}ms)`);
    });
    
  } catch (error) {
    console.error('Error during test:', error);
  }

  console.log('\n---\n');

  // Test 3: Direct database query test
  console.log('Test 3: Testing Direct Prisma Queries');
  
  const queryStart = Date.now();
  console.log('Executing person.findFirst query...');
  
  try {
    const person = await prisma.person.findFirst({
      where: {
        slug: 'joe_plumber',
        town: {
          slug: 'borrego_springs',
        },
      },
      include: {
        town: true,
        comments: {
          take: 5,
        },
      },
    });
    
    const queryDuration = Date.now() - queryStart;
    console.log(`Query completed in ${queryDuration}ms`);
    console.log(`Found person: ${person?.firstName} ${person?.lastName}`);
    console.log(`Comments included: ${person?.comments.length || 0}`);
    
  } catch (error) {
    console.error('Error in direct query:', error);
  }

  // Final connection check
  console.log('\n---\n');
  console.log('Final Connection Status:');
  try {
    const finalStats = await fetch(`${baseUrl}/api/debug/connection-stats`).then(r => r.json());
    console.log('Prisma Stats:', JSON.stringify(finalStats.prismaStats, null, 2));
    console.log('Database Info:', JSON.stringify(finalStats.databaseInfo, null, 2));
  } catch (error) {
    console.error('Error fetching final stats:', error);
  }

  await prisma.$disconnect();
}

// Run the test
monitorConnectionUsage().catch(console.error);