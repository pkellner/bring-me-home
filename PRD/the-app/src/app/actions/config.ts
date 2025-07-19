'use server';

import { getSystemLayoutTheme } from './systemConfig';
import { EMAIL_TYPES, getEmail, getEmailEnvConfig } from '@/config/emails';

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
      googleAnalytics: Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID),
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
      supportEmail: getEmail(EMAIL_TYPES.SUPPORT),
      helpEmail: getEmail(EMAIL_TYPES.HELP),
      privacyEmail: getEmail(EMAIL_TYPES.PRIVACY),
      conductEmail: getEmail(EMAIL_TYPES.CONDUCT),
      github: 'https://github.com/anthropics/bring-me-home',
    },

    // Image serving configuration
    imageServing: {
      storageType: process.env.IMAGE_STORAGE_TYPE || 'database',
      s3DirectServing: process.env.NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY === 'true',
      s3Bucket: process.env.AWS_S3_BUCKET ? 'Configured' : 'Not configured',
      s3Region: process.env.AWS_S3_REGION || 'Not configured',
    },

    // Email configuration
    emailConfig: {
      emails: {
        support: {
          type: EMAIL_TYPES.SUPPORT,
          envVar: 'ADMIN_EMAIL',
          currentValue: getEmail(EMAIL_TYPES.SUPPORT),
          description: 'General support and admin contact email',
        },
        help: {
          type: EMAIL_TYPES.HELP,
          envVar: 'HELP_EMAIL',
          currentValue: getEmail(EMAIL_TYPES.HELP),
          description: 'Email for families to request profile listings',
        },
        privacy: {
          type: EMAIL_TYPES.PRIVACY,
          envVar: 'PRIVACY_EMAIL',
          currentValue: getEmail(EMAIL_TYPES.PRIVACY),
          description: 'Email for privacy-related inquiries',
        },
        conduct: {
          type: EMAIL_TYPES.CONDUCT,
          envVar: 'CONDUCT_EMAIL',
          currentValue: getEmail(EMAIL_TYPES.CONDUCT),
          description: 'Email for reporting code of conduct violations',
        },
      },
      envExample: getEmailEnvConfig().map(config => ({
        ...config,
        exampleLine: `${config.name}="${config.defaultValue}"`,
      })),
    },

    // Analytics configuration
    analytics: {
      googleAnalytics: {
        enabled: Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID),
        measurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'Not configured',
        productionOnly: true,
      },
    },

    // Timestamp of when this config was generated
    generated: new Date().toISOString(),
  };
}

export type PublicConfig = Awaited<ReturnType<typeof getPublicConfig>>;
