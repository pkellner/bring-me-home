#!/usr/bin/env tsx
/**
 * Comprehensive Load Test - Tests ALL towns and persons
 * Usage: npx tsx comprehensive-test.ts [url] [concurrentUsers] [duration]
 * Example: npx tsx comprehensive-test.ts https://cache2.bring-me-home.com 5 60
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';

interface TestUrl {
  path: string;
  name: string;
  category: string;
  priority: string;
  cacheable: boolean;
}

interface TestResult {
  url: string;
  statusCode: number;
  responseTime: number;
  error?: string;
  cacheSource?: string;
  category?: string;
}

async function comprehensiveLoadTest(baseUrl: string, concurrentUsers: number = 5, duration: number = 60) {
  console.log(`🔥 Comprehensive Load Test - ALL Towns & Persons`);
  console.log(`📍 Target: ${baseUrl}`);
  console.log(`👥 Concurrent Users: ${concurrentUsers}`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log('─'.repeat(60));
  
  try {
    // Fetch ALL URLs including every person
    console.log('\n📋 Fetching ALL test URLs from server...');
    const configUrl = `${baseUrl}/api/load-test-urls?allPersons=true&allTowns=true`;
    const configResponse = await fetch(configUrl);
    
    if (!configResponse.ok) {
      throw new Error(`Failed to fetch config: ${configResponse.status}`);
    }
    
    const config = await configResponse.json();
    const urls: TestUrl[] = config.urls;
    
    console.log(`\n✅ Found ${urls.length} URLs to test`);
    console.log(`   Categories: ${Object.entries(config.metadata.categories)
      .map(([cat, count]) => `${cat}(${count})`)
      .join(', ')}`);
    
    // Display all URLs grouped by category
    console.log('\n📝 ALL URLs to be tested:');
    console.log('─'.repeat(60));
    
    const urlsByCategory = urls.reduce((acc, url) => {
      if (!acc[url.category]) acc[url.category] = [];
      acc[url.category].push(url);
      return acc;
    }, {} as Record<string, TestUrl[]>);
    
    Object.entries(urlsByCategory).forEach(([category, categoryUrls]) => {
      console.log(`\n${category.toUpperCase()} (${categoryUrls.length} URLs):`);
      categoryUrls.forEach(url => {
        const cacheIcon = url.cacheable ? '🚀' : '  ';
        console.log(`  ${cacheIcon} ${url.path}`);
      });
    });
    
    console.log('\n─'.repeat(60));
    console.log(`\n⚠️  WARNING: Testing ${urls.length} URLs with ${concurrentUsers} concurrent users`);
    console.log(`This will generate approximately ${Math.floor(urls.length * duration / 10)} requests\n`);
    
    // Confirm before proceeding with large tests
    if (urls.length > 100) {
      console.log('Press Ctrl+C within 5 seconds to cancel...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Run the test
    console.log('🏃 Starting comprehensive load test...\n');
    const startTime = Date.now();
    const endTime = startTime + (duration * 1000);
    const results: TestResult[] = [];
    let requestCount = 0;
    let activeRequests = 0;
    
    // Helper to make HTTP request
    const makeRequest = (url: TestUrl): Promise<TestResult> => {
      return new Promise((resolve) => {
        const requestStart = Date.now();
        const fullUrl = new URL(url.path, baseUrl);
        const protocol = fullUrl.protocol === 'https:' ? https : http;
        
        const options = {
          hostname: fullUrl.hostname,
          port: fullUrl.port || (fullUrl.protocol === 'https:' ? 443 : 80),
          path: fullUrl.pathname,
          method: 'GET',
          headers: {
            'User-Agent': 'Comprehensive Load Test'
          },
          timeout: 30000
        };
        
        const req = protocol.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            resolve({
              url: url.path,
              statusCode: res.statusCode || 0,
              responseTime: Date.now() - requestStart,
              cacheSource: res.headers['x-cache-source'] as string,
              category: url.category
            });
          });
        });
        
        req.on('error', (error) => {
          resolve({
            url: url.path,
            statusCode: 0,
            responseTime: Date.now() - requestStart,
            error: error.message,
            category: url.category
          });
        });
        
        req.on('timeout', () => {
          req.destroy();
          resolve({
            url: url.path,
            statusCode: 0,
            responseTime: 30000,
            error: 'Timeout',
            category: url.category
          });
        });
        
        req.end();
      });
    };
    
    // Worker function
    const worker = async () => {
      while (Date.now() < endTime) {
        if (activeRequests < concurrentUsers) {
          activeRequests++;
          const url = urls[requestCount % urls.length]; // Round-robin through all URLs
          
          makeRequest(url).then((result) => {
            results.push(result);
            activeRequests--;
            requestCount++;
            
            // Progress update
            if (requestCount % 50 === 0) {
              const elapsed = (Date.now() - startTime) / 1000;
              const rps = requestCount / elapsed;
              process.stdout.write(`\r⏱️  Progress: ${requestCount} requests | ${elapsed.toFixed(1)}s elapsed | ${rps.toFixed(1)} req/s`);
            }
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    };
    
    // Run workers
    const workers = Array(concurrentUsers).fill(0).map(() => worker());
    await Promise.all(workers);
    
    // Wait for remaining requests
    while (activeRequests > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Analyze results
    const totalDuration = (Date.now() - startTime) / 1000;
    const successCount = results.filter(r => r.statusCode >= 200 && r.statusCode < 400).length;
    const errorCount = results.length - successCount;
    const cacheHits = results.filter(r => r.cacheSource === 'memory' || r.cacheSource === 'redis').length;
    
    // Calculate stats by category
    const categoryStats: Record<string, any> = {};
    results.forEach(result => {
      const cat = result.category || 'unknown';
      if (!categoryStats[cat]) {
        categoryStats[cat] = {
          count: 0,
          totalTime: 0,
          errors: 0,
          cacheHits: 0
        };
      }
      categoryStats[cat].count++;
      categoryStats[cat].totalTime += result.responseTime;
      if (result.error || result.statusCode >= 400) {
        categoryStats[cat].errors++;
      }
      if (result.cacheSource === 'memory' || result.cacheSource === 'redis') {
        categoryStats[cat].cacheHits++;
      }
    });
    
    // Calculate averages
    Object.keys(categoryStats).forEach(cat => {
      categoryStats[cat].avgResponseTime = categoryStats[cat].totalTime / categoryStats[cat].count;
    });
    
    // Print results
    console.log('\n\n');
    console.log('📊 Comprehensive Test Results');
    console.log('═'.repeat(60));
    console.log(`Total Requests:     ${results.length}`);
    console.log(`Successful:         ${successCount} (${((successCount/results.length)*100).toFixed(1)}%)`);
    console.log(`Failed:             ${errorCount} (${((errorCount/results.length)*100).toFixed(1)}%)`);
    console.log(`Duration:           ${totalDuration.toFixed(1)}s`);
    console.log(`Requests/Second:    ${(results.length / totalDuration).toFixed(1)}`);
    console.log(`URLs Tested:        ${urls.length}`);
    console.log(`Avg Requests/URL:   ${(results.length / urls.length).toFixed(1)}`);
    
    if (cacheHits > 0) {
      console.log(`\n🚀 Cache Performance:`);
      console.log(`Cache Hits:         ${cacheHits} (${((cacheHits/results.length)*100).toFixed(1)}% of all requests)`);
    }
    
    console.log('\n📂 Performance by Category:');
    console.log('─'.repeat(60));
    console.log('Category    Requests   Avg Time   Errors   Cache Hits');
    console.log('─'.repeat(60));
    Object.entries(categoryStats)
      .sort((a, b) => b[1].count - a[1].count)
      .forEach(([category, stats]) => {
        console.log(
          `${category.padEnd(12)}` +
          `${stats.count.toString().padEnd(11)}` +
          `${stats.avgResponseTime.toFixed(0).padEnd(11)}ms` +
          `${stats.errors.toString().padEnd(9)}` +
          `${stats.cacheHits}`
        );
      });
    
    // Find slowest URLs
    const urlResponseTimes: Record<string, { total: number, count: number }> = {};
    results.forEach(result => {
      if (!urlResponseTimes[result.url]) {
        urlResponseTimes[result.url] = { total: 0, count: 0 };
      }
      urlResponseTimes[result.url].total += result.responseTime;
      urlResponseTimes[result.url].count++;
    });
    
    const slowestUrls = Object.entries(urlResponseTimes)
      .map(([url, stats]) => ({ url, avgTime: stats.total / stats.count }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);
    
    console.log('\n🐌 Top 10 Slowest URLs:');
    console.log('─'.repeat(60));
    slowestUrls.forEach(({ url, avgTime }) => {
      console.log(`${url.padEnd(45)} ${avgTime.toFixed(0)}ms avg`);
    });
    
    // Overall verdict
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    const errorRate = (errorCount / results.length) * 100;
    
    console.log('\n🎯 Overall Performance:');
    console.log('─'.repeat(60));
    if (errorRate < 1 && avgResponseTime < 500) {
      console.log('✅ EXCELLENT - Fast response times with minimal errors');
    } else if (errorRate < 5 && avgResponseTime < 1000) {
      console.log('⚠️  GOOD - Acceptable performance but room for improvement');
    } else {
      console.log('❌ NEEDS IMPROVEMENT - High error rate or slow response times');
    }
    console.log(`Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`Error Rate: ${errorRate.toFixed(2)}%`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Parse arguments and run
const args = process.argv.slice(2);
const url = args[0] || 'http://localhost:3000';
const concurrentUsers = parseInt(args[1]) || 5;
const duration = parseInt(args[2]) || 60;

comprehensiveLoadTest(url, concurrentUsers, duration).catch(console.error);