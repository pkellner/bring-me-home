import { prisma } from '@/lib/prisma';

// Cache for configuration values
let configCache: Record<string, string> = {};
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getConfig(key: string): Promise<string | null> {
  // Skip database queries during build phase
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return null;
  }

  // Check if cache is still valid
  if (Date.now() - cacheTimestamp > CACHE_DURATION) {
    configCache = {};
  }

  // Return from cache if available
  if (configCache[key] !== undefined) {
    return configCache[key];
  }

  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key },
    });

    if (config) {
      configCache[key] = config.value;
      cacheTimestamp = Date.now();
      return config.value;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching config for key ${key}:`, error);
    return null;
  }
}

export async function getConfigs(
  keys: string[]
): Promise<Record<string, string>> {
  const configs: Record<string, string> = {};

  // Skip database queries during build phase
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    // Return empty strings for all keys during build
    return keys.reduce((acc, key) => ({ ...acc, [key]: '' }), {});
  }

  try {
    const dbConfigs = await prisma.systemConfig.findMany({
      where: {
        key: { in: keys },
      },
    });

    for (const config of dbConfigs) {
      configs[config.key] = config.value;
      configCache[config.key] = config.value;
    }

    cacheTimestamp = Date.now();

    // Fill in any missing keys with empty strings
    for (const key of keys) {
      if (!configs[key]) {
        configs[key] = '';
      }
    }

    return configs;
  } catch (error) {
    console.error('Error fetching configs:', error);
    // Return empty strings for all keys on error
    return keys.reduce((acc, key) => ({ ...acc, [key]: '' }), {});
  }
}

// Helper function to replace placeholders in text
export function replaceTextPlaceholders(
  text: string,
  replacements: Record<string, string | number>
): string {
  let result = text;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return result;
}

// Get all site text configuration
export async function getSiteTextConfig() {
  const keys = [
    'site_title',
    'site_tagline',
    'site_description',
    'copyright_text',
    'homepage_cta_title',
    'homepage_cta_text',
    'homepage_cta_button',
    'town_page_title',
    'town_page_subtitle',
    'town_no_detainees_title',
    'town_no_detainees_text',
    'town_info_title',
    'town_info_text',
    'town_info_button',
    'detained_at_label',
    'last_seen_label',
    'view_profile_button',
    'submit_support_button',
    'no_support_text',
    'find_by_location_text',
    'recently_added_text',
    'back_to_home_text',
    'view_other_towns_text',
    'admin_detained_persons_title',
    'admin_add_person_button',
  ];

  return getConfigs(keys);
}
