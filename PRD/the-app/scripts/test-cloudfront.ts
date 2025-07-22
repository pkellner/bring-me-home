#!/usr/bin/env tsx

/**
 * Script to test CloudFront and origin server configuration
 * Usage: npx tsx scripts/test-cloudfront.ts
 */

// Load environment variables
import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

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
  
  // Check if we're testing against production or local
  const isLocalhost = ORIGIN_URL.includes('localhost');
  
  if (isLocalhost) {
    console.log('⚠️  Testing against localhost - make sure your dev server is running!');
    console.log('   Run "npm run dev" in another terminal');
    console.log('');
  }
  
  // Find an actual static file from the build
  const staticDir = path.join(process.cwd(), '.next/static');
  let testFile = '';
  
  try {
    // Look for the build ID file which should always exist
    const buildIdPath = path.join(process.cwd(), '.next/BUILD_ID');
    if (fs.existsSync(buildIdPath)) {
      const buildId = fs.readFileSync(buildIdPath, 'utf8').trim();
      // Use a file that should exist in production builds
      testFile = `/_next/static/${buildId}/_buildManifest.js`;
      console.log(`📁 Using build ID: ${buildId}`);
      console.log('');
    } else {
      // Try to find any JS file in the static directory
      const chunks = path.join(staticDir, 'chunks');
      if (fs.existsSync(chunks)) {
        const files = fs.readdirSync(chunks);
        const jsFile = files.find(f => f.endsWith('.js'));
        if (jsFile) {
          testFile = `/_next/static/chunks/${jsFile}`;
        }
      }
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
  console.log('CloudFront Origin Configuration:');
  console.log('================================');
  console.log('IMPORTANT: Your CloudFront origin should point to your PRODUCTION deployment URL');
  console.log('NOT localhost. Examples:');
  console.log('- Vercel: your-app.vercel.app');
  console.log('- AWS: your-alb.region.elb.amazonaws.com');
  console.log('- Your domain: app.yourdomain.com');
  console.log('');
  console.log('The origin URL in your CloudFront distribution settings must match');
  console.log('where your Next.js app is deployed in production.');
  console.log('');
  
  if (ORIGIN_URL.includes('localhost')) {
    console.log('⚠️  WARNING: Your NEXTAUTH_URL is set to localhost.');
    console.log('   CloudFront cannot access localhost as an origin!');
    console.log('   Update your CloudFront origin to point to your production URL.');
  }
}

main().catch(console.error);