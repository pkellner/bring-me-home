# Google reCAPTCHA v3 Setup

This application uses Google reCAPTCHA v3 (invisible captcha) to protect the comment submission form from bots.

## Environment Variables

Add the following to your `.env` or `.env.local` file:

```env
# Google reCAPTCHA v3 Keys
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_site_key_here
RECAPTCHA_SECRET_KEY=your_secret_key_here
```

## Getting Your reCAPTCHA Keys

1. Go to the [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin/create)
2. Sign in with your Google account
3. Fill in the form:
   - **Label**: Choose a name for your site (e.g., "Bring Me Home Production")
   - **reCAPTCHA type**: Select **reCAPTCHA v3**
   - **Domains**: Add your domains:
     - For development: `localhost` (IMPORTANT: Just `localhost`, not `localhost:3000`)
     - For production: Your actual domain(s)
   - Accept the reCAPTCHA Terms of Service
4. Click "Submit"
5. You'll receive two keys:
   - **Site Key**: This goes in `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
   - **Secret Key**: This goes in `RECAPTCHA_SECRET_KEY`

## Localhost Development

When developing on localhost:
- Add `localhost` to your reCAPTCHA domains (without the port number)
- The reCAPTCHA will work on any port (3000, 3001, etc.)
- Make sure both environment variables are set in your `.env.local` file
- If you see "missing-input-secret" errors, double-check your `RECAPTCHA_SECRET_KEY`

## How It Works

1. **Client-side**: When a user submits a comment, the form automatically:
   - Executes reCAPTCHA v3 to get a token
   - Includes this token with the form submission
   - Shows an error if reCAPTCHA fails to load

2. **Server-side**: The comment submission action:
   - Verifies the reCAPTCHA token with Google's API
   - Checks if the score is above 0.5 (configurable)
   - Rejects the submission if verification fails

## Adjusting the Score Threshold

reCAPTCHA v3 returns a score from 0.0 to 1.0, where:
- 1.0 is very likely a good interaction
- 0.0 is very likely a bot

The current threshold is set to 0.5 in `/src/app/actions/comments.ts`. You can adjust this based on your needs:

```typescript
// In verifyRecaptcha function
return data.success && data.score >= 0.5; // Adjust 0.5 as needed
```

Lower values (e.g., 0.3) are more permissive, higher values (e.g., 0.7) are more restrictive.

## Testing

1. **Development**: reCAPTCHA will work on `localhost` if you added it to your domains
2. **Without keys**: The form will show a warning in the console but will still function
3. **Invalid keys**: Users will see an error message when trying to submit

## Monitoring

You can monitor reCAPTCHA performance and adjust settings in the [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin).

## Troubleshooting

- **"reCAPTCHA not loaded"**: Check that `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is set correctly
- **"Security verification failed"**: Check that `RECAPTCHA_SECRET_KEY` is set correctly
- **"missing-input-secret" error**: Your secret key is not being sent correctly - verify `RECAPTCHA_SECRET_KEY` in `.env.local`
- **"invalid-input-secret" error**: Your secret key is incorrect - check for typos
- **"timeout-or-duplicate" error**: The token was already verified or expired - this can happen if form submission is retried
- **Low scores**: Consider adjusting the threshold or checking for legitimate users being blocked

## Debug Mode

The code includes debug logging that can be toggled with `const debugCaptcha = true` in:
- `/src/components/providers/RecaptchaProvider.tsx`
- `/src/components/person/AnonymousCommentForm.tsx`
- `/src/app/actions/comments.ts`

Set these to `false` in production to disable logging.