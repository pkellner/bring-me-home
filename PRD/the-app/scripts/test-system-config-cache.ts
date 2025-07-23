#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';
import { getSystemConfig, getSystemLayoutTheme } from '../src/app/actions/systemConfig';

async function testSystemConfigCache() {
  console.log('=== System Config Cache Test ===\n');
  
  console.log('Cache settings:');
  console.log(`CACHE_MEMORY_ENABLE: ${process.env.CACHE_MEMORY_ENABLE || 'false'}`);
  console.log(`CACHE_REDIS_ENABLE: ${process.env.CACHE_REDIS_ENABLE || 'false'}`);
  console.log(`CACHE_SYSTEM_CONFIG_TTL: ${process.env.CACHE_SYSTEM_CONFIG_TTL || '120'}s`);
  console.log('\n');

  try {
    // Test individual config caching
    console.log('Testing individual config (SYSTEM_DEFAULT_LAYOUT):\n');
    
    // First request (should hit database)
    console.log('Request 1 (cold cache):');
    const start1 = Date.now();
    const layout1 = await getSystemConfig('SYSTEM_DEFAULT_LAYOUT');
    const time1 = Date.now() - start1;
    console.log(`Response time: ${time1}ms`);
    console.log(`Value: ${layout1}`);
    console.log();
    
    // Second request (should hit cache)
    console.log('Request 2 (warm cache):');
    const start2 = Date.now();
    const layout2 = await getSystemConfig('SYSTEM_DEFAULT_LAYOUT');
    const time2 = Date.now() - start2;
    console.log(`Response time: ${time2}ms`);
    console.log(`Value: ${layout2}`);
    console.log();
    
    // Test combined layout/theme caching
    console.log('\nTesting combined layout/theme config:\n');
    
    // First request (should hit database)
    console.log('Request 1 (cold cache):');
    const start3 = Date.now();
    const combined1 = await getSystemLayoutTheme();
    const time3 = Date.now() - start3;
    console.log(`Response time: ${time3}ms`);
    console.log(`Values:`, combined1);
    console.log();
    
    // Second request (should hit cache)
    console.log('Request 2 (warm cache):');
    const start4 = Date.now();
    const combined2 = await getSystemLayoutTheme();
    const time4 = Date.now() - start4;
    console.log(`Response time: ${time4}ms`);
    console.log(`Values:`, combined2);
    console.log();
    
    // Third request (should hit cache)
    console.log('Request 3 (cached):');
    const start5 = Date.now();
    const combined3 = await getSystemLayoutTheme();
    const time5 = Date.now() - start5;
    console.log(`Response time: ${time5}ms`);
    console.log(`Values:`, combined3);
    console.log();
    
    console.log('Performance Summary:');
    console.log('\nIndividual config:');
    console.log(`- First request: ${time1}ms (database query)`);
    console.log(`- Second request: ${time2}ms (${Math.round(((time1 - time2) / time1) * 100)}% faster)`);
    
    console.log('\nCombined layout/theme:');
    console.log(`- First request: ${time3}ms (database query)`);
    console.log(`- Second request: ${time4}ms (${Math.round(((time3 - time4) / time3) * 100)}% faster)`);
    console.log(`- Third request: ${time5}ms (${Math.round(((time3 - time5) / time3) * 100)}% faster)`);
    
    if (time2 < time1 * 0.5 && time4 < time3 * 0.5 && time5 < time3 * 0.5) {
      console.log('\n✅ System config caching is working correctly!');
    } else {
      console.log('\n⚠️  Cache might not be working as expected. Check your cache settings.');
    }

  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSystemConfigCache();