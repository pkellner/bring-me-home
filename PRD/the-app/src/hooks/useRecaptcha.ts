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
      const token = await executeRecaptcha(action);
      return token;
    } catch {
      // Silently handle all reCAPTCHA errors
      // The logging error is harmless - it's a Google reCAPTCHA v3 bug
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