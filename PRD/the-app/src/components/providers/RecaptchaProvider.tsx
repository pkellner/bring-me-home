'use client';

import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

const debugCaptcha = process.env.NEXT_PUBLIC_DEBUG_RECAPTCHA === 'true';

interface RecaptchaProviderProps {
  children: React.ReactNode;
}

export default function RecaptchaProvider({ children }: RecaptchaProviderProps) {
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  if (debugCaptcha) {
    console.log('[RecaptchaProvider] Initializing with site key:', recaptchaSiteKey ? `${recaptchaSiteKey.substring(0, 10)}...` : 'NOT SET');
    console.log('[RecaptchaProvider] Environment:', process.env.NODE_ENV);
    console.log('[RecaptchaProvider] Host:', typeof window !== 'undefined' ? window.location.host : 'SSR');
  }

  if (!recaptchaSiteKey) {
    console.warn('reCAPTCHA site key not found. Add NEXT_PUBLIC_RECAPTCHA_SITE_KEY to your .env file');
    return <>{children}</>;
  }

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={recaptchaSiteKey}
      scriptProps={{
        async: true,
        defer: true,
        appendTo: 'head',
        nonce: undefined,
      }}
    >
      {children}
    </GoogleReCaptchaProvider>
  );
}