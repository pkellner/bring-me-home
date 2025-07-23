'use client';

import TownPageClient from './TownPageClient';

interface TownPageWrapperProps {
  townSlug: string;
}

export default function TownPageWrapper({ townSlug }: TownPageWrapperProps) {
  // Get spinner delay from public env var or use default
  const spinnerDelay = process.env.NEXT_PUBLIC_SPINNER_DELAY_MS 
    ? parseInt(process.env.NEXT_PUBLIC_SPINNER_DELAY_MS) 
    : 500;
    
  return (
    <TownPageClient
      townSlug={townSlug}
      spinnerDelay={spinnerDelay}
    />
  );
}