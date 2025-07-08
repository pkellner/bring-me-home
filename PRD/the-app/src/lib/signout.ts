'use client';

import { signOut } from 'next-auth/react';

/**
 * Robust signout function that ensures user is redirected to home page
 * regardless of where they are in the application
 */
export async function performSignOut() {
  try {
    // Attempt to sign out with NextAuth
    await signOut({
      callbackUrl: '/',
      redirect: false, // We'll handle redirect manually
    });

    // Force a hard redirect to home page after a short delay
    setTimeout(() => {
      window.location.href = '/';
    }, 100);
  } catch (error) {
    console.error('Signout error:', error);

    // Even if signOut fails, force redirect to clear session
    window.location.href = '/';
  }
}

/**
 * Alternative signout function that forces immediate redirect
 * Use this as a backup if the main signout doesn't work
 */
export function forceSignOutRedirect() {
  // Clear any local storage or session storage if needed
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    // Ignore storage errors
  }

  // Force immediate redirect
  window.location.href = '/';
}
