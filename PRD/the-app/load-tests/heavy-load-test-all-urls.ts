#!/usr/bin/env tsx
/**
 * Heavy Load Test - Tests ALL URLs in the system
 * This is an aggressive test that hits every single URL with high concurrency
 * 
 * Usage:
 *   npx tsx load-tests/heavy-load-test-all-urls.ts [baseUrl] [concurrentRequests] [duration]
 *   
 * Examples:
 *   npx tsx load-tests/heavy-load-test-all-urls.ts
 *   npx tsx load-tests/heavy-load-test-all-urls.ts http://localhost:3000 100 300
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';

interface TestResult {
  url: string;
  statusCode: number;
  responseTime: number;
  error?: string;
  timestamp: Date;
  cacheSource?: string;
  cacheLatency?: number;
}

interface TestUrl {
  path: string;
  name: string;
  category: 'static' | 'auth' | 'api' | 'town' | 'person';
  priority: 'high' | 'medium' | 'low';
  cacheable: boolean;
}

class HeavyLoadTestAllUrls {
  private results: TestResult[] = [];
  private startTime: number = 0;
  private endTime: number = 0;
  private concurrentRequests: number;
  private duration: number;
  private baseUrl: string;
  private urls: TestUrl[] = [];
  private urlIndex: number = 0;

  constructor(baseUrl: string, concurrentRequests: number = 100, duration: number = 300) {
    this.baseUrl = baseUrl;
    this.concurrentRequests = concurrentRequests;
    this.duration = duration;
  }

  async loadUrls() {
    console.log('📋 Loading ALL URLs from server...');
    
    try {
      // Fetch ALL URLs including ALL persons
      const response = await fetch(`${this.baseUrl}/api/load-test-urls?allPersons=true`);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const data = await response.json();
      this.urls = data.urls;
      
      console.log(`✅ Loaded ${this.urls.length} URLs for testing`);
      
      // Show breakdown by category
      const categories = data.metadata.categories;
      console.log('\n📊 URL Breakdown:');
      console.log(`   Static Pages: ${categories.static}`);
      console.log(`   Auth Pages: ${categories.auth}`);
      console.log(`   API Endpoints: ${categories.api}`);
      console.log(`   Town Pages: ${categories.town}`);
      console.log(`   Person Pages: ${categories.person}`);
      console.log(`   Cacheable URLs: ${data.metadata.cacheableUrls}`);
      
    } catch (error) {
      console.error('❌ Failed to load URLs from API:', error);
      throw error;
    }
  }

  displayUrls() {
    console.log('\n📝 ALL URLs that will be tested:');
    console.log('═'.repeat(80));
    
    // Group by category
    const categories = {
      static: this.urls.filter(u => u.category === 'static'),
      auth: this.urls.filter(u => u.category === 'auth'),
      api: this.urls.filter(u => u.category === 'api'),
      town: this.urls.filter(u => u.category === 'town'),
      person: this.urls.filter(u => u.category === 'person')
    };
    
    Object.entries(categories).forEach(([category, urls]) => {
      if (urls.length > 0) {
        console.log(`\n${category.toUpperCase()} (${urls.length} URLs):`);
        urls.forEach(url => {
          const cacheIndicator = url.cacheable ? '🚀' : '  ';
          const priorityIndicator = url.priority === 'high' ? '⭐' : url.priority === 'medium' ? '◐' : '○';
          console.log(`  ${cacheIndicator} ${priorityIndicator} ${url.path} - ${url.name}`);
        });
      }
    });
    
    console.log('\n' + '═'.repeat(80));
    console.log(`TOTAL: ${this.urls.length} URLs`);
    console.log('═'.repeat(80));
  }

  private getNextUrl(): string {
    // Round-robin through all URLs
    const url = this.urls[this.urlIndex % this.urls.length];
    this.urlIndex++;
    return url.path;
  }

  private makeRequest(url: string): Promise<TestResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const fullUrl = new URL(url, this.baseUrl);
      const protocol = fullUrl.protocol === 'https:' ? https : http;

      const options = {
        hostname: fullUrl.hostname,
        port: fullUrl.port || (fullUrl.protocol === 'https:' ? 443 : 80),
        path: fullUrl.pathname + fullUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Heavy Load Test All URLs',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        }
      };

      const req = protocol.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          resolve({
            url,
            statusCode: res.statusCode || 0,
            responseTime,
            timestamp: new Date(),
            cacheSource: res.headers['x-cache-source'] as string,
            cacheLatency: res.headers['x-cache-latency'] ? parseInt(res.headers['x-cache-latency'] as string) : undefined
          });
        });
      });

      req.on('error', (error) => {
        const responseTime = Date.now() - startTime;
        resolve({
          url,
          statusCode: 0,
          responseTime,
          error: error.message,
          timestamp: new Date()
        });
      });

      req.setTimeout(30000, () => {
        req.destroy();
        resolve({
          url,
          statusCode: 0,
          responseTime: 30000,
          error: 'Request timeout',
          timestamp: new Date()
        });
      });

      req.end();
    });
  }

  async warmupCache() {
    console.log('\n🔥 Warming up cache (hitting each cacheable URL once)...');
    const cacheableUrls = this.urls.filter(u => u.cacheable);
    
    if (cacheableUrls.length === 0) {
      console.log('   No cacheable URLs found');
      return;
    }
    
    // Hit each cacheable URL once
    const warmupPromises = cacheableUrls.map(url => this.makeRequest(url.path));
    await Promise.all(warmupPromises);
    console.log(`✅ Cache warmup complete (${cacheableUrls.length} URLs warmed)`);
    
    // Clear warmup results
    this.results = [];
  }

  async runTest() {
    console.log(`\n🚀 Starting HEAVY load test...`);
    console.log(`⚡ Configuration:`);
    console.log(`   - Base URL: ${this.baseUrl}`);
    console.log(`   - Concurrent requests: ${this.concurrentRequests}`);
    console.log(`   - Duration: ${this.duration} seconds`);
    console.log(`   - Total URLs: ${this.urls.length}`);
    console.log(`   - Requests will cycle through ALL URLs`);
    console.log('\n⚠️  WARNING: This is a HEAVY load test!');
    console.log('   High resource usage expected on both client and server.');

    this.startTime = Date.now();
    const endTime = this.startTime + (this.duration * 1000);
    let requestCount = 0;
    let activeRequests = 0;

    const makeRequests = async () => {
      while (Date.now() < endTime) {
        if (activeRequests < this.concurrentRequests) {
          activeRequests++;
          requestCount++;
          
          // Get next URL in round-robin fashion
          const url = this.getNextUrl();
          
          this.makeRequest(url).then((result) => {
            this.results.push(result);
            activeRequests--;
            
            // Progress indicator every 1000 requests
            if (requestCount % 1000 === 0) {
              const elapsed = (Date.now() - this.startTime) / 1000;
              const rps = requestCount / elapsed;
              process.stdout.write(`\r⏱️  Elapsed: ${elapsed.toFixed(1)}s | Requests: ${requestCount} | RPS: ${rps.toFixed(1)} | Active: ${activeRequests}`);
            }
          });
        }
        
        // Small delay to prevent CPU spinning
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    };

    // Start concurrent request makers
    const workers = Array(Math.min(this.concurrentRequests, 50)).fill(0).map(() => makeRequests());
    await Promise.all(workers);

    // Wait for remaining requests to complete
    console.log('\n⏳ Waiting for remaining requests to complete...');
    while (activeRequests > 0) {
      process.stdout.write(`\r⏳ Active requests: ${activeRequests}  `);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.endTime = Date.now();
    console.log('\n✅ Heavy load test completed!\n');
  }

  printSummary() {
    const totalRequests = this.results.length;
    const successfulRequests = this.results.filter(r => r.statusCode >= 200 && r.statusCode < 400).length;
    const failedRequests = totalRequests - successfulRequests;
    
    const responseTimes = this.results.map(r => r.responseTime).sort((a, b) => a - b);
    const totalResponseTime = responseTimes.reduce((sum, time) => sum + time, 0);
    
    const duration = (this.endTime - this.startTime) / 1000;
    
    // Group results by URL
    const urlStats = new Map<string, { count: number; avgTime: number; errors: number }>();
    this.results.forEach(result => {
      const stats = urlStats.get(result.url) || { count: 0, avgTime: 0, errors: 0 };
      stats.count++;
      stats.avgTime = (stats.avgTime * (stats.count - 1) + result.responseTime) / stats.count;
      if (result.error || result.statusCode >= 400) stats.errors++;
      urlStats.set(result.url, stats);
    });
    
    // Cache stats
    let memoryHits = 0;
    let redisHits = 0;
    let databaseHits = 0;
    let cacheableRequests = 0;
    
    this.results.forEach(result => {
      if (result.cacheSource) {
        cacheableRequests++;
        if (result.cacheSource === 'memory') memoryHits++;
        else if (result.cacheSource === 'redis') redisHits++;
        else if (result.cacheSource === 'database') databaseHits++;
      }
    });
    
    console.log('📊 Heavy Load Test Summary');
    console.log('═'.repeat(60));
    console.log(`Total Requests:        ${totalRequests}`);
    console.log(`Successful:            ${successfulRequests} (${((successfulRequests / totalRequests) * 100).toFixed(2)}%)`);
    console.log(`Failed:                ${failedRequests} (${((failedRequests / totalRequests) * 100).toFixed(2)}%)`);
    console.log(`Requests/Second:       ${(totalRequests / duration).toFixed(2)}`);
    console.log(`Test Duration:         ${duration.toFixed(1)} seconds`);
    console.log('');
    console.log('Response Times (ms):');
    console.log(`  Average:             ${(totalResponseTime / totalRequests).toFixed(0)}`);
    console.log(`  Min:                 ${responseTimes[0] || 0}`);
    console.log(`  Max:                 ${responseTimes[responseTimes.length - 1] || 0}`);
    console.log(`  50th percentile:     ${responseTimes[Math.floor(responseTimes.length * 0.50)] || 0}`);
    console.log(`  95th percentile:     ${responseTimes[Math.floor(responseTimes.length * 0.95)] || 0}`);
    console.log(`  99th percentile:     ${responseTimes[Math.floor(responseTimes.length * 0.99)] || 0}`);
    
    if (cacheableRequests > 0) {
      console.log('');
      console.log('🚀 Cache Performance:');
      console.log(`  Total Cacheable:     ${cacheableRequests}`);
      console.log(`  Memory Hits:         ${memoryHits} (${((memoryHits / cacheableRequests) * 100).toFixed(1)}%)`);
      console.log(`  Redis Hits:          ${redisHits} (${((redisHits / cacheableRequests) * 100).toFixed(1)}%)`);
      console.log(`  Database Hits:       ${databaseHits} (${((databaseHits / cacheableRequests) * 100).toFixed(1)}%)`);
      console.log(`  Cache Hit Rate:      ${(((memoryHits + redisHits) / cacheableRequests) * 100).toFixed(1)}%`);
    }
    
    // Show top 10 slowest URLs
    const sortedUrls = Array.from(urlStats.entries())
      .sort((a, b) => b[1].avgTime - a[1].avgTime)
      .slice(0, 10);
    
    console.log('\n🐌 Top 10 Slowest URLs (avg response time):');
    sortedUrls.forEach(([url, stats], index) => {
      console.log(`  ${index + 1}. ${url}`);
      console.log(`     Avg: ${stats.avgTime.toFixed(0)}ms | Requests: ${stats.count} | Errors: ${stats.errors}`);
    });
    
    // Show URLs with most errors
    const errorUrls = Array.from(urlStats.entries())
      .filter(([_, stats]) => stats.errors > 0)
      .sort((a, b) => b[1].errors - a[1].errors)
      .slice(0, 5);
    
    if (errorUrls.length > 0) {
      console.log('\n❌ URLs with Most Errors:');
      errorUrls.forEach(([url, stats]) => {
        console.log(`  ${url}: ${stats.errors} errors (${((stats.errors / stats.count) * 100).toFixed(1)}%)`);
      });
    }
    
    console.log('\n📈 URL Coverage:');
    console.log(`  Total unique URLs tested: ${urlStats.size}`);
    console.log(`  Average requests per URL: ${(totalRequests / urlStats.size).toFixed(1)}`);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const baseUrl = args[0] || 'http://localhost:3000';
  const concurrentRequests = parseInt(args[1]) || 100;
  const duration = parseInt(args[2]) || 300;

  console.log('🏋️ Heavy Load Test - ALL URLs');
  console.log('  Tests every URL in the system with high concurrency');
  console.log('');
  
  const tester = new HeavyLoadTestAllUrls(baseUrl, concurrentRequests, duration);
  
  try {
    await tester.loadUrls();
    tester.displayUrls();
    
    // Confirm before running heavy test
    console.log('\n⚠️  This will generate significant load!');
    console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await tester.warmupCache();
    await tester.runTest();
    tester.printSummary();
  } catch (error) {
    console.error('❌ Error running heavy load test:', error);
  }
}

// Run the test
main().catch(console.error);