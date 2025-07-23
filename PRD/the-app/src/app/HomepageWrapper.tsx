'use client';

import HomepageClient from './HomepageClient';

export default function HomepageWrapper() {
  // Get spinner delay from public env var or use default
  const spinnerDelay = process.env.NEXT_PUBLIC_SPINNER_DELAY_MS 
    ? parseInt(process.env.NEXT_PUBLIC_SPINNER_DELAY_MS) 
    : 500;
    
  return (
    <HomepageClient
      spinnerDelay={spinnerDelay}
    />
  );
}