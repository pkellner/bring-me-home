# Load Testing Suite for Bring Me Home

This directory contains a comprehensive load testing suite for the Bring Me Home public-facing website. The tests focus exclusively on public URLs (no authentication required) to simulate real-world user traffic patterns.

## 🆕 Server-Driven Load Testing (Recommended)

The application now exposes a `/api/load-test-urls` endpoint that provides all testable URLs dynamically. This means load tests can run against any server without needing database access or hardcoded URLs.

**⚠️ Note**: The `/api/load-test-urls` endpoint needs to be deployed to your server. If it's not available yet, use the fallback tester or update your server code.

## 📋 Overview

The load testing suite includes multiple tools and approaches:

1. **Quick Test (NEW)** - Minimal server-driven test that fetches URLs from the API
2. **Simple Load Tester v2 (NEW)** - Enhanced version using server configuration
3. **Comprehensive Test (NEW)** - Tests ALL towns and persons from the API
4. **Fallback Tester (NEW)** - Works without API endpoint, tests common URLs
5. **Simple Load Tester** - Original version (now tries API first, falls back to local DB)
6. **Artillery** - Professional load testing (uses hardcoded town names)
7. **K6** - Modern load testing tool (uses hardcoded town names)
8. **Performance Monitor** - Detailed performance analysis

## 🚀 Quick Start

### Prerequisites
- Node.js and npm installed
- Application running locally on http://localhost:3000
- Database populated with test data (run `npm run db:seed`)

### Running Your First Test

#### Recommended: Server-Driven Tests (No Database Required)

```bash
# Quick test - simplest option
npx tsx load-tests/quick-test.ts https://cache2.bring-me-home.com 30

# Enhanced load test with detailed stats
npx tsx load-tests/simple-load-test-v2.ts https://cache2.bring-me-home.com 20 60

# Or use npm scripts
npm run load-test:quick
npm run load-test:v2
```

#### Original Tests (Requires Database Access)

```bash
# Simple load test 
npx tsx load-tests/simple-load-test.ts

# With custom parameters
npx tsx load-tests/simple-load-test.ts http://localhost:3000 20 60
# (URL, concurrent requests, duration in seconds)
```

## 🛠️ Available Tools

### 1. Quick Test (`quick-test.ts`) - NEW!

The simplest way to test any Bring Me Home server without configuration.

```bash
# Test any server - it fetches URLs automatically
npx tsx load-tests/quick-test.ts https://cache2.bring-me-home.com 30
```

**Features:**
- Zero configuration required
- Fetches test URLs from `/api/load-test-urls`
- Minimal output, quick results
- 10 concurrent workers
- Shows cache hit statistics

### 2. Comprehensive Test (`comprehensive-test.ts`) - NEW!

Tests ALL towns and ALL persons in the system.

```bash
# Test every single URL in the system
npx tsx load-tests/comprehensive-test.ts https://cache2.bring-me-home.com 5 60

# Or use npm script
npm run load-test:comprehensive -- https://cache2.bring-me-home.com
```

**Features:**
- Tests ALL towns and ALL persons (not just a sample)
- Shows complete list of URLs before testing
- Round-robin through all URLs for even coverage
- Detailed category-based analysis
- Warning before testing large numbers of URLs

### 3. Fallback Tester (`simple-load-test-fallback.ts`) - NEW!

Works even when the `/api/load-test-urls` endpoint is not available.

```bash
# Test any server without the API endpoint
npx tsx load-tests/simple-load-test-fallback.ts https://cache2.bring-me-home.com

# Or use npm script
npm run load-test:fallback -- https://cache2.bring-me-home.com
```

**Features:**
- Tests URL availability before running
- Uses predefined list of common URLs
- Falls back gracefully when API isn't available
- Perfect for testing servers without the new endpoint

### 4. Simple Load Tester v2 (`simple-load-test-v2.ts`) - NEW!

Enhanced version that uses server-provided configuration.

```bash
# Automatically discovers all URLs from the server
npx tsx load-tests/simple-load-test-v2.ts https://cache2.bring-me-home.com 20 60
```

**Features:**
- Fetches URLs from `/api/load-test-urls` endpoint
- No database access required
- Priority-based URL selection
- Category-based performance analysis
- Detailed cache statistics
- Works with any server that exposes the endpoint

### 3. Simple Load Tester (`simple-load-test.ts`)

The easiest way to get started. No external dependencies required.

```bash
# Default: 10 concurrent requests for 30 seconds
npx tsx load-tests/simple-load-test.ts

# Custom: 50 concurrent requests for 2 minutes
npx tsx load-tests/simple-load-test.ts http://localhost:3000 50 120
```

**Features:**
- Real-time progress updates
- Automatic URL discovery from database
- Detailed performance summary
- Error tracking by URL

### 2. Artillery Load Testing

Professional-grade load testing with HTML reports.

```bash
# Install Artillery (first time only)
npm install -D artillery

# Run with different scenarios
npx tsx load-tests/run-load-tests.ts light    # 5 users/sec for 30s
npx tsx load-tests/run-load-tests.ts medium   # 20 users/sec for 60s
npx tsx load-tests/run-load-tests.ts heavy    # 50 users/sec for 120s
npx tsx load-tests/run-load-tests.ts stress   # Ramp to 200 users/sec

# Or use the static configuration
npx artillery run load-tests/artillery-config.yml
```

**Features:**
- Dynamic URL discovery
- User journey simulation
- HTML reports with graphs
- Performance expectations

### 3. K6 Load Testing

Modern load testing with cloud-ready capabilities.

```bash
# Install K6 (via Homebrew on macOS)
brew install k6

# Run the test
k6 run load-tests/k6-load-test.js

# With custom scenarios
k6 run --vus 50 --duration 2m load-tests/k6-load-test.js

# Run specific scenario
k6 run load-tests/k6-load-test.js --env SCENARIO=spike_test
```

**Features:**
- Multiple test scenarios (constant, ramping, spike)
- Custom metrics (per-page performance)
- Threshold validation
- Real user behavior simulation

### 4. Performance Monitor (`monitor-performance.ts`)

Detailed performance analysis including database metrics.

```bash
# Monitor key pages with database query tracking
npx tsx load-tests/monitor-performance.ts
```

**Features:**
- Time to First Byte (TTFB) measurement
- Cache hit rate analysis
- Database query counting and timing
- Performance recommendations
- JSON report export

## 📊 Understanding Test Results

### Key Metrics

1. **Response Time**
   - **Excellent**: < 1s average, < 2s for 95th percentile
   - **Good**: < 2s average, < 5s for 95th percentile
   - **Needs Improvement**: > 2s average or > 5s for 95th percentile

2. **Error Rate**
   - **Excellent**: < 0.1%
   - **Acceptable**: < 1%
   - **Problematic**: > 1%

3. **Throughput**
   - Measured in requests per second (RPS)
   - Should scale linearly with concurrent users

4. **Cache Performance**
   - Cache hit rate should be > 70% for API endpoints
   - Memory hits are fastest (~1-5ms latency)
   - Redis hits are fast (~5-20ms latency)
   - Database hits are slowest (no cache benefit)
   - Note: Page routes (/, /town) don't show cache stats, only API routes do

### Reading Artillery Reports

Artillery generates HTML reports in `load-tests/reports/`:
- **Response Times**: Look for p95 and p99 values
- **Error Rate**: Should stay below 1%
- **RPS**: Requests per second achieved
- **Latency Distribution**: Visual histogram

### K6 Output

K6 provides real-time metrics:
- **http_req_duration**: Response time metrics
- **http_req_failed**: Error rate
- **Custom metrics**: Homepage, town page, person page specific times

## 🎯 Test Scenarios

### User Behavior Profiles

1. **Casual Browser (40%)**
   - Visits homepage
   - Browses 1-2 town pages
   - May visit learn more page

2. **Family Member (30%)**
   - Direct navigation to specific town
   - Views specific person profile
   - Visits support pages

3. **Researcher (20%)**
   - Browses multiple towns
   - Views multiple person profiles
   - Checks configuration page

4. **Support User (10%)**
   - Focuses on informational pages
   - Reads policies and guidelines

### URLs Tested

**Static Pages:**
- `/` - Homepage
- `/learn-more` - Family guide
- `/show-your-support` - Support information
- `/code-of-conduct` - Community guidelines
- `/privacy-policy` - Privacy information
- `/configs` - System configuration

**Dynamic Pages (from database):**
- `/{townSlug}` - Town listing pages
- `/{townSlug}/{personSlug}` - Individual person pages

**Cached API Endpoints:**
- `/api/homepage-data` - Homepage data with caching
- `/api/town-data/{townSlug}` - Town-specific data
- `/api/person-data/{townSlug}/{personSlug}` - Person details
- `/api/configs` - System configuration

These API endpoints use server-side caching (memory → Redis → database) and return cache metadata in headers:
- `X-Cache-Source`: Indicates where data came from (memory/redis/database)
- `X-Cache-Latency`: Time taken to retrieve data in milliseconds

## 🔧 Configuration

Edit `load-tests/config.json` to customize:
- Test scenarios and durations
- Performance thresholds
- User behavior patterns
- Cache testing options

## 📡 The Load Test API Endpoint

The application exposes `/api/load-test-urls` which returns:

```json
{
  "urls": [
    {
      "path": "/",
      "name": "Homepage",
      "category": "static",
      "priority": "high",
      "cacheable": false
    },
    {
      "path": "/api/homepage-data",
      "name": "Homepage Data API",
      "category": "api",
      "priority": "high",
      "cacheable": true
    }
    // ... more URLs
  ],
  "metadata": {
    "totalUrls": 25,
    "categories": {
      "static": 6,
      "auth": 3,
      "api": 8,
      "town": 4,
      "person": 4
    },
    "cacheableUrls": 8,
    "generatedAt": "2024-01-15T10:30:00Z"
  },
  "testScenarios": {
    "light": { "duration": 30, "concurrentUsers": 5 },
    "medium": { "duration": 60, "concurrentUsers": 20 },
    "heavy": { "duration": 120, "concurrentUsers": 50 }
  }
}
```

This endpoint:
- Is publicly accessible (no auth required)
- Returns all testable URLs dynamically based on database content
- Includes metadata about caching and priorities
- Provides suggested test scenarios

### API Parameters

The `/api/load-test-urls` endpoint accepts these query parameters:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `includeStatic` | `true` | Include static pages (homepage, privacy, etc.) |
| `includeAuth` | `true` | Include auth pages (signin, register, etc.) |
| `includeApi` | `true` | Include API endpoints that support caching |
| `includeTowns` | `true` | Include town listing pages |
| `includePersons` | `true` | Include person detail pages |
| `maxPersonsPerTown` | `3` | Max persons per town (unless allPersons=true) |
| `allPersons` | `false` | Include ALL persons (warning: may be many!) |
| `allTowns` | `true` | Include ALL towns |

### Example API Calls

```bash
# Get all URLs (default)
curl https://cache2.bring-me-home.com/api/load-test-urls

# Get only API endpoints
curl "https://cache2.bring-me-home.com/api/load-test-urls?includeStatic=false&includeAuth=false&includeTowns=false&includePersons=false"

# Get ALL persons (not just 3 per town)
curl "https://cache2.bring-me-home.com/api/load-test-urls?allPersons=true"

# Get only town pages, no persons
curl "https://cache2.bring-me-home.com/api/load-test-urls?includePersons=false"
```

## 🌐 Testing External URLs

### Method 1: Direct URL Parameter

All test tools accept URL as the first parameter:

```bash
# Simple load tester
npx tsx load-tests/simple-load-test.ts http://cache2.bring-me-home.com

# With more aggressive settings
npx tsx load-tests/simple-load-test.ts http://cache2.bring-me-home.com 50 120

# Performance monitor
npx tsx load-tests/monitor-performance.ts http://cache2.bring-me-home.com
```

### Method 2: Environment Variable

Set the base URL via environment variable:

```bash
# Using environment variable
BASE_URL=http://cache2.bring-me-home.com npm run load-test:simple

# K6 with environment variable
BASE_URL=http://cache2.bring-me-home.com k6 run load-tests/k6-load-test.js
```

### Method 3: Update Configuration

Edit `load-tests/config.json` to change the default baseUrl:
```json
{
  "baseUrl": "http://cache2.bring-me-home.com",
  ...
}
```

### Important Considerations for External Testing

1. **Respect Rate Limits**: Use lower concurrent connections for external sites
   - Local: 50-100 concurrent requests
   - Staging: 10-30 concurrent requests  
   - Production: 5-10 concurrent requests

2. **Longer Durations**: External sites may have slower response times
   ```bash
   # Good for external testing
   npx tsx load-tests/simple-load-test.ts http://cache2.bring-me-home.com 10 120
   ```

3. **Network Latency**: Expect higher response times due to network distance

4. **HTTPS Support**: The tools automatically handle HTTPS URLs
   ```bash
   npx tsx load-tests/simple-load-test.ts https://secure.bring-me-home.com
   ```

5. **Firewall/CDN**: Some external sites may block or rate-limit load testing
   - Start with low concurrent requests
   - Monitor for 429 (Too Many Requests) errors
   - Consider testing during off-peak hours

## 📈 Performance Optimization Tips

Based on load test results, consider:

1. **For Slow Response Times:**
   - Enable caching headers
   - Optimize database queries
   - Implement CDN for static assets
   - Add database indexes

2. **For High Error Rates:**
   - Check server resource limits
   - Monitor database connections
   - Review error logs
   - Implement circuit breakers

3. **For Poor Cache Performance:**
   - Set appropriate cache headers
   - Implement Redis caching
   - Use CDN for images
   - Cache database queries

## 🐛 Troubleshooting

### API Endpoint Not Available

If you get an error like "Failed to parse JSON" or "404", the `/api/load-test-urls` endpoint is not deployed on the server yet. Solutions:

1. **Use the Fallback Tester**:
   ```bash
   npm run load-test:fallback -- https://cache2.bring-me-home.com
   ```

2. **Deploy the endpoint** by updating your server with the latest code from `src/app/api/load-test-urls/route.ts`

3. **Use the original simple tester** which will fall back to local database:
   ```bash
   npx tsx load-tests/simple-load-test.ts https://cache2.bring-me-home.com
   ```

### Hardcoded URLs in Tests

Some tests still have hardcoded town/person names:
- **Artillery** (`artillery-config.yml`) - Uses borrego-springs, mendocino, etc.
- **K6** (`k6-load-test.js`) - Uses same hardcoded towns
- **test-data.csv** - Contains hardcoded person names

These may not match your server's actual data. Use the API-driven tests (v2, comprehensive, quick) instead.

### Common Issues

1. **"Connection refused" errors**
   - Ensure the application is running
   - Check the base URL in tests
   - Verify firewall settings

2. **"Too many connections" database errors**
   - Increase connection pool size
   - Reduce concurrent requests
   - Check `DATABASE_URL` parameters

3. **Inconsistent results**
   - Warm up the application first
   - Run multiple iterations
   - Check for background processes

### Debug Mode

Enable detailed logging:
```bash
# For Prisma query logging
PRISMA_LOG=true PRISMA_LOG_LEVEL=3 npx tsx load-tests/monitor-performance.ts

# For Artillery debug
DEBUG=artillery* npx artillery run load-tests/artillery-config.yml
```

## 📚 Further Reading

- [Artillery Documentation](https://www.artillery.io/docs)
- [K6 Documentation](https://k6.io/docs/)
- [Web Performance Best Practices](https://web.dev/performance/)
- [Database Performance Tuning](https://www.prisma.io/docs/guides/performance-and-optimization)

## 🤝 Contributing

When adding new load tests:
1. Follow the existing pattern for URL discovery
2. Include both cached and uncached scenarios
3. Document expected results
4. Add new user behavior profiles if needed