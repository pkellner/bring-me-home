import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMemoryCache } from '@/lib/cache/cache-manager';

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

    // Clear memory cache
    const memoryCache = await getMemoryCache();
    await memoryCache.reset();

    return NextResponse.json({
      message: 'Memory cache cleared successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error clearing memory cache:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}