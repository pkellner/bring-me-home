import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

// Cookie names
export const SITE_PROTECTION_COOKIE = 'site-protection-auth';

// Cookie duration (7 days in seconds)
export const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

// Simple hash function (same as edge version for consistency)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Generate a token
function generateToken(data: string): string {
  const secret = process.env.NEXTAUTH_SECRET || 'default-secret';
  return simpleHash(data + secret);
}

// Verify token
function verifyToken(token: string, expectedData: string): boolean {
  const expectedToken = generateToken(expectedData);
  return token === expectedToken;
}

// Site Protection (9.5.2) - Gate to access the entire site
export async function verifySiteProtection(password: string): Promise<boolean> {
  const sitePassword = process.env.SITE_PROTECTION_PASSWORD;
  if (!sitePassword) return true; // No protection if not configured

  return password === sitePassword;
}

export async function setSiteProtectionCookie() {
  const cookieStore = await cookies();
  const token = generateToken('site-protected');

  cookieStore.set(SITE_PROTECTION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

export async function checkSiteProtection(): Promise<boolean> {
  // If site protection is not enabled, allow access
  if (process.env.SITE_PROTECTION_ENABLED !== 'true') {
    return true;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SITE_PROTECTION_COOKIE);

  if (!token) return false;

  try {
    return verifyToken(token.value, 'site-protected');
  } catch {
    return false;
  }
}

export async function clearProtectionCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(SITE_PROTECTION_COOKIE);
}

// Helper for middleware
export function checkSiteProtectionFromRequest(request: NextRequest): boolean {
  if (process.env.SITE_PROTECTION_ENABLED !== 'true') {
    return true;
  }

  const token = request.cookies.get(SITE_PROTECTION_COOKIE);
  if (!token) return false;

  try {
    return verifyToken(token.value, 'site-protected');
  } catch {
    return false;
  }
}
