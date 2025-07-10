import { NextResponse } from 'next/server';
import { shouldShowSystemOverrideCredentials } from '@/lib/auth-protection';

export async function GET() {
  return NextResponse.json({
    showCredentials: shouldShowSystemOverrideCredentials(),
  });
}
