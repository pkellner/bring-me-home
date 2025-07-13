'use client';

import { SessionProvider } from 'next-auth/react';
import { Session } from 'next-auth';
import { EnvironmentProvider } from '@/contexts/EnvironmentContext';
import CookieBanner from '@/components/CookieBanner';

export default function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <EnvironmentProvider>
        {children}
        <CookieBanner />
      </EnvironmentProvider>
    </SessionProvider>
  );
}
