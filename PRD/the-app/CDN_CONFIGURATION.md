# CDN Configuration Guide

## Overview

This application supports CloudFront CDN integration for improved performance. However, there are specific configurations needed for optimal operation.

## Current Implementation

### 1. Favicon CDN Support
The favicon is now configured to be served from the CDN when `NEXT_PUBLIC_CLOUDFRONT_CDN_URL` is set. This is handled in `/src/app/metadata.ts`:

```typescript
icons: {
  icon: cdnUrl ? `${cdnUrl}/favicon.ico` : '/favicon.ico',
  shortcut: cdnUrl ? `${cdnUrl}/favicon.ico` : '/favicon.ico',
},
```

### 2. Static Assets
When `NEXT_PUBLIC_CLOUDFRONT_CDN_URL` is configured, static assets (JS, CSS, fonts) are automatically served from the CDN through the `assetPrefix` configuration in `next.config.ts`.

### 3. API Images
Images served through `/api/images/` endpoints are CDN-aware through the `generateImageUrlWithCdn` function.

## _next/image Optimization Issue

You're seeing `_next/image` URLs loading from `cache2.bring-me-home.com` instead of the CDN because Next.js Image Optimization requires server-side processing. This is expected behavior.

### Why This Happens
1. Next.js Image component uses the `/_next/image` endpoint for on-the-fly image optimization
2. This endpoint must be handled by the Next.js server, not a CDN
3. CloudFront can cache these optimized images, but the initial request must go to the origin

### CloudFront Configuration Required

To properly handle this, your CloudFront distribution needs:

1. **Origin Configuration**
   - Origin Domain: `cache2.bring-me-home.com`
   - Origin Protocol: HTTPS only
   - Origin Path: Leave empty

2. **Cache Behaviors**
   
   **Behavior 1: Next.js Image Optimization**
   - Path Pattern: `/_next/image*`
   - Origin: Your Next.js server
   - Viewer Protocol Policy: Redirect HTTP to HTTPS
   - Allowed HTTP Methods: GET, HEAD, OPTIONS
   - Cache Based on Query Strings: All
   - TTL Settings:
     - Minimum TTL: 0
     - Maximum TTL: 31536000 (1 year)
     - Default TTL: 86400 (1 day)

   **Behavior 2: API Endpoints**
   - Path Pattern: `/api/*`
   - Origin: Your Next.js server
   - Viewer Protocol Policy: Redirect HTTP to HTTPS
   - Allowed HTTP Methods: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
   - Forward Headers: All
   - Cache: Disabled (TTL 0)

   **Behavior 3: Static Assets**
   - Path Pattern: `/_next/static/*`
   - Origin: Your Next.js server
   - Viewer Protocol Policy: Redirect HTTP to HTTPS
   - Cache Based on Query Strings: None
   - TTL Settings:
     - Minimum TTL: 31536000
     - Maximum TTL: 31536000
     - Default TTL: 31536000

   **Default Behavior**
   - Origin: Your Next.js server
   - Viewer Protocol Policy: Redirect HTTP to HTTPS
   - Forward Headers: Host, CloudFront-Forwarded-Proto
   - Cache Based on Query Strings: All

3. **Error Pages**
   - Configure custom error pages for 404 and 500 errors

## Environment Configuration

```env
# Production
NEXT_PUBLIC_CLOUDFRONT_CDN_URL=https://d1c7tg6cmx1vrl.cloudfront.net

# Staging
NEXT_PUBLIC_CLOUDFRONT_CDN_URL=https://d3rdbmhyjxa9r8.cloudfront.net
```

## Testing CDN Configuration

Use the provided test script:

```bash
npm run test:cloudfront
```

This will verify:
- Static assets are served from CDN
- API endpoints work correctly
- Image optimization is functioning
- Cache headers are properly set

## Benefits of Current Setup

1. **Favicon**: Served directly from CDN, reducing server load
2. **Static Assets**: JS/CSS files served from CDN with long cache headers
3. **API Images**: Your custom image API uses CDN URLs when available
4. **Next.js Images**: Although processed by the server, results are cached by CloudFront

## Important Notes

- The `_next/image` URLs appearing to come from `cache2.bring-me-home.com` is correct behavior
- CloudFront will cache these optimized images after the first request
- Subsequent requests for the same image/size combination will be served from CloudFront's edge cache
- This provides the best balance between dynamic optimization and CDN performance