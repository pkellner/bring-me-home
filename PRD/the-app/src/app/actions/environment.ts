'use server';

import { getSystemLayoutTheme } from './systemConfig';

/**
 * Server function to securely provide environment variables to the client
 * Only non-sensitive variables are exposed through this function
 */
export async function getEnvironmentConfig() {
  // Get system config overrides if they exist
  const systemOverrides = await getSystemLayoutTheme();

  return {
    // Version information
    releaseVersion: process.env.RELEASEVERSION || '0',
    releaseDate: process.env.RELEASEDATE || '',
    releaseDateISO: process.env.RELEASEDATEISO || '',
    publicReleaseDate: process.env.NEXT_PUBLIC_RELEASEDATE || '',

    // Public configuration
    appUrl:
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      'http://localhost:3000',
    consoleLogging: process.env.NEXT_PUBLIC_CONSOLE_LOGGING === 'true',
    cloudfrontCdnUrl: process.env.NEXT_PUBLIC_CLOUDFRONT_CDN_URL || '',

    // Application info
    environment: process.env.NODE_ENV || 'development',
    debugMode: process.env.DEBUG_FLAG === 'true',

    // Theme defaults (with system config override)
    systemDefaultTheme: systemOverrides.theme,

    // Feature flags (add more as needed)
    features: {
      videoSupport: false, // Can be controlled by env var later
      bulkOperations: true,
      advancedSearch: false,
    },

    // Public limits/configuration
    config: {
      maxFileUploadSize: 5 * 1024 * 1024, // 5MB
      allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
      commentsPerPage: 10,
      personsPerPage: 20,
    },
  };
}

export type EnvironmentConfig = Awaited<
  ReturnType<typeof getEnvironmentConfig>
>;
