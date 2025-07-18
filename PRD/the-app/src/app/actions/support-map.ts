'use server';

export async function isSupportMapEnabled(isSiteAdmin: boolean = false): Promise<boolean> {
  // If ENABLE_SUPPORT_MAP is true, map is enabled for everyone
  if (process.env.ENABLE_SUPPORT_MAP === 'true') {
    return true;
  }
  
  // If ENABLE_SUPPORT_MAP is false, check if site-admin-only mode is enabled
  if (process.env.ENABLE_SUPPORT_MAP_ADMIN === 'true' && isSiteAdmin) {
    return true;
  }
  
  // Otherwise, map is disabled
  return false;
}