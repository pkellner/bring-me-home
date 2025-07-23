#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import { writeFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient({
  log: ['query']
});

interface PerformanceMetric {
  timestamp: Date;
  url: string;
  responseTime: number;
  ttfb: number; // Time to first byte
  contentLength: number;
  cacheStatus: 'hit' | 'miss' | 'none';
  statusCode: number;
  dbQueries?: number;
  dbQueryTime?: number;
}

interface PerformanceReport {
  startTime: Date;
  endTime: Date;
  metrics: PerformanceMetric[];
  summary: {
    totalRequests: number;
    avgResponseTime: number;
    avgTTFB: number;
    cacheHitRate: number;
    avgDbQueries: number;
    avgDbQueryTime: number;
    slowestUrls: Array<{url: string, avgTime: number}>;
    mostDbIntensive: Array<{url: string, avgQueries: number}>;
  };
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private dbQueryCounts = new Map<string, number>();
  private dbQueryTimes = new Map<string, number>();
  private currentUrl: string = '';
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    // Hook into Prisma query events
    (prisma as any).$on('query', (e: any) => {
      if (this.currentUrl) {
        const current = this.dbQueryCounts.get(this.currentUrl) || 0;
        const currentTime = this.dbQueryTimes.get(this.currentUrl) || 0;
        this.dbQueryCounts.set(this.currentUrl, current + 1);
        this.dbQueryTimes.set(this.currentUrl, currentTime + e.duration);
      }
    });
  }

  private async measureRequest(url: string): Promise<PerformanceMetric> {
    this.currentUrl = url;
    this.dbQueryCounts.set(url, 0);
    this.dbQueryTimes.set(url, 0);

    const fullUrl = new URL(url, this.baseUrl);
    const protocol = fullUrl.protocol === 'https:' ? https : http;
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      let ttfb = 0;
      
      const options = {
        hostname: fullUrl.hostname,
        port: fullUrl.port || 80,
        path: fullUrl.pathname,
        method: 'GET',
        headers: {
          'User-Agent': 'Performance Monitor',
          'Accept': 'text/html,application/xhtml+xml',
        }
      };

      const req = protocol.request(options, (res) => {
        if (!ttfb) {
          ttfb = Date.now() - startTime;
        }

        let contentLength = 0;
        res.on('data', (chunk) => {
          contentLength += chunk.length;
        });

        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          
          // Determine cache status
          let cacheStatus: 'hit' | 'miss' | 'none' = 'none';
          const cacheControl = res.headers['cache-control'];
          const etag = res.headers['etag'];
          const xCache = res.headers['x-cache'];
          
          if (xCache?.includes('Hit')) {
            cacheStatus = 'hit';
          } else if (xCache?.includes('Miss')) {
            cacheStatus = 'miss';
          } else if (cacheControl || etag) {
            cacheStatus = 'miss'; // Has cache headers but first request
          }

          resolve({
            timestamp: new Date(),
            url,
            responseTime,
            ttfb,
            contentLength,
            cacheStatus,
            statusCode: res.statusCode || 0,
            dbQueries: this.dbQueryCounts.get(url) || 0,
            dbQueryTime: this.dbQueryTimes.get(url) || 0
          });
        });
      });

      req.on('error', (error) => {
        resolve({
          timestamp: new Date(),
          url,
          responseTime: Date.now() - startTime,
          ttfb: 0,
          contentLength: 0,
          cacheStatus: 'none',
          statusCode: 0,
          dbQueries: 0,
          dbQueryTime: 0
        });
      });

      req.setTimeout(30000);
      req.end();
    });
  }

  async monitorUrls(urls: string[], iterations: number = 3) {
    console.log(`🔍 Monitoring performance for ${urls.length} URLs (${iterations} iterations each)...`);
    
    console.log('\n📝 URLs to monitor:');
    console.log('─'.repeat(60));
    urls.forEach(url => {
      const isApi = url.includes('/api/');
      console.log(`  ${isApi ? '🚀' : '  '} ${url}`);
    });
    console.log('─'.repeat(60));
    console.log('Legend: 🚀 = API endpoint with cache tracking\n');
    
    for (let i = 0; i < iterations; i++) {
      console.log(`\n📊 Iteration ${i + 1}/${iterations}`);
      
      for (const url of urls) {
        process.stdout.write(`   Measuring ${url}...`);
        const metric = await this.measureRequest(url);
        this.metrics.push(metric);
        
        // Second request to test cache
        if (i === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
          const cachedMetric = await this.measureRequest(url);
          this.metrics.push(cachedMetric);
        }
        
        process.stdout.write(` ✓ (${metric.responseTime}ms)\n`);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  generateReport(): PerformanceReport {
    const startTime = this.metrics[0]?.timestamp || new Date();
    const endTime = this.metrics[this.metrics.length - 1]?.timestamp || new Date();
    
    // Calculate averages by URL
    const urlMetrics = new Map<string, {
      times: number[], 
      ttfbs: number[], 
      queries: number[], 
      queryTimes: number[],
      cacheHits: number,
      totalRequests: number
    }>();
    
    this.metrics.forEach(metric => {
      if (!urlMetrics.has(metric.url)) {
        urlMetrics.set(metric.url, {
          times: [],
          ttfbs: [],
          queries: [],
          queryTimes: [],
          cacheHits: 0,
          totalRequests: 0
        });
      }
      
      const data = urlMetrics.get(metric.url)!;
      data.times.push(metric.responseTime);
      data.ttfbs.push(metric.ttfb);
      data.queries.push(metric.dbQueries || 0);
      data.queryTimes.push(metric.dbQueryTime || 0);
      data.totalRequests++;
      if (metric.cacheStatus === 'hit') data.cacheHits++;
    });
    
    // Calculate summary statistics
    const allResponseTimes = this.metrics.map(m => m.responseTime);
    const allTTFBs = this.metrics.map(m => m.ttfb);
    const allDbQueries = this.metrics.map(m => m.dbQueries || 0);
    const allDbQueryTimes = this.metrics.map(m => m.dbQueryTime || 0);
    const cacheableRequests = this.metrics.filter(m => m.cacheStatus !== 'none');
    const cacheHits = cacheableRequests.filter(m => m.cacheStatus === 'hit');
    
    // Find slowest URLs
    const slowestUrls = Array.from(urlMetrics.entries())
      .map(([url, data]) => ({
        url,
        avgTime: data.times.reduce((a, b) => a + b, 0) / data.times.length
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);
    
    // Find most DB intensive URLs
    const mostDbIntensive = Array.from(urlMetrics.entries())
      .map(([url, data]) => ({
        url,
        avgQueries: data.queries.reduce((a, b) => a + b, 0) / data.queries.length
      }))
      .sort((a, b) => b.avgQueries - a.avgQueries)
      .slice(0, 10);
    
    return {
      startTime,
      endTime,
      metrics: this.metrics,
      summary: {
        totalRequests: this.metrics.length,
        avgResponseTime: allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length,
        avgTTFB: allTTFBs.reduce((a, b) => a + b, 0) / allTTFBs.length,
        cacheHitRate: cacheableRequests.length > 0 ? cacheHits.length / cacheableRequests.length : 0,
        avgDbQueries: allDbQueries.reduce((a, b) => a + b, 0) / allDbQueries.length,
        avgDbQueryTime: allDbQueryTimes.reduce((a, b) => a + b, 0) / allDbQueryTimes.length,
        slowestUrls,
        mostDbIntensive
      }
    };
  }

  printReport(report: PerformanceReport) {
    console.log('\n\n📈 Performance Monitoring Report');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Period: ${report.startTime.toLocaleString()} - ${report.endTime.toLocaleString()}`);
    console.log(`Total Requests: ${report.summary.totalRequests}`);
    console.log('');
    console.log('📊 Overall Performance:');
    console.log(`   Average Response Time: ${report.summary.avgResponseTime.toFixed(0)}ms`);
    console.log(`   Average TTFB: ${report.summary.avgTTFB.toFixed(0)}ms`);
    console.log(`   Cache Hit Rate: ${(report.summary.cacheHitRate * 100).toFixed(1)}%`);
    console.log('');
    console.log('🗄️  Database Performance:');
    console.log(`   Average Queries/Request: ${report.summary.avgDbQueries.toFixed(1)}`);
    console.log(`   Average Query Time: ${report.summary.avgDbQueryTime.toFixed(0)}ms`);
    
    if (report.summary.slowestUrls.length > 0) {
      console.log('\n🐌 Slowest URLs:');
      console.log('─────────────────────────────────────────────────────────');
      report.summary.slowestUrls.forEach(({url, avgTime}) => {
        console.log(`   ${url.padEnd(40)} ${avgTime.toFixed(0)}ms`);
      });
    }
    
    if (report.summary.mostDbIntensive.length > 0) {
      console.log('\n💾 Most Database-Intensive URLs:');
      console.log('─────────────────────────────────────────────────────────');
      report.summary.mostDbIntensive.forEach(({url, avgQueries}) => {
        console.log(`   ${url.padEnd(40)} ${avgQueries.toFixed(0)} queries`);
      });
    }

    // Performance recommendations
    console.log('\n💡 Recommendations:');
    console.log('─────────────────────────────────────────────────────────');
    
    if (report.summary.avgResponseTime > 2000) {
      console.log('⚠️  Average response time exceeds 2s - consider optimization');
    }
    
    if (report.summary.cacheHitRate < 0.5) {
      console.log('⚠️  Low cache hit rate - review cache configuration');
    }
    
    if (report.summary.avgDbQueries > 10) {
      console.log('⚠️  High database query count - consider query optimization');
    }
    
    if (report.summary.avgResponseTime < 1000 && report.summary.cacheHitRate > 0.7) {
      console.log('✅ Excellent performance! Response times and caching are optimal');
    }
  }

  saveReport(report: PerformanceReport, filename?: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = join(__dirname, 'reports', filename || `performance-${timestamp}.json`);
    
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Report saved to: ${reportPath}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const baseUrl = args[0] || 'http://localhost:3000';
  const iterations = parseInt(args[1]) || 2;
  
  console.log(`🌐 Monitoring performance for: ${baseUrl}`);
  
  const monitor = new PerformanceMonitor(baseUrl);
  
  try {
    // Get URLs to monitor
    const towns = await prisma.town.findMany({
      where: { isActive: true },
      select: { slug: true },
      take: 3
    });
    
    const urls = [
      '/',
      '/learn-more',
      '/show-your-support',
      ...towns.map(t => `/${t.slug}`),
      // Add API endpoints
      '/api/homepage-data',
      '/api/configs',
      ...towns.map(t => `/api/town-data/${t.slug}`),
    ];
    
    // Run monitoring
    await monitor.monitorUrls(urls, iterations);
    
    // Generate and display report
    const report = monitor.generateReport();
    monitor.printReport(report);
    monitor.saveReport(report);
    
  } catch (error) {
    console.error('❌ Error during monitoring:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { PerformanceMonitor };