import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRedisCache } from '@/lib/cache/cache-manager';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // Check if user is authenticated and has site admin access
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only site admins can clear cache
    const isSiteAdmin = session.user.roles?.some(role => role.name === 'site-admin');

    if (!isSiteAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Site admin access required' },
        { status: 403 }
      );
    }

    // Clear Redis cache
    const redisCache = await getRedisCache();
    if (redisCache) {
      await redisCache.reset();
      return NextResponse.json({
        message: 'Redis cache cleared successfully',
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json({
        message: 'Redis cache is not enabled or not available',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error clearing Redis cache:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}