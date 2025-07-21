'use client';

import PersonPageClient from './PersonPageClient';

interface PersonPageWrapperProps {
  townSlug: string;
  personSlug: string;
}

export default function PersonPageWrapper({ townSlug, personSlug }: PersonPageWrapperProps) {
  // Get spinner delay from public env var or use default
  const spinnerDelay = process.env.NEXT_PUBLIC_SPINNER_DELAY_MS 
    ? parseInt(process.env.NEXT_PUBLIC_SPINNER_DELAY_MS) 
    : 1000;
    
  return (
    <PersonPageClient
      townSlug={townSlug}
      personSlug={personSlug}
      adminLinkDelay={5}
      spinnerDelay={spinnerDelay}
    />
  );
}