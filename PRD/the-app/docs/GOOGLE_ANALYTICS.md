# Google Analytics Implementation

## Overview

Google Analytics 4 (GA4) has been integrated into the Bring Me Home application to track user interactions and provide insights into how visitors engage with the platform. The implementation follows Next.js and privacy best practices.

## Implementation Details

### 1. Environment Configuration

The Google Analytics Measurement ID is stored as an environment variable:

```env
# .env
NEXT_PUBLIC_GA_MEASUREMENT_ID="G-D35Y587JHD"
```

**Important**: The `NEXT_PUBLIC_` prefix is required for the variable to be accessible in client-side code.

### 2. Core Components

#### GoogleAnalytics Component (`/src/components/GoogleAnalytics.tsx`)
- Loads the Google Analytics script using Next.js `Script` component
- Only loads in production environment
- Uses `afterInteractive` strategy for optimal performance
- Automatically disabled in development

#### Analytics Provider (`/src/components/AnalyticsProvider.tsx`)
- Tracks page views on route changes
- Uses Next.js navigation hooks (`usePathname`, `useSearchParams`)
- Automatically sends pageview events when users navigate

#### Analytics Helper Library (`/src/lib/gtag.ts`)
- Provides TypeScript-safe functions for tracking events
- Includes helper functions for common events:
  - `pageview()` - Track page views
  - `event()` - Track custom events
  - `trackButtonClick()` - Track button interactions
  - `trackFormSubmission()` - Track form submissions
  - `trackSupportAction()` - Track support messages and anonymous support

### 3. Integration Points

#### Root Layout (`/src/app/layout.tsx`)
Both the `GoogleAnalytics` component and `AnalyticsProvider` are included in the root layout to ensure they're available on all pages:

```tsx
<GoogleAnalytics />
<Providers session={session}>
  <AnalyticsProvider />
  {children}
</Providers>
```

#### Support Section
The support section tracks two key user actions:
1. **Anonymous Support**: When users click the anonymous support button
2. **Message Submission**: When users submit a support message

### 4. Events Tracked

The following events are automatically tracked:

| Event | Category | Action | Label | When Triggered |
|-------|----------|--------|-------|----------------|
| Page View | - | pageview | URL path | On every page navigation |
| Anonymous Support | Support | anonymous_support | Person ID | When anonymous support is clicked |
| Message Support | Support | message | Person ID | When a support message is submitted |

### 5. Privacy Considerations

- Analytics only loads in production (not in development)
- No personally identifiable information (PII) is sent to GA
- Only tracks aggregate data and user interactions
- Respects user privacy by using GA4's privacy-focused features

## Testing

### Development Testing
Analytics is disabled in development by default. To test in development:

1. Temporarily modify the GoogleAnalytics component to remove the production check:
   ```tsx
   // Comment out: process.env.NODE_ENV !== 'production'
   if (!GA_MEASUREMENT_ID) {
     return null;
   }
   ```

2. Open browser developer tools and check:
   - Network tab: Look for `gtag/js` script loading
   - Console: Look for gtag configuration calls

3. **Remember to revert the changes before committing!**

### Production Testing
1. Deploy to production
2. Open Google Analytics Real-Time reports
3. Navigate the site and verify events appear
4. Check that page views and custom events are tracked

## Adding New Events

To track new events:

1. Import the gtag library:
   ```tsx
   import * as gtag from '@/lib/gtag';
   ```

2. Call the appropriate tracking function:
   ```tsx
   // Track a button click
   gtag.trackButtonClick('header_login', 'navigation');
   
   // Track a custom event
   gtag.event({
     action: 'share',
     category: 'Social',
     label: 'Twitter',
     value: 1
   });
   ```

3. Add TypeScript types if creating new helper functions in `gtag.ts`

## Troubleshooting

### Analytics Not Loading
1. Check that `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set in `.env`
2. Verify you're testing in production or have disabled the production check
3. Check browser console for errors
4. Ensure ad blockers are disabled

### Events Not Tracking
1. Check Google Analytics Real-Time reports
2. Verify the measurement ID is correct
3. Check browser Network tab for gtag requests
4. Look for console errors

### Type Errors
The `window.gtag` type is declared globally in `gtag.ts`. If you encounter type errors, ensure you're importing the gtag library.

## Best Practices

1. **Don't track PII**: Never send personal information to GA
2. **Use descriptive labels**: Make events easy to understand in reports
3. **Test thoroughly**: Always verify events work before deploying
4. **Document new events**: Update this documentation when adding tracking
5. **Consider performance**: Don't over-track; focus on meaningful interactions

## Google Analytics Dashboard

Access analytics at: https://analytics.google.com

Key reports to monitor:
- **Real-Time**: See current activity
- **Engagement > Events**: View custom events
- **Engagement > Pages**: See page view metrics
- **User > Demographics**: Understand your audience

## Future Enhancements

Consider adding:
- Enhanced ecommerce tracking (if donations are added)
- Custom dimensions for user roles
- Conversion tracking for key goals
- A/B testing integration
- User timing tracking for performance metrics