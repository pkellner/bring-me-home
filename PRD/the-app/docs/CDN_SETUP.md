# CDN Setup Guide

## Overview

This application is configured to use CloudFront CDN for serving static assets (JavaScript, CSS, images) in production, which significantly improves performance and reduces server load.

## Local Development

When running locally with `npm run start`:

- **Automatically detects localhost** and disables HTTPS redirect
- Works with http://localhost:3000, http://127.0.0.1:3000, etc.
- Does NOT use CDN for assets
- No configuration needed - just works!

```bash
npm run build
npm start
# Access via http://localhost:3000 - no HTTPS redirect!
```

## Production Configuration

### 1. CloudFront Setup

Configure your CloudFront distribution with:
- **Origin**: Your production domain
- **Behaviors**: 
  - `/_next/static/*` - Cache with long TTL (1 year)
  - `/_next/image/*` - Cache with medium TTL (1 day)
  - `/fonts/*` - Cache with long TTL (1 year)
  - `/images/*` - Cache with medium TTL (1 day)

### 2. Environment Variables

Set these in your production environment:

```env
# Required for CDN integration
NEXT_PUBLIC_CLOUDFRONT_CDN_URL=https://d1234567890.cloudfront.net
```

### 3. How It Works

When `NEXT_PUBLIC_CLOUDFRONT_CDN_URL` is set in production:

1. **Static Assets**: All JavaScript and CSS files are automatically served from the CDN
2. **Images**: Next.js Image Optimization API continues to work with CDN
3. **Cache Headers**: Proper cache headers are set for optimal CDN performance
4. **HTTPS**: Only enforced in actual production deployments (not local `npm start`)

### 4. Verification

After deployment, check that assets are served from CDN:

1. Open browser DevTools
2. Go to Network tab
3. Look for `_next/static/` requests
4. Verify they're loading from your CloudFront domain

### 5. Cache Invalidation

When deploying new versions:
- Next.js automatically generates new hashed filenames for changed assets
- No manual cache invalidation needed for `_next/static/` files
- May need to invalidate `/images/*` if you update static images

## Benefits

1. **Performance**: Static assets served from edge locations worldwide
2. **Cost**: Reduces bandwidth costs on your origin server
3. **Reliability**: CDN provides additional layer of availability
4. **SEO**: Faster page loads improve search rankings

## Troubleshooting

### Assets not loading from CDN
- Verify `NEXT_PUBLIC_CLOUDFRONT_CDN_URL` is set correctly
- Check CloudFront distribution is deployed and active
- Ensure CORS headers are properly configured on CloudFront

### HTTPS redirect issues locally
- The middleware automatically detects localhost and disables HTTPS redirect
- No configuration needed - it just works on localhost, 127.0.0.1, etc.

### Cache not updating
- Next.js uses content hashing for cache busting
- If issues persist, create CloudFront invalidation for `/_next/static/*`