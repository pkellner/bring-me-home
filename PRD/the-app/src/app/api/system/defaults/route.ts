import { NextResponse } from 'next/server';
import { getSystemLayoutTheme } from '@/app/actions/systemConfig';

export async function GET() {
  try {
    const systemDefaults = await getSystemLayoutTheme();
    return NextResponse.json(systemDefaults);
  } catch (error) {
    console.error('Error fetching system defaults:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}