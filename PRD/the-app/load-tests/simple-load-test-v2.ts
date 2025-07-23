#!/usr/bin/env tsx
import https from 'https';
import http from 'http';
import { URL } from 'url';

interface TestUrl {
  path: string;
  name: string;
  category: 'static' | 'auth' | 'api' | 'town' | 'person';
  priority: 'high' | 'medium' | 'low';
  cacheable: boolean;
}

interface LoadTestConfig {
  urls: TestUrl[];
  metadata: {
    totalUrls: number;
    categories: Record<string, number>;
    cacheableUrls: number;
    generatedAt: string;
  };
  testScenarios: Record<string, any>;
}

interface TestResult {
  url: string;
  statusCode: number;
  responseTime: number;
  error?: string;
  timestamp: Date;
  cacheSource?: string;
  cacheLatency?: number;
  category?: string;
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
  categoryStats: Record<string, {
    count: number;
    avgResponseTime: number;
    errors: number;
  }>;
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

class SimpleLoadTesterV2 {
  private results: TestResult[] = [];
  private startTime: number = 0;
  private endTime: number = 0;
  private concurrentRequests: number;
  private duration: number;
  private baseUrl: string;
  private testUrls: TestUrl[] = [];

  constructor(baseUrl: string, concurrentRequests: number = 10, duration: number = 30) {
    this.baseUrl = baseUrl;
    this.concurrentRequests = concurrentRequests;
    this.duration = duration;
  }

  async fetchTestConfiguration(): Promise<void> {
    console.log('📋 Fetching test configuration from server...');
    
    try {
      const configUrl = `${this.baseUrl}/api/load-test-urls`;
      const config = await this.fetchJson<LoadTestConfig>(configUrl);
      
      this.testUrls = config.urls;
      
      console.log(`✅ Loaded ${config.metadata.totalUrls} URLs from server`);
      console.log(`   Categories: ${Object.entries(config.metadata.categories)
        .map(([cat, count]) => `${cat}(${count})`)
        .join(', ')}`);
      console.log(`   Cacheable URLs: ${config.metadata.cacheableUrls}`);
      
      // Display the URLs grouped by category
      console.log('\n📝 URLs to test:');
      console.log('─────────────────────────────────────────────────────────');
      
      const urlsByCategory = this.testUrls.reduce((acc, url) => {
        if (!acc[url.category]) acc[url.category] = [];
        acc[url.category].push(url);
        return acc;
      }, {} as Record<string, TestUrl[]>);
      
      Object.entries(urlsByCategory).forEach(([category, urls]) => {
        console.log(`\n${category.toUpperCase()}:`);
        urls.forEach(url => {
          const cacheIndicator = url.cacheable ? '🚀' : '  ';
          const priorityIndicator = url.priority === 'high' ? '⭐' : url.priority === 'medium' ? '◐' : '○';
          console.log(`  ${cacheIndicator} ${priorityIndicator} ${url.path}`);
        });
      });
      
      console.log('\n─────────────────────────────────────────────────────────');
      console.log('Legend: 🚀=cacheable ⭐=high priority ◐=medium ○=low');
      
    } catch (error) {
      console.error('❌ Failed to fetch test configuration:', error);
      throw error;
    }
  }

  private fetchJson<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname,
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Simple Load Tester v2'
        }
      };

      const req = protocol.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 100)}...`));
            return;
          }
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (error) {
            console.error('Response was not JSON:', data.substring(0, 200) + '...');
            reject(new Error(`Failed to parse JSON: ${error}`));
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(30000);
      req.end();
    });
  }

  private makeRequest(testUrl: TestUrl): Promise<TestResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const fullUrl = new URL(testUrl.path, this.baseUrl);
      const protocol = fullUrl.protocol === 'https:' ? https : http;

      const options = {
        hostname: fullUrl.hostname,
        port: fullUrl.port || (fullUrl.protocol === 'https:' ? 443 : 80),
        path: fullUrl.pathname + fullUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Simple Load Tester v2',
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
            url: testUrl.path,
            statusCode: res.statusCode || 0,
            responseTime,
            timestamp: new Date(),
            cacheSource: res.headers['x-cache-source'] as string,
            cacheLatency: res.headers['x-cache-latency'] ? parseInt(res.headers['x-cache-latency'] as string) : undefined,
            category: testUrl.category
          });
        });
      });

      req.on('error', (error) => {
        const responseTime = Date.now() - startTime;
        resolve({
          url: testUrl.path,
          statusCode: 0,
          responseTime,
          error: error.message,
          timestamp: new Date(),
          category: testUrl.category
        });
      });

      req.setTimeout(10000, () => {
        req.destroy();
        resolve({
          url: testUrl.path,
          statusCode: 0,
          responseTime: 10000,
          error: 'Request timeout',
          timestamp: new Date(),
          category: testUrl.category
        });
      });

      req.end();
    });
  }

  async warmupCache() {
    console.log('\n🔥 Warming up cache...');
    
    // Only warm up cacheable URLs
    const cacheableUrls = this.testUrls.filter(u => u.cacheable);
    
    if (cacheableUrls.length === 0) {
      console.log('   No cacheable URLs to warm up');
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
    console.log(`   - Total URLs: ${this.testUrls.length}`);

    this.startTime = Date.now();
    const endTime = this.startTime + (this.duration * 1000);
    let requestCount = 0;
    let activeRequests = 0;

    const makeRequests = async () => {
      while (Date.now() < endTime) {
        if (activeRequests < this.concurrentRequests) {
          activeRequests++;
          requestCount++;
          
          // Pick a random URL, weighted by priority
          const url = this.selectUrlByPriority();
          
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

  private selectUrlByPriority(): TestUrl {
    // Weight URLs by priority: high=50%, medium=35%, low=15%
    const random = Math.random();
    let priority: 'high' | 'medium' | 'low';
    
    if (random < 0.5) {
      priority = 'high';
    } else if (random < 0.85) {
      priority = 'medium';
    } else {
      priority = 'low';
    }
    
    const urls = this.testUrls.filter(u => u.priority === priority);
    
    // Fallback if no URLs with that priority
    if (urls.length === 0) {
      return this.testUrls[Math.floor(Math.random() * this.testUrls.length)];
    }
    
    return urls[Math.floor(Math.random() * urls.length)];
  }

  generateSummary(): TestSummary {
    const totalRequests = this.results.length;
    const successfulRequests = this.results.filter(r => r.statusCode >= 200 && r.statusCode < 400).length;
    const failedRequests = totalRequests - successfulRequests;
    
    const responseTimes = this.results.map(r => r.responseTime).sort((a, b) => a - b);
    const totalResponseTime = responseTimes.reduce((sum, time) => sum + time, 0);
    
    const duration = (this.endTime - this.startTime) / 1000;
    
    // Calculate URL-specific and category stats
    const urlStats = new Map<string, any>();
    const categoryStats: Record<string, any> = {};
    let totalCacheable = 0;
    let memoryHits = 0;
    let redisHits = 0;
    let databaseHits = 0;
    let totalCacheLatency = 0;
    let cacheLatencyCount = 0;

    this.results.forEach(result => {
      // URL stats
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

      // Category stats
      if (result.category) {
        if (!categoryStats[result.category]) {
          categoryStats[result.category] = {
            count: 0,
            totalTime: 0,
            errors: 0
          };
        }
        categoryStats[result.category].count++;
        categoryStats[result.category].totalTime += result.responseTime;
        if (result.error || result.statusCode >= 400) {
          categoryStats[result.category].errors++;
        }
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

    // Calculate average response times for categories
    Object.keys(categoryStats).forEach(cat => {
      categoryStats[cat].avgResponseTime = 
        categoryStats[cat].totalTime / categoryStats[cat].count;
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
      categoryStats,
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
    
    // Category performance
    console.log('\n📂 Performance by Category:');
    console.log('─────────────────────────────────────────────────────────');
    Object.entries(summary.categoryStats)
      .sort((a, b) => a[1].avgResponseTime - b[1].avgResponseTime)
      .forEach(([category, stats]) => {
        console.log(`${category.padEnd(10)} ${stats.avgResponseTime.toFixed(0)}ms avg (${stats.count} requests, ${stats.errors} errors)`);
      });
    
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

  const tester = new SimpleLoadTesterV2(baseUrl, concurrentRequests, duration);
  
  try {
    await tester.fetchTestConfiguration();
    await tester.warmupCache();
    await tester.runTest();
    tester.printSummary();
  } catch (error) {
    console.error('❌ Error running load test:', error);
  }
}

// Run the test
main().catch(console.error);