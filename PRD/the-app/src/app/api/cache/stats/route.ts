import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { cacheStats } from '@/lib/cache/cache-stats';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check if user is authenticated and has admin access
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin role
    const isAdmin = session.user.roles?.some(role => 
      ['site-admin', 'town-admin', 'person-admin'].includes(role.name)
    );

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get cache statistics
    const stats = cacheStats.getStats();

    return NextResponse.json({
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    // Check if user is authenticated and has admin access
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only site admins can reset cache stats
    const isSiteAdmin = session.user.roles?.some(role => role.name === 'site-admin');

    if (!isSiteAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Reset cache statistics
    cacheStats.reset();

    return NextResponse.json({
      message: 'Cache statistics reset successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error resetting cache stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}