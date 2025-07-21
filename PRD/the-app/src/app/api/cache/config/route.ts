import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check if user is authenticated and has site admin access
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only site admins can view cache config
    const isSiteAdmin = session.user.roles?.some(role => role.name === 'site-admin');

    if (!isSiteAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Site admin access required' },
        { status: 403 }
      );
    }

    // Return cache configuration
    const config = {
      CACHE_MEMORY_ENABLE: process.env.CACHE_MEMORY_ENABLE || 'false',
      CACHE_REDIS_ENABLE: process.env.CACHE_REDIS_ENABLE || 'false',
      CACHE_MEMORY_TTL: process.env.CACHE_MEMORY_TTL || '300',
      CACHE_MEMORY_MAX_SIZE_MB: process.env.CACHE_MEMORY_MAX_SIZE_MB || '100',
      CACHE_MEMORY_CLEANUP_ENABLED: process.env.CACHE_MEMORY_CLEANUP_ENABLED || 'false',
      CACHE_MEMORY_CLEANUP_INTERVAL_MS: process.env.CACHE_MEMORY_CLEANUP_INTERVAL_MS || '60000',
      CACHE_REDIS_TTL: process.env.CACHE_REDIS_TTL || '3600',
      REDIS_HOST: process.env.REDIS_HOST || 'not configured',
      REDIS_PORT: process.env.REDIS_PORT || 'not configured',
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching cache config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}