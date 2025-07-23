#!/usr/bin/env tsx
/**
 * Simple Load Test with Fallback URLs
 * Works even if /api/load-test-urls endpoint is not available
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

// Default URLs that should exist on any Bring Me Home instance
const DEFAULT_URLS = [
  // Static pages
  '/',
  '/learn-more',
  '/show-your-support',
  '/code-of-conduct',
  '/privacy-policy',
  '/configs',
  
  // Auth pages
  '/auth/signin',
  '/auth/register',
  '/auth/forgot-password',
  
  // API endpoints (cacheable)
  '/api/homepage-data',
  '/api/configs',
  
  // Common town slugs (may vary by instance)
  '/borrego-springs',
  '/borrego_springs', // Try both formats
  '/mendocino',
  '/pismo-beach',
  '/lake-elsinore'
];

class SimpleLoadTesterFallback {
  private results: TestResult[] = [];
  private startTime: number = 0;
  private endTime: number = 0;
  private concurrentRequests: number;
  private duration: number;
  private baseUrl: string;
  public urls: string[] = [];

  constructor(baseUrl: string, concurrentRequests: number = 10, duration: number = 30) {
    this.baseUrl = baseUrl;
    this.concurrentRequests = concurrentRequests;
    this.duration = duration;
  }

  async loadUrls() {
    console.log('📋 Loading test URLs...');
    
    try {
      // Try to fetch from API endpoint
      console.log(`   Attempting to fetch from ${this.baseUrl}/api/load-test-urls...`);
      const response = await fetch(`${this.baseUrl}/api/load-test-urls`);
      
      if (response.ok) {
        const data = await response.json();
        this.urls = data.urls.map((u: any) => u.path);
        console.log(`✅ Loaded ${this.urls.length} URLs from server API`);
      } else {
        throw new Error(`API returned ${response.status}`);
      }
    } catch (error) {
      console.log(`   ⚠️  Could not fetch from API: ${error}`);
      console.log('   Using default URL list...');
      
      // Test which URLs actually exist
      console.log('   Testing URL availability...');
      const availableUrls: string[] = [];
      
      for (const url of DEFAULT_URLS) {
        const exists = await this.checkUrlExists(url);
        if (exists) {
          availableUrls.push(url);
        }
      }
      
      this.urls = availableUrls;
      console.log(`✅ Found ${this.urls.length} available URLs`);
    }
    
    // Display the URLs
    console.log('\n📝 URLs to test:');
    console.log('─────────────────────────────────────────────────────────');
    this.urls.forEach(url => {
      const isApi = url.includes('/api/');
      console.log(`  ${isApi ? '🚀' : '  '} ${url}`);
    });
    console.log('─────────────────────────────────────────────────────────');
  }

  private async checkUrlExists(path: string): Promise<boolean> {
    return new Promise((resolve) => {
      const url = new URL(path, this.baseUrl);
      const protocol = url.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'HEAD',
        timeout: 5000
      };
      
      const req = protocol.request(options, (res) => {
        resolve(res.statusCode !== undefined && res.statusCode < 500);
      });
      
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      
      req.end();
    });
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
          'User-Agent': 'Simple Load Tester Fallback',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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

      req.setTimeout(10000, () => {
        req.destroy();
        resolve({
          url,
          statusCode: 0,
          responseTime: 10000,
          error: 'Request timeout',
          timestamp: new Date()
        });
      });

      req.end();
    });
  }

  async warmupCache() {
    console.log('\n🔥 Warming up cache...');
    const cacheableUrls = this.urls.filter(u => u.includes('/api/'));
    
    if (cacheableUrls.length === 0) {
      console.log('   No cacheable URLs found');
      return;
    }
    
    const warmupPromises = cacheableUrls.map(url => this.makeRequest(url));
    await Promise.all(warmupPromises);
    console.log(`✅ Cache warmup complete (${cacheableUrls.length} URLs)`);
    
    // Clear warmup results
    this.results = [];
  }

  async runTest() {
    console.log(`\n🚀 Starting load test...`);
    console.log(`📊 Configuration:`);
    console.log(`   - Base URL: ${this.baseUrl}`);
    console.log(`   - Concurrent requests: ${this.concurrentRequests}`);
    console.log(`   - Duration: ${this.duration} seconds`);
    console.log(`   - Total URLs: ${this.urls.length}`);

    this.startTime = Date.now();
    const endTime = this.startTime + (this.duration * 1000);
    let requestCount = 0;
    let activeRequests = 0;

    const makeRequests = async () => {
      while (Date.now() < endTime) {
        if (activeRequests < this.concurrentRequests) {
          activeRequests++;
          requestCount++;
          
          // Pick a random URL
          const url = this.urls[Math.floor(Math.random() * this.urls.length)];
          
          this.makeRequest(url).then((result) => {
            this.results.push(result);
            activeRequests--;
            
            // Progress indicator
            if (requestCount % 100 === 0) {
              const elapsed = (Date.now() - this.startTime) / 1000;
              const rps = requestCount / elapsed;
              process.stdout.write(`\r⏱️  Elapsed: ${elapsed.toFixed(1)}s | Requests: ${requestCount} | RPS: ${rps.toFixed(1)}`);
            }
          });
        }
        
        // Small delay to prevent CPU spinning
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    };

    // Start concurrent request makers
    const workers = Array(this.concurrentRequests).fill(0).map(() => makeRequests());
    await Promise.all(workers);

    // Wait for remaining requests to complete
    while (activeRequests > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.endTime = Date.now();
    console.log('\n✅ Load test completed!\n');
  }

  printSummary() {
    const totalRequests = this.results.length;
    const successfulRequests = this.results.filter(r => r.statusCode >= 200 && r.statusCode < 400).length;
    const failedRequests = totalRequests - successfulRequests;
    
    const responseTimes = this.results.map(r => r.responseTime).sort((a, b) => a - b);
    const totalResponseTime = responseTimes.reduce((sum, time) => sum + time, 0);
    
    const duration = (this.endTime - this.startTime) / 1000;
    
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
    
    console.log('📊 Test Summary');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total Requests:        ${totalRequests}`);
    console.log(`Successful:            ${successfulRequests} (${((successfulRequests / totalRequests) * 100).toFixed(2)}%)`);
    console.log(`Failed:                ${failedRequests} (${((failedRequests / totalRequests) * 100).toFixed(2)}%)`);
    console.log(`Requests/Second:       ${(totalRequests / duration).toFixed(2)}`);
    console.log('');
    console.log('Response Times (ms):');
    console.log(`  Average:             ${(totalResponseTime / totalRequests).toFixed(0)}`);
    console.log(`  Min:                 ${responseTimes[0] || 0}`);
    console.log(`  Max:                 ${responseTimes[responseTimes.length - 1] || 0}`);
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
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const baseUrl = args[0] || 'http://localhost:3000';
  const concurrentRequests = parseInt(args[1]) || 10;
  const duration = parseInt(args[2]) || 30;

  console.log('🔧 Simple Load Test with Fallback');
  console.log('  Works even without /api/load-test-urls endpoint');
  console.log('');
  
  const tester = new SimpleLoadTesterFallback(baseUrl, concurrentRequests, duration);
  
  try {
    await tester.loadUrls();
    
    if (tester.urls.length === 0) {
      console.error('❌ No accessible URLs found. Is the server running?');
      return;
    }
    
    await tester.warmupCache();
    await tester.runTest();
    tester.printSummary();
  } catch (error) {
    console.error('❌ Error running load test:', error);
  }
}

// Run the test
main().catch(console.error);