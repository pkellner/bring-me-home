#!/bin/bash

# Load Test Script for External URLs
# Usage: ./test-external.sh [url] [scenario]

URL=${1:-"http://cache2.bring-me-home.com"}
SCENARIO=${2:-"light"}

echo "🌐 Load Testing External URL: $URL"
echo "📊 Using scenario: $SCENARIO"
echo ""

# Run simple load test with conservative settings for external sites
echo "1️⃣ Running Simple Load Test..."
echo "   - 10 concurrent requests"
echo "   - 60 second duration"
echo ""
npx tsx load-tests/simple-load-test.ts "$URL" 10 60

echo ""
echo "2️⃣ Running Performance Monitor..."
echo "   - Testing key pages and API endpoints"
echo "   - 2 iterations per URL"
echo ""
npx tsx load-tests/monitor-performance.ts "$URL" 2

echo ""
echo "✅ Load testing complete!"
echo ""
echo "📌 Tips for external testing:"
echo "   - Check your /configs page to see cache statistics"
echo "   - API endpoints (/api/*) will show cache performance"
echo "   - Page routes (/) won't show cache headers"
echo "   - Monitor for rate limiting (429 errors)"