#!/usr/bin/env tsx

/**
 * Script to test CloudFront and origin server configuration
 * Usage: npx tsx scripts/test-cloudfront.ts
 */

const CLOUDFRONT_URL = process.env.NEXT_PUBLIC_CLOUDFRONT_CDN_URL;
const ORIGIN_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

if (!CLOUDFRONT_URL) {
  console.error('❌ NEXT_PUBLIC_CLOUDFRONT_CDN_URL is not set');
  process.exit(1);
}

console.log('🔍 Testing CloudFront Configuration');
console.log('===================================');
console.log(`CloudFront URL: ${CLOUDFRONT_URL}`);
console.log(`Origin URL: ${ORIGIN_URL}`);
console.log('');

async function testUrl(url: string, description: string) {
  console.log(`📋 Testing: ${description}`);
  console.log(`   URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Cache-Control: ${response.headers.get('cache-control') || 'Not set'}`);
    console.log(`   Content-Type: ${response.headers.get('content-type') || 'Not set'}`);
    console.log(`   X-Cache: ${response.headers.get('x-cache') || 'Not from CloudFront'}`);
    console.log(`   Access-Control-Allow-Origin: ${response.headers.get('access-control-allow-origin') || 'Not set'}`);
    
    if (response.status === 404) {
      console.log('   ❌ File not found');
    } else if (response.status >= 200 && response.status < 300) {
      console.log('   ✅ Success');
    } else {
      console.log('   ⚠️  Unexpected status');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
  }
  
  console.log('');
}

async function main() {
  // Test a known static file path from the build
  const fs = await import('fs');
  const path = await import('path');
  
  // Find an actual static file from the build
  const staticDir = path.join(process.cwd(), '.next/static/chunks/app');
  let testFile = '';
  
  try {
    const files = fs.readdirSync(staticDir, { recursive: true });
    const jsFile = files.find(f => f.toString().endsWith('.js'));
    if (jsFile) {
      testFile = `/_next/static/chunks/app/${jsFile}`;
      console.log(`📁 Found test file in build: ${testFile}`);
      console.log('');
    }
  } catch (error) {
    console.log('⚠️  Could not read build directory. Make sure to run "npm run build" first.');
    console.log('');
  }
  
  // Test origin server
  if (testFile) {
    await testUrl(`${ORIGIN_URL}${testFile}`, 'Origin Server - Static File');
  }
  
  // Test CloudFront
  if (testFile) {
    await testUrl(`${CLOUDFRONT_URL}${testFile}`, 'CloudFront - Static File');
  }
  
  // Test HTML page through CloudFront
  await testUrl(`${CLOUDFRONT_URL}/configs`, 'CloudFront - HTML Page');
  
  console.log('🔧 Troubleshooting Steps:');
  console.log('========================');
  console.log('');
  console.log('If you see 404 errors:');
  console.log('1. Make sure your origin server is accessible from CloudFront');
  console.log('2. Verify CloudFront origin settings point to the correct domain');
  console.log('3. Check that the origin path is empty (not set)');
  console.log('');
  console.log('If you see CORS errors:');
  console.log('1. The Access-Control-Allow-Origin header should be "*" for static files');
  console.log('2. Make sure CloudFront forwards the Origin header to the origin');
  console.log('3. Consider using a CloudFront Response Headers Policy');
  console.log('');
  console.log('To fix cache issues:');
  console.log('1. Create a CloudFront invalidation:');
  console.log(`   aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"`);
  console.log('2. Or wait for TTL to expire');
  console.log('3. Use versioned filenames (Next.js does this automatically)');
  console.log('');
  console.log('To test if origin is accessible:');
  console.log(`   curl -I ${ORIGIN_URL}/_next/static/chunks/main.js`);
}

main().catch(console.error);