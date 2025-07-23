import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const homePageDuration = new Trend('homepage_duration');
const townPageDuration = new Trend('town_page_duration');
const personPageDuration = new Trend('person_page_duration');

// Test configuration
export const options = {
  scenarios: {
    // Scenario 1: Constant load
    constant_load: {
      executor: 'constant-arrival-rate',
      rate: 30,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 50,
      maxVUs: 100,
    },
    // Scenario 2: Ramping load
    ramping_load: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '3m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '3m', target: 50 },
      ],
    },
    // Scenario 3: Spike test
    spike_test: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 500,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '30s', target: 300 }, // Spike!
        { duration: '1m', target: 300 },   // Stay at spike
        { duration: '30s', target: 5 },    // Recovery
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.01'], // Error rate under 1%
    errors: ['rate<0.01'],
    homepage_duration: ['p(95)<1500'],
    town_page_duration: ['p(95)<2000'],
    person_page_duration: ['p(95)<2500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data
const TOWNS = ['borrego-springs', 'mendocino', 'pismo-beach', 'lake-elsinore'];
const STATIC_PAGES = [
  { path: '/', name: 'homepage' },
  { path: '/learn-more', name: 'learn-more' },
  { path: '/show-your-support', name: 'support' },
  { path: '/code-of-conduct', name: 'conduct' },
  { path: '/privacy-policy', name: 'privacy' },
];

// Helper function to make requests with proper error handling
function makeRequest(url, name) {
  const params = {
    headers: {
      'User-Agent': 'K6 Load Test',
    },
    tags: { name: name },
  };

  const res = http.get(url, params);
  
  // Check response
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 2000ms': (r) => r.timings.duration < 2000,
    'has cache headers': (r) => r.headers['Cache-Control'] !== undefined || r.headers['ETag'] !== undefined,
  });

  errorRate.add(!success);
  
  return res;
}

// User behavior scenarios
export function casualBrowsing() {
  // Visit homepage
  let res = makeRequest(`${BASE_URL}/`, 'homepage');
  homePageDuration.add(res.timings.duration);
  sleep(Math.random() * 3 + 2); // 2-5 seconds

  // Visit a random town
  const town = TOWNS[Math.floor(Math.random() * TOWNS.length)];
  res = makeRequest(`${BASE_URL}/${town}`, 'town-page');
  townPageDuration.add(res.timings.duration);
  sleep(Math.random() * 5 + 3); // 3-8 seconds

  // Maybe visit learn more (50% chance)
  if (Math.random() > 0.5) {
    makeRequest(`${BASE_URL}/learn-more`, 'learn-more');
    sleep(Math.random() * 10 + 5); // 5-15 seconds reading
  }
}

export function targetedSearch() {
  // Direct visit to a town
  const town = TOWNS[Math.floor(Math.random() * TOWNS.length)];
  let res = makeRequest(`${BASE_URL}/${town}`, 'town-page-direct');
  townPageDuration.add(res.timings.duration);
  sleep(Math.random() * 5 + 5); // 5-10 seconds browsing

  // Visit support page
  makeRequest(`${BASE_URL}/show-your-support`, 'support-page');
  sleep(Math.random() * 3 + 2);
}

export function comprehensiveBrowsing() {
  // Visit multiple pages in sequence
  for (const page of STATIC_PAGES) {
    const res = makeRequest(`${BASE_URL}${page.path}`, page.name);
    
    if (page.path === '/') {
      homePageDuration.add(res.timings.duration);
    }
    
    // Longer reading time for content pages
    if (page.path.includes('learn') || page.path.includes('policy')) {
      sleep(Math.random() * 10 + 10); // 10-20 seconds
    } else {
      sleep(Math.random() * 3 + 2); // 2-5 seconds
    }
  }
}

// Main test function - randomly selects user behavior
export default function() {
  const behaviors = [casualBrowsing, targetedSearch, comprehensiveBrowsing];
  const selectedBehavior = behaviors[Math.floor(Math.random() * behaviors.length)];
  selectedBehavior();
}

// Setup function - runs once per VU
export function setup() {
  // Verify the target is reachable
  const res = http.get(BASE_URL);
  if (res.status !== 200) {
    throw new Error(`Target ${BASE_URL} is not reachable. Status: ${res.status}`);
  }
  
  console.log(`Load test starting against: ${BASE_URL}`);
  return { startTime: new Date().toISOString() };
}

// Teardown function - runs once at the end
export function teardown(data) {
  console.log(`Load test completed. Started at: ${data.startTime}`);
}