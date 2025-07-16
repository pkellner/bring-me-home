// Edge-compatible version of auth protection (no crypto module)
import { NextRequest } from 'next/server';

// Cookie names
export const SITE_PROTECTION_COOKIE = 'site-protection-auth';

// Simple hash function for Edge Runtime
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Check site protection from request (Edge compatible)
export function checkSiteProtectionFromRequest(request: NextRequest): boolean {
  if (process.env.SITE_PROTECTION_ENABLED !== 'true') {
    return true;
  }

  const cookie = request.cookies.get(SITE_PROTECTION_COOKIE);
  if (!cookie) return false;

  // Simple validation - in production, use a proper JWT or similar
  const expectedValue = simpleHash(
    'site-protected' + (process.env.NEXTAUTH_SECRET || '')
  );
  return cookie.value === expectedValue;
}
