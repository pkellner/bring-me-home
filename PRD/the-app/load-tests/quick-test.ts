#!/usr/bin/env tsx
/**
 * Quick Load Test - Minimal dependencies, server-driven configuration
 * Usage: npx tsx quick-test.ts [url] [duration]
 * Example: npx tsx quick-test.ts https://cache2.bring-me-home.com 30
 */

import https from 'https';
import http from 'http';

async function quickLoadTest(baseUrl: string, duration: number = 30) {
  console.log(`🚀 Quick Load Test`);
  console.log(`📍 Target: ${baseUrl}`);
  console.log(`⏱️  Duration: ${duration}s`);
  
  try {
    // Fetch test configuration
    console.log('\n📋 Fetching test URLs from server...');
    const configResponse = await fetch(`${baseUrl}/api/load-test-urls`);
    
    if (!configResponse.ok) {
      throw new Error(`Failed to fetch config: ${configResponse.status}`);
    }
    
    const config = await configResponse.json();
    const urls = config.urls.map((u: any) => u.path);
    
    console.log(`✅ Found ${urls.length} URLs to test`);
    console.log(`   Categories: ${Object.entries(config.metadata.categories)
      .map(([cat, count]) => `${cat}(${count})`)
      .join(', ')}`);
    
    // Show a sample of URLs
    console.log('\n📝 Sample URLs:');
    const sampleUrls = config.urls.slice(0, 5);
    sampleUrls.forEach((u: any) => {
      console.log(`   ${u.cacheable ? '🚀' : '  '} ${u.path}`);
    });
    if (config.urls.length > 5) {
      console.log(`   ... and ${config.urls.length - 5} more URLs`)
    }
    
    // Run the test
    console.log('\n🏃 Running load test...');
    const startTime = Date.now();
    const endTime = startTime + (duration * 1000);
    let requestCount = 0;
    let successCount = 0;
    let errorCount = 0;
    let cacheHits = 0;
    let totalResponseTime = 0;
    
    // Simple concurrent request loop
    const makeRequest = async () => {
      while (Date.now() < endTime) {
        const url = urls[Math.floor(Math.random() * urls.length)];
        const requestStart = Date.now();
        
        try {
          const response = await fetch(`${baseUrl}${url}`, {
            headers: { 'User-Agent': 'Quick Load Test' }
          });
          
          const responseTime = Date.now() - requestStart;
          totalResponseTime += responseTime;
          requestCount++;
          
          if (response.ok) {
            successCount++;
            // Check for cache hit
            const cacheSource = response.headers.get('x-cache-source');
            if (cacheSource && (cacheSource === 'memory' || cacheSource === 'redis')) {
              cacheHits++;
            }
          } else {
            errorCount++;
          }
          
          // Progress update every 100 requests
          if (requestCount % 100 === 0) {
            const elapsed = (Date.now() - startTime) / 1000;
            const rps = requestCount / elapsed;
            process.stdout.write(`\r   Requests: ${requestCount} | RPS: ${rps.toFixed(1)} | Success: ${successCount} | Errors: ${errorCount}`);
          }
        } catch (error) {
          errorCount++;
          requestCount++;
        }
      }
    };
    
    // Run 10 concurrent workers
    const workers = Array(10).fill(0).map(() => makeRequest());
    await Promise.all(workers);
    
    // Final results
    const totalDuration = (Date.now() - startTime) / 1000;
    const avgResponseTime = totalResponseTime / requestCount;
    const rps = requestCount / totalDuration;
    const errorRate = (errorCount / requestCount) * 100;
    
    console.log('\n\n📊 Results:');
    console.log('─────────────────────────────────');
    console.log(`Total Requests:     ${requestCount}`);
    console.log(`Successful:         ${successCount} (${((successCount/requestCount)*100).toFixed(1)}%)`);
    console.log(`Failed:             ${errorCount} (${errorRate.toFixed(1)}%)`);
    console.log(`Requests/Second:    ${rps.toFixed(1)}`);
    console.log(`Avg Response Time:  ${avgResponseTime.toFixed(0)}ms`);
    
    if (config.metadata.cacheableUrls > 0) {
      console.log(`Cache Hits:         ${cacheHits} (API requests only)`);
    }
    
    // Quick verdict
    console.log('\n🎯 Performance:');
    if (errorRate < 1 && avgResponseTime < 1000) {
      console.log('✅ EXCELLENT');
    } else if (errorRate < 5 && avgResponseTime < 2000) {
      console.log('⚠️  GOOD');
    } else {
      console.log('❌ NEEDS IMPROVEMENT');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Parse arguments and run
const args = process.argv.slice(2);
const url = args[0] || 'http://localhost:3000';
const duration = parseInt(args[1]) || 30;

quickLoadTest(url, duration).catch(console.error);