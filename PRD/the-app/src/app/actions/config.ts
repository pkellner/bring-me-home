'use server';

import { getSystemLayoutTheme } from './systemConfig';

/**
 * Server function to provide public configuration information
 * This is specifically for the /configs page and contains no sensitive data
 */
export async function getPublicConfig() {
  // Get system config overrides if they exist
  const systemOverrides = await getSystemLayoutTheme();

  return {
    // Build information
    build: {
      version: process.env.RELEASEVERSION || '0',
      date: process.env.RELEASEDATE || 'Not set',
      dateISO: process.env.RELEASEDATEISO || 'Not set',
      publicDate: process.env.NEXT_PUBLIC_RELEASEDATE || 'Not set',
    },

    // Environment info
    environment: {
      mode: process.env.NODE_ENV || 'development',
      platform: process.platform,
      nodeVersion: process.version,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
    },

    // Feature flags
    features: {
      videoSupport: false,
      bulkOperations: true,
      advancedSearch: false,
      socialSharing: true,
      commentModeration: true,
      imageUpload: true,
    },

    // Public limits and configuration
    limits: {
      maxFileUploadSize: '5MB',
      maxFileUploadBytes: 5 * 1024 * 1024,
      allowedImageTypes: ['JPEG', 'PNG', 'WebP'],
      allowedImageMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      commentsPerPage: 10,
      personsPerPage: 20,
      maxCommentLength: 5000,
      maxStoryLength: 10000,
    },

    // API information
    api: {
      version: '1.0',
      endpoints: {
        towns: '/api/towns',
        persons: '/api/persons',
        comments: '/api/comments',
      },
    },

    // Layout and Theme defaults (with system config override)
    layoutTheme: {
      systemDefaultLayout: systemOverrides.layout,
      systemDefaultTheme: systemOverrides.theme,
      availableLayouts: [
        'grid',
        'stack',
        'hero',
        'sidebar-left',
        'sidebar-right',
        'magazine',
        'card',
        'minimal',
        'gallery',
        'full-width',
      ],
      availableThemes: [
        'default',
        'ocean',
        'forest',
        'sunset',
        'night',
        'warm',
        'cool',
        'earth',
        'sky',
        'custom',
      ],
    },

    // Application metadata
    application: {
      name: 'Bring Me Home',
      description: 'Community platform for finding missing persons',
      supportEmail: process.env.ADMIN_EMAIL || 'support@example.com',
      github: 'https://github.com/anthropics/bring-me-home',
    },

    // Image serving configuration
    imageServing: {
      storageType: process.env.IMAGE_STORAGE_TYPE || 'database',
      s3DirectServing: process.env.AWS_SERVER_IMAGES_FROM_S3_DIRECTLY === 'true',
      s3Bucket: process.env.AWS_S3_BUCKET ? 'Configured' : 'Not configured',
      s3Region: process.env.AWS_S3_REGION || 'Not configured',
    },

    // Timestamp of when this config was generated
    generated: new Date().toISOString(),
  };
}

export type PublicConfig = Awaited<ReturnType<typeof getPublicConfig>>;
