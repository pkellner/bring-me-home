# CloudFront Debugging Guide

## Current Issue
- JavaScript chunks are loading: ✅ `https://d3rdbmhyjxa9r8.cloudfront.net/_next/static/chunks/6874-3416081c8ab95fb4.js`
- CSS files are failing: ❌ `https://d3rdbmhyjxa9r8.cloudfront.net/_next/static/css/34be28ec43d62ce8.css` (404)

## Root Cause Analysis

This pattern (some files work, others don't) typically means:
1. **Partial deployment**: Your origin has some files but not others
2. **Multiple origins**: CloudFront might be using different origins for different paths
3. **Build mismatch**: The HTML references files from a different build than what's on the origin

## Immediate Debugging Steps

### 1. Check Origin Server Directly
First, determine your actual origin URL (not localhost). It should be your production deployment.

```bash
# Replace with your actual origin URL (e.g., your-app.vercel.app)
ORIGIN_URL="your-production-url.com"

# Test if CSS exists on origin
curl -I https://${ORIGIN_URL}/_next/static/css/34be28ec43d62ce8.css

# Test if JS exists on origin (this should work based on your report)
curl -I https://${ORIGIN_URL}/_next/static/chunks/6874-3416081c8ab95fb4.js
```

### 2. Check CloudFront Configuration

In AWS CloudFront Console:
1. Go to your distribution
2. Click on "Origins" tab
3. Verify:
   - Origin Domain Name (should be your production URL, not localhost)
   - Origin Protocol Policy (should be HTTPS Only)
   - Origin Path (should be empty)

### 3. Check Cache Behaviors

In the "Behaviors" tab, verify you have:
- Default behavior (*)
- Behavior for `/_next/static/*` (if you created one)

For each behavior, check:
- Origin is correct
- Cache settings are appropriate

## Solutions Based on Findings

### If Origin Returns 404 for CSS

**The origin doesn't have the current build deployed:**
1. Deploy your current build to production
2. Wait for deployment to complete
3. Test origin directly again
4. Then invalidate CloudFront

### If Origin Returns 200 for CSS but CloudFront Returns 404

**CloudFront configuration issue:**
1. Check if you have multiple behaviors with different origins
2. Ensure all behaviors point to the same, correct origin
3. Invalidate CloudFront cache:
   ```bash
   aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
   ```

### If Some Files Work and Others Don't

**This often indicates a deployment race condition:**
1. Your HTML was deployed
2. CloudFront cached it
3. Static assets were deployed later
4. CloudFront is serving old cached responses

**Fix:**
```bash
# Force CloudFront to refetch everything
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"

# Or specifically invalidate CSS
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/_next/static/css/*"
```

## Verify Your Deployment Process

The correct deployment order should be:
1. Build locally: `npm run build`
2. Deploy to your hosting provider (Vercel, AWS, etc.)
3. **Wait for deployment to be fully complete**
4. Invalidate CloudFront: `aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"`

## Quick Test Script

Create a test script to verify all assets:

```bash
#!/bin/bash
ORIGIN="your-production-url.com"
CDN="d3rdbmhyjxa9r8.cloudfront.net"

echo "Testing Origin..."
curl -s -o /dev/null -w "%{http_code}" https://$ORIGIN/_next/static/css/34be28ec43d62ce8.css
echo " - CSS on origin"

curl -s -o /dev/null -w "%{http_code}" https://$ORIGIN/_next/static/chunks/6874-3416081c8ab95fb4.js
echo " - JS on origin"

echo -e "\nTesting CDN..."
curl -s -o /dev/null -w "%{http_code}" https://$CDN/_next/static/css/34be28ec43d62ce8.css
echo " - CSS on CDN"

curl -s -o /dev/null -w "%{http_code}" https://$CDN/_next/static/chunks/6874-3416081c8ab95fb4.js
echo " - JS on CDN"
```

## Common Issues and Solutions

### Issue: "It worked yesterday but not today"
- You deployed a new build
- Old HTML in CloudFront references new static files
- New static files aren't in CloudFront cache yet
- **Solution**: Always invalidate after deployment

### Issue: "Some users see it working, others don't"
- CloudFront edge locations have different cached content
- **Solution**: Full invalidation across all edge locations

### Issue: "I invalidated but it's still broken"
- Invalidation can take 5-10 minutes to propagate
- Browser might be caching old content
- **Solution**: Wait, then hard refresh (Ctrl+Shift+R)

## Recommended Architecture Change

To avoid these issues permanently, consider:

1. **Option A**: Serve everything through CloudFront
   - Point your domain to CloudFront
   - CloudFront serves both HTML and static assets
   - No CORS issues, no cache mismatches

2. **Option B**: Use asset versioning
   - Configure Next.js to use timestamp-based asset prefixes
   - Old HTML will reference old assets (which still exist)
   - New deployments won't break existing users

3. **Option C**: Automate invalidation
   - Add CloudFront invalidation to your CI/CD pipeline
   - Automatically invalidate after each deployment
   - Ensures fresh content always