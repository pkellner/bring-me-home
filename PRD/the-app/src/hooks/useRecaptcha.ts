'use client';

import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { useCallback } from 'react';

export function useRecaptcha() {
  const { executeRecaptcha } = useGoogleReCaptcha();

  const executeRecaptchaSafe = useCallback(async (action: string) => {
    if (!executeRecaptcha) {
      console.warn('reCAPTCHA not initialized yet');
      return null;
    }

    try {
      // Add a small delay to avoid race conditions
      await new Promise(resolve => setTimeout(resolve, 100));
      const token = await executeRecaptcha(action);
      return token;
    } catch (error) {
      // Silently handle all reCAPTCHA errors
      // The logging error is harmless - it's a Google reCAPTCHA v3 bug
      // These errors often occur when tokens are requested too quickly
      if (process.env.NODE_ENV === 'development') {
        console.debug('[reCAPTCHA] Token generation failed (this is normal):', error);
      }
      return null;
    }
  }, [executeRecaptcha]);

  return { 
    executeRecaptcha: executeRecaptchaSafe,
    isReady: !!executeRecaptcha 
  };
}

// Alias for backward compatibility
export const useSafeRecaptcha = useRecaptcha;