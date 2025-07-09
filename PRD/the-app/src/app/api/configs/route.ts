import { NextResponse } from 'next/server';
import { getPublicConfig } from '@/app/actions/config';

export async function GET() {
  try {
    const config = await getPublicConfig();
    
    return NextResponse.json(config, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Error fetching public config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}