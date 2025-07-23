#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

interface TestResult {
  url: string;
  statusCode: number;
  responseTime: number;
  error?: string;
  timestamp: Date;
  cacheSource?: string;
  cacheLatency?: number;
}

interface TestSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  cacheStats: {
    totalCacheable: number;
    memoryHits: number;
    redisHits: number;
    databaseHits: number;
    avgCacheLatency: number;
  };
  urlStats: Map<string, {
    count: number;
    totalTime: number;
    errors: number;
    minTime: number;
    maxTime: number;
    cacheHits: number;
    cacheSources: { memory: number; redis: number; database: number };
  }>;
}

class SimpleLoadTester {
  private results: TestResult[] = [];
  private startTime: number = 0;
  private endTime: number = 0;
  private concurrentRequests: number;
  private duration: number;
  private baseUrl: string;
  private urls: string[] = [];

  constructor(baseUrl: string, concurrentRequests: number = 10, duration: number = 30) {
    this.baseUrl = baseUrl;
    this.concurrentRequests = concurrentRequests;
    this.duration = duration;
  }

  async loadUrls() {
    console.log('📋 Loading test URLs...');
    
    try {
      // Try to fetch URLs from the server's API endpoint
      console.log(`   Fetching from ${this.baseUrl}/api/load-test-urls...`);
      const response = await fetch(`${this.baseUrl}/api/load-test-urls`);
      
      if (response.ok) {
        const data = await response.json();
        this.urls = data.urls.map((u: any) => u.path);
        
        console.log(`✅ Loaded ${this.urls.length} URLs from server API`);
        console.log(`   Categories: ${Object.entries(data.metadata.categories)
          .map(([cat, count]) => `${cat}(${count})`)
          .join(', ')}`);
        
        // Display the URLs
        console.log('\n📝 URLs to test:');
        console.log('─────────────────────────────────────────────────────────');
        
        // Group URLs by category
        const urlsByCategory: Record<string, string[]> = {};
        data.urls.forEach((u: any) => {
          if (!urlsByCategory[u.category]) urlsByCategory[u.category] = [];
          urlsByCategory[u.category].push(u.path);
        });
        
        Object.entries(urlsByCategory).forEach(([category, urls]) => {
          console.log(`\n${category.toUpperCase()}:`);
          urls.slice(0, 5).forEach(url => {
            console.log(`   ${category === 'api' ? '🚀 ' : ''}${url}`);
          });
          if (urls.length > 5) {
            console.log(`   ... and ${urls.length - 5} more`);
          }
        });
        
        console.log('─────────────────────────────────────────────────────────');
        return;
      }
    } catch (error) {
      console.log('   Could not fetch from API endpoint, falling back to local database...');
    }
    
    // Fallback to local database (original code)
    const config = JSON.parse(readFileSync(join(__dirname, 'config.json'), 'utf-8'));
    const staticUrls = [
      ...config.publicPages.static.map((p: any) => p.path),
      ...config.publicPages.auth.map((p: any) => p.path)
    ];

    const apiUrls = [
      '/api/homepage-data',
      '/api/configs'
    ];

    // Load dynamic URLs from database
    const towns = await prisma.town.findMany({
      where: { isActive: true },
      select: {
        slug: true,
        persons: {
          where: { isActive: true },
          select: { slug: true },
          take: 3
        }
      }
    });

    const dynamicUrls: string[] = [];
    towns.forEach(town => {
      dynamicUrls.push(`/${town.slug}`);
      apiUrls.push(`/api/town-data/${town.slug}`);
      
      town.persons.forEach(person => {
        dynamicUrls.push(`/${town.slug}/${person.slug}`);
        apiUrls.push(`/api/person-data/${town.slug}/${person.slug}`);
      });
    });

    this.urls = [...staticUrls, ...dynamicUrls, ...apiUrls];
    console.log(`✅ Loaded ${this.urls.length} URLs from local database`);
    
    console.log('\n📝 URLs to test:');
    console.log('─────────────────────────────────────────────────────────');
    
    console.log('\nSTATIC PAGES:');
    staticUrls.forEach(url => console.log(`   ${url}`));
    
    console.log('\nDYNAMIC PAGES:');
    dynamicUrls.forEach(url => console.log(`   ${url}`));
    
    console.log('\nAPI ENDPOINTS (cacheable):');
    apiUrls.forEach(url => console.log(`   🚀 ${url}`));
    
    console.log('─────────────────────────────────────────────────────────');
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
          'User-Agent': 'Simple Load Tester',
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
    const warmupPromises = this.urls.map(url => this.makeRequest(url));
    await Promise.all(warmupPromises);
    console.log('✅ Cache warmup complete');
    
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

  generateSummary(): TestSummary {
    const totalRequests = this.results.length;
    const successfulRequests = this.results.filter(r => r.statusCode >= 200 && r.statusCode < 400).length;
    const failedRequests = totalRequests - successfulRequests;
    
    const responseTimes = this.results.map(r => r.responseTime).sort((a, b) => a - b);
    const totalResponseTime = responseTimes.reduce((sum, time) => sum + time, 0);
    
    const duration = (this.endTime - this.startTime) / 1000;
    
    // Calculate URL-specific stats
    const urlStats = new Map<string, any>();
    let totalCacheable = 0;
    let memoryHits = 0;
    let redisHits = 0;
    let databaseHits = 0;
    let totalCacheLatency = 0;
    let cacheLatencyCount = 0;

    this.results.forEach(result => {
      if (!urlStats.has(result.url)) {
        urlStats.set(result.url, {
          count: 0,
          totalTime: 0,
          errors: 0,
          minTime: Infinity,
          maxTime: 0,
          cacheHits: 0,
          cacheSources: { memory: 0, redis: 0, database: 0 }
        });
      }
      
      const stats = urlStats.get(result.url)!;
      stats.count++;
      stats.totalTime += result.responseTime;
      stats.minTime = Math.min(stats.minTime, result.responseTime);
      stats.maxTime = Math.max(stats.maxTime, result.responseTime);
      if (result.error || result.statusCode >= 400) {
        stats.errors++;
      }

      // Track cache statistics
      if (result.cacheSource) {
        totalCacheable++;
        if (result.cacheSource === 'memory') {
          memoryHits++;
          stats.cacheHits++;
          stats.cacheSources.memory++;
        } else if (result.cacheSource === 'redis') {
          redisHits++;
          stats.cacheHits++;
          stats.cacheSources.redis++;
        } else if (result.cacheSource === 'database') {
          databaseHits++;
          stats.cacheSources.database++;
        }
        
        if (result.cacheLatency !== undefined) {
          totalCacheLatency += result.cacheLatency;
          cacheLatencyCount++;
        }
      }
    });

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
      minResponseTime: responseTimes[0] || 0,
      maxResponseTime: responseTimes[responseTimes.length - 1] || 0,
      p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)] || 0,
      p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)] || 0,
      requestsPerSecond: totalRequests / duration,
      errorRate: totalRequests > 0 ? failedRequests / totalRequests : 0,
      cacheStats: {
        totalCacheable,
        memoryHits,
        redisHits,
        databaseHits,
        avgCacheLatency: cacheLatencyCount > 0 ? totalCacheLatency / cacheLatencyCount : 0
      },
      urlStats
    };
  }

  printSummary() {
    const summary = this.generateSummary();
    
    console.log('📊 Test Summary');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total Requests:        ${summary.totalRequests}`);
    console.log(`Successful:            ${summary.successfulRequests} (${((summary.successfulRequests / summary.totalRequests) * 100).toFixed(2)}%)`);
    console.log(`Failed:                ${summary.failedRequests} (${(summary.errorRate * 100).toFixed(2)}%)`);
    console.log(`Requests/Second:       ${summary.requestsPerSecond.toFixed(2)}`);
    console.log('');
    console.log('Response Times (ms):');
    console.log(`  Average:             ${summary.averageResponseTime.toFixed(0)}`);
    console.log(`  Min:                 ${summary.minResponseTime}`);
    console.log(`  Max:                 ${summary.maxResponseTime}`);
    console.log(`  95th percentile:     ${summary.p95ResponseTime}`);
    console.log(`  99th percentile:     ${summary.p99ResponseTime}`);
    
    if (summary.cacheStats.totalCacheable > 0) {
      console.log('');
      console.log('🚀 Cache Performance:');
      console.log(`  Total Cacheable:     ${summary.cacheStats.totalCacheable}`);
      console.log(`  Memory Hits:         ${summary.cacheStats.memoryHits} (${((summary.cacheStats.memoryHits / summary.cacheStats.totalCacheable) * 100).toFixed(1)}%)`);
      console.log(`  Redis Hits:          ${summary.cacheStats.redisHits} (${((summary.cacheStats.redisHits / summary.cacheStats.totalCacheable) * 100).toFixed(1)}%)`);
      console.log(`  Database Hits:       ${summary.cacheStats.databaseHits} (${((summary.cacheStats.databaseHits / summary.cacheStats.totalCacheable) * 100).toFixed(1)}%)`);
      console.log(`  Cache Hit Rate:      ${(((summary.cacheStats.memoryHits + summary.cacheStats.redisHits) / summary.cacheStats.totalCacheable) * 100).toFixed(1)}%`);
      console.log(`  Avg Cache Latency:   ${summary.cacheStats.avgCacheLatency.toFixed(0)}ms`);
    }
    
    // Show top 10 slowest URLs
    console.log('\n🐌 Top 10 Slowest URLs:');
    console.log('─────────────────────────────────────────────────────────');
    const sortedUrls = Array.from(summary.urlStats.entries())
      .sort((a, b) => (b[1].totalTime / b[1].count) - (a[1].totalTime / a[1].count))
      .slice(0, 10);
    
    sortedUrls.forEach(([url, stats]) => {
      const avgTime = stats.totalTime / stats.count;
      const cacheInfo = stats.cacheSources ? 
        ` [M:${stats.cacheSources.memory} R:${stats.cacheSources.redis} D:${stats.cacheSources.database}]` : '';
      console.log(`${url.padEnd(40)} ${avgTime.toFixed(0)}ms avg (${stats.count} requests)${cacheInfo}`);
    });

    // Show URLs with errors
    const urlsWithErrors = Array.from(summary.urlStats.entries())
      .filter(([_, stats]) => stats.errors > 0)
      .sort((a, b) => b[1].errors - a[1].errors);
    
    if (urlsWithErrors.length > 0) {
      console.log('\n❌ URLs with Errors:');
      console.log('─────────────────────────────────────────────────────────');
      urlsWithErrors.forEach(([url, stats]) => {
        const errorRate = (stats.errors / stats.count * 100).toFixed(1);
        console.log(`${url.padEnd(40)} ${stats.errors} errors (${errorRate}%)`);
      });
    }

    // Performance verdict
    console.log('\n🎯 Performance Assessment:');
    console.log('─────────────────────────────────────────────────────────');
    if (summary.p95ResponseTime < 2000 && summary.errorRate < 0.01) {
      console.log('✅ EXCELLENT: 95% of requests under 2s with <1% error rate');
    } else if (summary.p95ResponseTime < 5000 && summary.errorRate < 0.05) {
      console.log('⚠️  GOOD: 95% of requests under 5s with <5% error rate');
    } else {
      console.log('❌ NEEDS IMPROVEMENT: Response times or error rates exceed thresholds');
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const baseUrl = args[0] || 'http://localhost:3000';
  const concurrentRequests = parseInt(args[1]) || 10;
  const duration = parseInt(args[2]) || 30;

  const tester = new SimpleLoadTester(baseUrl, concurrentRequests, duration);
  
  try {
    await tester.loadUrls();
    await tester.warmupCache();
    await tester.runTest();
    tester.printSummary();
  } catch (error) {
    console.error('❌ Error running load test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
main().catch(console.error);