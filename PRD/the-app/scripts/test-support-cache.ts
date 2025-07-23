#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';

async function testSupportCache() {
  console.log('=== Support Stats Cache Test ===\n');
  
  console.log('Cache settings:');
  console.log(`CACHE_MEMORY_ENABLE: ${process.env.CACHE_MEMORY_ENABLE || 'false'}`);
  console.log(`CACHE_REDIS_ENABLE: ${process.env.CACHE_REDIS_ENABLE || 'false'}`);
  console.log(`CACHE_SUPPORT_STATS_TTL: ${process.env.CACHE_SUPPORT_STATS_TTL || '300'}s`);
  console.log('\n');

  try {
    // Find a person with support
    const person = await prisma.person.findFirst({
      where: {
        isActive: true,
        OR: [
          { anonymousSupport: { some: {} } },
          { comments: { some: { isApproved: true } } }
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        _count: {
          select: {
            anonymousSupport: true,
            comments: { where: { isApproved: true } }
          }
        }
      }
    });

    if (!person) {
      console.log('No person with support found. Please add some support data first.');
      return;
    }

    console.log(`Testing with person: ${person.firstName} ${person.lastName}`);
    console.log(`Person ID: ${person.id}`);
    console.log(`Current stats: ${person._count.anonymousSupport} anonymous support, ${person._count.comments} messages\n`);

    // Test the API endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    console.log('Making API requests to test caching...\n');
    
    // First request (should hit database)
    console.log('Request 1 (cold cache):');
    const start1 = Date.now();
    const response1 = await fetch(`${baseUrl}/api/persons/${person.id}/support`);
    const data1 = await response1.json();
    const time1 = Date.now() - start1;
    console.log(`Response time: ${time1}ms`);
    console.log(`Data:`, data1);
    console.log();
    
    // Second request (should hit cache)
    console.log('Request 2 (warm cache):');
    const start2 = Date.now();
    const response2 = await fetch(`${baseUrl}/api/persons/${person.id}/support`);
    const data2 = await response2.json();
    const time2 = Date.now() - start2;
    console.log(`Response time: ${time2}ms`);
    console.log(`Data:`, data2);
    console.log();
    
    // Third request (should hit cache)
    console.log('Request 3 (cached):');
    const start3 = Date.now();
    const response3 = await fetch(`${baseUrl}/api/persons/${person.id}/support`);
    const data3 = await response3.json();
    const time3 = Date.now() - start3;
    console.log(`Response time: ${time3}ms`);
    console.log(`Data:`, data3);
    console.log();
    
    console.log('Performance Summary:');
    console.log(`- First request: ${time1}ms (database query)`);
    console.log(`- Second request: ${time2}ms (${Math.round(((time1 - time2) / time1) * 100)}% faster)`);
    console.log(`- Third request: ${time3}ms (${Math.round(((time1 - time3) / time1) * 100)}% faster)`);
    
    if (time2 < time1 * 0.5 && time3 < time1 * 0.5) {
      console.log('\n✅ Caching is working correctly!');
    } else {
      console.log('\n⚠️  Cache might not be working as expected. Check your cache settings.');
    }

  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSupportCache();