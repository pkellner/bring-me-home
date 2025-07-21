import { NextRequest, NextResponse } from 'next/server';
import { getCachedPersonData } from '@/lib/cache/person-cache';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ townSlug: string; personSlug: string }> }
) {
  try {
    const { townSlug, personSlug } = await params;
    
    // Check for cache control headers
    const forceRefresh = request.headers.get('cache-control') === 'no-cache';
    
    // Get cached data
    const result = await getCachedPersonData(townSlug, personSlug, {
      forceRefresh,
    });

    if (!result.data) {
      return NextResponse.json(
        { error: 'Person not found' },
        { status: 404 }
      );
    }

    // Add cache metadata to response headers
    const response = NextResponse.json(result.data);
    response.headers.set('X-Cache-Source', result.source);
    response.headers.set('X-Cache-Latency', result.latency.toString());
    
    // Add cache control headers
    if (!forceRefresh) {
      response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    }

    return response;
  } catch (error) {
    console.error('Error fetching person data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}