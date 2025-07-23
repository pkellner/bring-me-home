#!/usr/bin/env tsx
import http from 'http';
import https from 'https';
import { URL } from 'url';

async function checkHeaders(urlString: string) {
  const url = new URL(urlString);
  const protocol = url.protocol === 'https:' ? https : http;
  
  return new Promise((resolve) => {
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'Header Debug Test',
      }
    };

    const req = protocol.request(options, (res) => {
      console.log(`\n📍 URL: ${urlString}`);
      console.log(`📊 Status: ${res.statusCode}`);
      
      // Show redirect location if present
      if (res.statusCode === 301 || res.statusCode === 302) {
        console.log(`🔄 Redirect: ${res.headers.location}`);
      }
      
      console.log(`📋 Cache-related Headers:`);
      
      let foundCacheHeaders = false;
      Object.entries(res.headers).forEach(([key, value]) => {
        if (key.toLowerCase().includes('cache') || 
            key.toLowerCase() === 'x-cache-source' || 
            key.toLowerCase() === 'x-cache-latency' ||
            key.toLowerCase() === 'etag' ||
            key.toLowerCase() === 'last-modified') {
          console.log(`   ${key}: ${value}`);
          foundCacheHeaders = true;
        }
      });
      
      if (!foundCacheHeaders) {
        console.log(`   (No cache headers found)`);
      }
      
      // Consume response data
      res.on('data', () => {});
      res.on('end', () => resolve(null));
    });

    req.on('error', (error) => {
      console.error(`❌ Error: ${error.message}`);
      resolve(null);
    });

    req.end();
  });
}

async function main() {
  const baseUrl = process.argv[2] || 'http://cache2.bring-me-home.com';
  
  console.log(`🔍 Checking headers for: ${baseUrl}`);
  console.log('━'.repeat(60));

  // Test various endpoints
  const endpoints = [
    '/',
    '/api/homepage-data',
    '/api/configs',
    '/api/town-data/borrego-springs',
    '/api/person-data/borrego-springs/john-smith'
  ];

  for (const endpoint of endpoints) {
    await checkHeaders(`${baseUrl}${endpoint}`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

main().catch(console.error);