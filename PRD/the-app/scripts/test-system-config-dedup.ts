#!/usr/bin/env tsx
import { getSystemLayoutTheme } from '../src/app/actions/systemConfig';

async function testDeduplication() {
  console.log('=== System Config Deduplication Test ===\n');
  
  console.log('Making 10 concurrent requests for system layout/theme...\n');
  
  const startTime = Date.now();
  
  // Make 10 concurrent requests
  const promises = Array.from({ length: 10 }, (_, i) => 
    getSystemLayoutTheme().then(result => ({
      index: i,
      result,
      time: Date.now() - startTime
    }))
  );
  
  const results = await Promise.all(promises);
  
  console.log('Results:');
  results.forEach(({ index, result, time }) => {
    console.log(`Request ${index + 1}: ${time}ms - layout: ${result.layout}, theme: ${result.theme}`);
  });
  
  const avgTime = results.reduce((sum, r) => sum + r.time, 0) / results.length;
  console.log(`\nAverage response time: ${avgTime.toFixed(1)}ms`);
  
  // All results should be identical
  const firstResult = JSON.stringify(results[0].result);
  const allSame = results.every(r => JSON.stringify(r.result) === firstResult);
  
  if (allSame) {
    console.log('✅ All results are identical (deduplication working)');
  } else {
    console.log('❌ Results differ (deduplication might not be working)');
  }
  
  // If deduplication is working, most requests should complete at nearly the same time
  const maxTime = Math.max(...results.map(r => r.time));
  const minTime = Math.min(...results.map(r => r.time));
  const timeDiff = maxTime - minTime;
  
  console.log(`\nTime spread: ${timeDiff}ms (min: ${minTime}ms, max: ${maxTime}ms)`);
  
  if (timeDiff < 50) {
    console.log('✅ Requests completed nearly simultaneously (good deduplication)');
  } else {
    console.log('⚠️  Large time spread might indicate deduplication issues');
  }
  
  process.exit(0);
}

testDeduplication().catch(console.error);