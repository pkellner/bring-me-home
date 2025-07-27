# reCAPTCHA Error Fix Documentation

## Problem
The application was experiencing a "Cannot read properties of undefined (reading 'logging')" error when navigating from person pages (which use reCAPTCHA) to admin forms. This was caused by the Google reCAPTCHA library trying to access properties after the component was unmounted.

## Root Cause
1. reCAPTCHA was being loaded globally through the PersonPageWrapper
2. When navigating away from person pages, the reCAPTCHA script remained in the DOM
3. The script would try to access internal properties (like logging) that were no longer available
4. This caused TypeErrors that disrupted the admin interface

## Solution Implemented

### 1. Enhanced RecaptchaProvider with Cleanup
- Added cleanup logic in `RecaptchaProvider` that runs on unmount
- Removes reCAPTCHA scripts, badge, and global objects
- Uses `useEffect` with pathname dependency to clean up on navigation

### 2. Safe reCAPTCHA Hook
- Created `useRecaptcha` hook that safely wraps reCAPTCHA execution
- Checks for proper initialization before executing
- Provides better error handling and messaging
- Prevents the "logging" error from propagating

### 3. Dynamic Import with No SSR
- Changed RecaptchaProvider to use dynamic import with `ssr: false`
- Prevents hydration mismatches
- Ensures reCAPTCHA only loads client-side

### 4. Admin Page Cleanup
- Added `RecaptchaCleanup` component to admin layout
- Actively removes reCAPTCHA elements when on admin pages
- Runs cleanup immediately and after a delay to catch async elements

### 5. Error Boundary
- Added `ErrorBoundary` component that catches reCAPTCHA errors
- Special handling for reCAPTCHA errors - allows app to continue
- Wraps admin layout to prevent errors from breaking the UI

## Files Modified

1. `/src/components/providers/RecaptchaProvider.tsx` - Added cleanup logic
2. `/src/hooks/useRecaptcha.ts` - New safe wrapper hook
3. `/src/components/person/AnonymousCommentForm.tsx` - Updated to use safe hook
4. `/src/app/[townSlug]/[personSlug]/PersonPageWrapper.tsx` - Dynamic import
5. `/src/components/ErrorBoundary.tsx` - New error boundary component
6. `/src/components/admin/RecaptchaCleanup.tsx` - New cleanup component
7. `/src/app/admin/layout.tsx` - Added error boundary and cleanup

## How It Works

1. **Isolation**: reCAPTCHA is only loaded on person pages through PersonPageWrapper
2. **Cleanup**: When navigating away, multiple cleanup mechanisms ensure scripts are removed
3. **Error Handling**: If errors still occur, they're caught and handled gracefully
4. **Admin Protection**: Admin pages actively clean up any lingering reCAPTCHA elements

## Testing

1. Navigate to a person page and verify reCAPTCHA loads
2. Submit a comment to ensure reCAPTCHA works
3. Navigate to admin pages and verify no console errors
4. Type in admin forms and verify no "logging" errors
5. Navigate back to person pages and verify reCAPTCHA still works

## Future Improvements

1. Consider using a reCAPTCHA library with better cleanup support
2. Implement reCAPTCHA lazy loading only when comment form is visible
3. Add monitoring for reCAPTCHA errors in production