# CloudFront CDN Setup Guide

This guide explains how to properly configure AWS CloudFront to serve static assets for the Bring Me Home application.

## Overview

The application uses CloudFront to serve static assets (`/_next/static/*`) for improved performance. The Next.js application serves as the origin for CloudFront.

## Prerequisites

- AWS account with CloudFront access
- Next.js application deployed and accessible via HTTP/HTTPS
- Domain name (optional, for custom domain)

## CloudFront Distribution Configuration

### 1. Create CloudFront Distribution

1. Go to AWS CloudFront Console
2. Click "Create Distribution"
3. Choose "Web" distribution type

### 2. Origin Settings

Configure your origin with these settings:

- **Origin Domain Name**: Your Next.js application domain (e.g., `your-app.vercel.app` or your EC2/ECS endpoint)
- **Origin Protocol Policy**: HTTPS Only
- **Origin Path**: Leave empty
- **HTTP Port**: 80
- **HTTPS Port**: 443
- **Minimum Origin SSL Protocol**: TLSv1.2
- **Origin Connection Attempts**: 3
- **Origin Connection Timeout**: 10 seconds
- **Origin Response Timeout**: 30 seconds
- **Origin Keep-alive Timeout**: 5 seconds

### 3. Default Cache Behavior

Configure the default behavior:

- **Path Pattern**: Default (*)
- **Viewer Protocol Policy**: Redirect HTTP to HTTPS
- **Allowed HTTP Methods**: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
- **Cached HTTP Methods**: GET, HEAD
- **Cache Based on Selected Request Headers**: None
- **Object Caching**: Use Origin Cache Headers
- **Forward Cookies**: None
- **Query String Forwarding**: None
- **Compress Objects Automatically**: Yes

### 4. Additional Cache Behaviors (IMPORTANT)

Create specific behaviors for Next.js static assets:

#### Behavior 1: Static Assets
- **Path Pattern**: `/_next/static/*`
- **Origin**: Same as default
- **Viewer Protocol Policy**: Redirect HTTP to HTTPS
- **Allowed HTTP Methods**: GET, HEAD
- **Cache Based on Selected Request Headers**: None
- **Object Caching**: Customize
  - **Minimum TTL**: 0
  - **Maximum TTL**: 31536000 (1 year)
  - **Default TTL**: 86400 (1 day)
- **Forward Cookies**: None
- **Query String Forwarding**: None
- **Compress Objects Automatically**: Yes

#### Behavior 2: Next.js Image Optimization
- **Path Pattern**: `/_next/image*`
- **Origin**: Same as default
- **Viewer Protocol Policy**: Redirect HTTP to HTTPS
- **Allowed HTTP Methods**: GET, HEAD
- **Cache Based on Selected Request Headers**: None
- **Object Caching**: Customize
  - **Minimum TTL**: 0
  - **Maximum TTL**: 31536000
  - **Default TTL**: 86400
- **Forward Cookies**: None
- **Query String Forwarding**: All
- **Compress Objects Automatically**: Yes

### 5. Distribution Settings

- **Price Class**: Use your preferred price class
- **Alternate Domain Names (CNAMEs)**: Add your custom domain if using one
- **SSL Certificate**: Use default CloudFront certificate or custom certificate
- **Default Root Object**: Leave empty
- **Logging**: Enable if needed
- **Enable IPv6**: Yes

### 6. Error Pages (Optional but Recommended)

Configure custom error pages:

- **404 Not Found**:
  - Error Code: 404
  - Response Page Path: /404
  - Response Code: 404
  - TTL: 300 seconds

## Application Configuration

### 1. Environment Variables

Set the CloudFront distribution URL in your environment:

```bash
# .env.production
NEXT_PUBLIC_CLOUDFRONT_CDN_URL=https://d3rdbmhyjxa9r8.cloudfront.net
```

### 2. Next.js Configuration

The `next.config.ts` is already configured to use the CDN URL when available:

```typescript
assetPrefix: process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_CLOUDFRONT_CDN_URL
  ? process.env.NEXT_PUBLIC_CLOUDFRONT_CDN_URL
  : undefined,
```

### 3. Deployment Process

1. Build your Next.js application:
   ```bash
   npm run build
   ```

2. Deploy to your hosting platform (Vercel, AWS, etc.)

3. Wait for CloudFront distribution to be deployed (can take 15-30 minutes)

4. Test static asset loading:
   ```bash
   curl -I https://your-cloudfront-domain.cloudfront.net/_next/static/chunks/main.js
   ```

## Important: Deployment Order and Cache Invalidation

### Deployment Steps (CRITICAL ORDER)

1. **Build your application**:
   ```bash
   npm run build
   ```

2. **Deploy to origin server** (Vercel, AWS, etc.)

3. **Wait for deployment to complete** (verify origin serves new files)

4. **Invalidate CloudFront cache**:
   ```bash
   # Invalidate everything (recommended after deployment)
   aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
   
   # Or invalidate specific paths
   aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/" "/index.html" "/_next/static/*"
   ```

### Why Cache Invalidation is Necessary

Next.js generates unique hash-based filenames for static assets (e.g., `page-c643bf5d73b6586f.js`). When you deploy:
- New build creates new filenames
- CloudFront may serve old HTML that references old filenames
- Result: 404 errors for JavaScript/CSS files

**Solution**: Always invalidate at least the HTML pages after deployment.

## Troubleshooting

### 404 Errors on Static Assets (Most Common Issue)

This typically happens when CloudFront serves old HTML with references to old chunk files.

**Immediate Fix**:
```bash
# Invalidate all HTML pages
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

**Debugging Steps**:

1. **Test with the provided script**:
   ```bash
   npx tsx scripts/test-cloudfront.ts
   ```

2. **Verify Origin Access**: Ensure CloudFront can reach your origin server
   ```bash
   curl -I https://your-origin.com/_next/static/chunks/main.js
   ```

3. **Check Path Patterns**: Ensure cache behaviors match exactly `/_next/static/*`

4. **Build Hash Mismatch**: Ensure the same build is deployed to origin that generated the HTML

### CORS Errors

CloudFront doesn't add CORS headers by default. If needed:

1. Configure your origin to return proper CORS headers
2. Or use CloudFront Response Headers Policy to add CORS headers

### Cache Not Working

1. Check browser developer tools for response headers
2. Look for `x-cache: Hit from cloudfront` header
3. Ensure proper cache behaviors are configured

## Best Practices

1. **Cache Invalidation**: Only invalidate when absolutely necessary (costs apply)
2. **Origin Shield**: Consider enabling for better cache hit ratio
3. **Compression**: Ensure gzip/brotli compression is enabled
4. **Security Headers**: Add security headers via CloudFront policies
5. **Monitoring**: Set up CloudWatch alarms for 4xx/5xx errors

## Verification Steps

After setup, verify everything works:

1. **Check Static Assets Load**:
   - Open browser developer tools
   - Load your application
   - Check Network tab for `/_next/static/*` requests
   - Verify they're loading from CloudFront domain

2. **Check Cache Headers**:
   - Look for `cache-control: public, max-age=31536000, immutable`
   - Look for `x-cache: Hit from cloudfront` (after second request)

3. **Performance Test**:
   - Use tools like GTmetrix or PageSpeed Insights
   - Should see improved asset loading times

## Common Issues and Solutions

### Issue: "Maximum call stack size exceeded"
- Not related to CloudFront
- This is a Next.js serialization issue
- See CLAUDE.md for details

### Issue: Assets load from origin, not CDN
- Check `NEXT_PUBLIC_CLOUDFRONT_CDN_URL` is set correctly
- Verify it starts with `https://`
- Rebuild application after setting environment variable

### Issue: Old assets still being served
- CloudFront caches aggressively
- Create invalidation for `/_next/static/*`
- Or wait for TTL to expire

## Support

For CloudFront-specific issues:
- Check AWS CloudFront documentation
- Review CloudWatch logs if enabled
- Contact AWS support for distribution-specific issues