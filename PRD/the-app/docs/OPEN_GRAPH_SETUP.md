# Open Graph and Social Media Meta Tags Setup

This document describes the implementation of Open Graph (OG) and social media meta tags for the Bring Me Home application, enabling rich previews when links are shared on social media platforms.

## Overview

The application generates dynamic social media preview cards for:
- **Homepage**: Static branded image with site name and tagline
- **Person Pages**: Dynamic images featuring the person's photo, name, and hometown

## Implementation Details

### 1. Meta Tags Configuration

**File**: `/src/app/metadata.ts`

The site metadata includes:
- Open Graph tags (title, description, image, URL)
- Twitter Card tags (large image format)
- Canonical URLs
- Metadata base URL from environment variable

```typescript
export async function generateSiteMetadata(): Promise<Metadata> {
  // Fetches site configuration from database
  // Returns comprehensive metadata including OG and Twitter tags
}
```

### 2. Static OG Image (Homepage)

**File**: `/src/app/opengraph-image/route.tsx`

- Generates a 1200x630px image
- Features gradient background (indigo theme)
- Displays site title and tagline
- Uses Next.js `ImageResponse` API

### 3. Dynamic OG Images (Person Pages)

**File**: `/src/app/[townSlug]/[personSlug]/opengraph-image/route.tsx`

Features:
- Person's photo (or initials if no photo)
- Person's name and hometown
- "As seen on bring-me-home.com" header
- Uses person's theme colors if available
- Falls back to default colors

### 4. Person Page Metadata

**File**: `/src/app/[townSlug]/[personSlug]/page.tsx`

The `generateMetadata` function:
- Creates person-specific titles and descriptions
- Uses person's story for description (first 150 chars)
- Sets Open Graph type as "profile"
- Generates proper URLs for sharing

## Environment Configuration

Required environment variable:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3001  # Change to production URL
```

## Testing Your Implementation

### 1. Direct Image Testing

View OG images directly in your browser:
- Homepage: `http://localhost:3001/opengraph-image`
- Person page: `http://localhost:3001/[townSlug]/[personSlug]/opengraph-image`

### 2. Local Meta Tags Testing

A test utility is provided at `/test-og-tags.html`. Open it in your browser:
```bash
open file:///Users/peterkellner/repos/bring-me-home/PRD/the-app/test-og-tags.html
```

This tool allows you to:
- Test any local URL
- View extracted meta tags
- Preview OG images
- Check both OG and Twitter tags

### 3. Using ngrok for External Testing

To test with real social media debuggers:

```bash
# Install ngrok
brew install ngrok

# Start your dev server
npm run dev

# In another terminal, expose your local server
ngrok http 3001

# Use the ngrok URL in social media debuggers
```

### 4. Social Media Debugging Tools

Once you have a public URL (via ngrok or staging):
- **Facebook**: https://developers.facebook.com/tools/debug/
- **Twitter**: https://cards-dev.twitter.com/validator
- **LinkedIn**: https://www.linkedin.com/post-inspector/
- **Generic OG Tester**: https://www.opengraph.xyz/

## Technical Notes

### Image Generation
- Uses Next.js 15's built-in OG image generation
- No edge runtime (as per requirements)
- Images are generated on-demand and cached

### Database Relations
- Person → PersonImage → ImageStorage
- Themes store colors as JSON strings
- S3 image URLs are generated server-side

### Error Handling
- Missing persons return 404
- Missing images show initials fallback
- Missing themes use default colors

## Troubleshooting

### Common Issues

1. **Images not showing**: 
   - Check NEXT_PUBLIC_APP_URL is set correctly
   - Ensure the build completed successfully
   - Verify image routes are accessible

2. **Wrong colors**:
   - Theme colors are stored as JSON in the `colors` field
   - Parse with `JSON.parse(theme.colors)`
   - Check theme assignment on person/town

3. **Build errors**:
   - Ensure all imports use correct paths
   - Person images relation is `personImages` not `images`
   - Image S3 key is `s3Key` not `s3Url`

## Future Enhancements

Consider adding:
- Different image layouts/templates
- Localized descriptions
- A/B testing different image designs
- Analytics tracking for social shares
- Custom images per social platform

## Related Files

- `/src/app/metadata.ts` - Main metadata configuration
- `/src/lib/image-url-server.ts` - S3 URL generation
- `/src/components/themes/ThemeEditor.tsx` - Theme color management
- `/test-og-tags.html` - Local testing utility