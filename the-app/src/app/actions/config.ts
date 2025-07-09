'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function getPublicConfig() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === 'site_admin';

  const config = {
    // Build information
    releaseVersion: process.env.RELEASEVERSION || '0',
    releaseDate: process.env.RELEASEDATE || 'Not set',
    releaseDateISO: process.env.RELEASEDATEISO || 'Not set',
    publicReleaseDate: process.env.NEXT_PUBLIC_RELEASEDATE || 'Not set',
    
    // Environment info
    environment: process.env.NODE_ENV || 'development',
    
    // Feature flags
    features: {
      videoSupport: true,
      bulkOperations: true,
      advancedSearch: false,
      anonymousComments: true,
      wysiwygEditor: true,
      detentionCenters: true,
      liveThemeEditor: true,
    },
    
    // GitHub repository
    githubRepo: process.env.GITHUB_REPO_URL || 'Not configured',
    
    // Image configuration
    imageConfig: {
      uploadMaxSizeMB: parseInt(process.env.IMAGE_UPLOAD_MAX_SIZE_MB || '10'),
      storageMaxSizeKB: parseInt(process.env.IMAGE_STORAGE_MAX_SIZE_KB || '200'),
    },
    
    // Public limits
    limits: {
      maxFileUploadSize: process.env.IMAGE_UPLOAD_MAX_SIZE_MB ? `${process.env.IMAGE_UPLOAD_MAX_SIZE_MB}MB` : '10MB',
      allowedImageTypes: ['JPEG', 'PNG', 'WebP'],
      commentsPerPage: 10,
      personsPerPage: 20,
    },
    
    // System info
    nodeVersion: process.version,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  // Add admin-only configuration
  if (isAdmin) {
    return {
      ...config,
      // reCAPTCHA (admin only)
      recaptcha: {
        siteKey: process.env.GOOGLE_RECAPTCHA_SITE_KEY || 'Not configured',
        configured: !!process.env.GOOGLE_RECAPTCHA_SITE_KEY,
      },
      // Redis configuration (admin only)
      redis: {
        host: process.env.REDIS_HOST || 'Not configured',
        port: process.env.REDIS_PORT || 'Not configured',
        configured: !!process.env.REDIS_HOST,
      },
      // Show if override auth is configured (but not the actual values)
      systemAuth: {
        overrideConfigured: !!process.env.SYSTEM_USERNAME_OVERRIDE,
        siteBlockConfigured: !!process.env.SITE_BLOCK_USERNAME,
      },
      // Default navigation
      navigationDefaults: {
        townDefault: process.env.TOWN_DEFAULT || 'Not set',
        userDefault: process.env.USER_DEFAULT || 'Not set',
      },
    };
  }

  return config;
}