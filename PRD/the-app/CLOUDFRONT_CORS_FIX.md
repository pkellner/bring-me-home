# CloudFront CORS Configuration Fix

Your application at `https://cache2.bring-me-home.com` is trying to load fonts from CloudFront, which is causing CORS errors. Here's how to fix it:

## Option 1: CloudFront Response Headers Policy (Recommended)

### Create a Response Headers Policy in AWS Console:

1. Go to CloudFront Console
2. Click on "Policies" in the left sidebar
3. Click "Response headers"
4. Click "Create response headers policy"
5. Name it: `bring-me-home-cors-policy`

### Configure CORS Settings:

**Configure cross-origin resource sharing (CORS):**
- Toggle ON "Configure CORS"
- Access-Control-Allow-Origin: 
  - Origin override: Yes
  - Origin: `*` (or specifically `https://cache2.bring-me-home.com` for better security)
- Access-Control-Allow-Headers:
  - Headers: `*`
- Access-Control-Allow-Methods:
  - Methods: `GET`, `HEAD`, `OPTIONS`
- Access-Control-Max-Age:
  - Max age: `86400`

### Apply the Policy:

1. Go to your CloudFront distribution
2. Click on the "Behaviors" tab
3. For each behavior (especially `/_next/static/*` and default):
   - Click Edit
   - In "Response headers policy", select your new `bring-me-home-cors-policy`
   - Save changes

## Option 2: Update CloudFront Behaviors

If you can't use Response Headers Policy, configure each behavior:

### For `/_next/static/*` behavior:
1. Edit the behavior
2. Under "Cache key and origin requests":
   - Headers: Include the following headers:
     - `Origin`
     - `Access-Control-Request-Headers`
     - `Access-Control-Request-Method`

### For `/_next/static/media/*` behavior (create if doesn't exist):
1. Create new behavior
2. Path pattern: `/_next/static/media/*`
3. Origin: Same as your main origin
4. Headers to include: Same as above
5. Cache settings: Same as other static content

## Option 3: Serve Everything from Same Domain

The cleanest solution is to serve your entire app through CloudFront:

1. Point `cache2.bring-me-home.com` to CloudFront (not your origin)
2. Remove `assetPrefix` from `next.config.ts`
3. Let CloudFront handle all requests

This eliminates CORS issues entirely.

## Immediate Workaround

While you implement the above, you can:

1. Deploy the updated `next.config.ts` with CORS headers
2. Invalidate CloudFront cache:
   ```bash
   aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/_next/static/media/*"
   ```

## Testing

After making changes:

1. Clear browser cache
2. Test font loading:
   ```bash
   curl -I https://d3rdbmhyjxa9r8.cloudfront.net/_next/static/media/569ce4b8f30dc480-s.p.woff2 \
     -H "Origin: https://cache2.bring-me-home.com"
   ```

Look for:
- `Access-Control-Allow-Origin: *` or `Access-Control-Allow-Origin: https://cache2.bring-me-home.com`

## Long-term Solution

Consider restructuring your setup:
- Use CloudFront for everything (not just static assets)
- Or use a single domain for both app and assets
- This eliminates CORS complexity entirely