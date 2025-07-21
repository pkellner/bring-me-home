'use server';

import { cacheInvalidation } from '@/lib/cache';

// Call this after updating person data
export async function invalidatePersonCache(
  townSlug: string,
  personSlug: string,
  personId: string
) {
  await cacheInvalidation.person(townSlug, personSlug, personId);
}

// Call this after approving/updating comments
export async function invalidateCommentsCache(personId: string) {
  await cacheInvalidation.comments(personId);
}

// Call this after updating system config
export async function invalidateSystemCache() {
  await cacheInvalidation.systemConfig();
}