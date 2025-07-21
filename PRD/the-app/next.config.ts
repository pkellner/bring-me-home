import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Increase from default 1MB to 10MB for image uploads
    },
  },
  // Configure CDN for static assets in production
  assetPrefix: process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_CLOUDFRONT_CDN_URL
    ? process.env.NEXT_PUBLIC_CLOUDFRONT_CDN_URL
    : undefined,
  // Configure CDN rewrite for dynamic routes
  async rewrites() {
    // Only apply rewrites if CDN URL is configured
    if (process.env.NODE_ENV !== 'production' || !process.env.NEXT_PUBLIC_CLOUDFRONT_CDN_URL) {
      return [];
    }
    
    return {
      beforeFiles: [
        // These rewrites are applied before checking the filesystem
        // This ensures CDN serves static assets
        {
          source: '/_next/static/:path*',
          destination: `${process.env.NEXT_PUBLIC_CLOUDFRONT_CDN_URL}/_next/static/:path*`,
        },
        {
          source: '/_next/image',
          destination: `${process.env.NEXT_PUBLIC_CLOUDFRONT_CDN_URL}/_next/image`,
        },
      ],
    };
  },
  // Add cache headers for static assets
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ];
  },
};

export default nextConfig;