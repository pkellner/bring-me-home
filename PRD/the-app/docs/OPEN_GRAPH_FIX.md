# Open Graph Image Fix Guide

## Problem
The Open Graph images are broken on production because the `NEXT_PUBLIC_APP_URL` environment variable is set to `localhost:3001` instead of the production URL.

## Solution

### For Production Deployment

1. **Update Environment Variables**
   Set the following environment variable in your production environment:
   ```
   PRODUCTION_URL=https://bring-me-home.com
   ```
   
   Note: The app now uses `PRODUCTION_URL` in production environments, which takes precedence over `NEXT_PUBLIC_APP_URL`. This allows you to have different URLs for local development and production.

2. **Deployment Platforms**
   
   **Vercel:**
   - Go to your project settings
   - Navigate to Environment Variables
   - Add `PRODUCTION_URL` with value `https://bring-me-home.com`
   - Redeploy your application

   **Other Platforms:**
   - Update your `.env.production` file (created in this project)
   - Or set the environment variable in your hosting platform's dashboard

3. **Verify the Fix**
   After deployment, test your Open Graph tags using:
   - https://www.opengraph.xyz/url/https%3A%2F%2Fbring-me-home.com
   - https://developers.facebook.com/tools/debug/
   - https://cards-dev.twitter.com/validator

## How Open Graph Works in This App

1. **Site-wide OG Image** (`/opengraph-image`):
   - Generated dynamically using Next.js OG Image Generation
   - Shows site title with gradient background
   - URL: `https://bring-me-home.com/opengraph-image`

2. **Person-specific OG Images** (`/[townSlug]/[personSlug]/opengraph-image`):
   - Dynamic images for each person's page
   - Shows person's photo, name, and hometown
   - Uses theme colors from the person or town

## Important Notes

- The `PRODUCTION_URL` must be an absolute URL (including https://)
- In production, `PRODUCTION_URL` takes precedence over `NEXT_PUBLIC_APP_URL`
- This variable is used to generate the `metadataBase` in Next.js
- Without it, all Open Graph URLs will be relative and won't work when shared
- For local development, `NEXT_PUBLIC_APP_URL` is still used

## Testing Locally

To test Open Graph tags locally:
1. Set `NEXT_PUBLIC_APP_URL=http://localhost:3000` in `.env`
2. Run `npm run build && npm run start`
3. Use the included `test-og-tags.html` file to preview