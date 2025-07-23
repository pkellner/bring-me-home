module.exports = {
  // Generate random data for testing
  generateRandomData: function(context, events, done) {
    // Random town selection
    const towns = ['borrego-springs', 'mendocino', 'pismo-beach', 'lake-elsinore'];
    context.vars.randomTown = towns[Math.floor(Math.random() * towns.length)];
    
    // Simulate different user agents
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    ];
    context.vars.userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    return done();
  },

  // Log response times for analysis
  logResponseTime: function(requestParams, response, context, ee, next) {
    const responseTime = response.timings.phases.total;
    const url = requestParams.url;
    
    if (responseTime > 2000) {
      console.log(`⚠️  Slow response: ${url} took ${responseTime}ms`);
    }
    
    return next();
  },

  // Check cache headers
  checkCacheHeaders: function(requestParams, response, context, ee, next) {
    const cacheControl = response.headers['cache-control'];
    const etag = response.headers['etag'];
    
    if (!cacheControl && !etag) {
      console.log(`⚠️  No cache headers for: ${requestParams.url}`);
    }
    
    return next();
  },

  // Simulate realistic think times
  realisticThinkTime: function(context, events, done) {
    // Vary think time based on page type
    const url = context.vars.target;
    let thinkTime = 3000; // default 3 seconds
    
    if (url && url.includes('/learn-more')) {
      thinkTime = 10000; // 10 seconds for reading
    } else if (url && url.includes('person')) {
      thinkTime = 7000; // 7 seconds for person details
    }
    
    // Add some randomness (±30%)
    thinkTime = thinkTime * (0.7 + Math.random() * 0.6);
    
    setTimeout(done, thinkTime);
  }
};