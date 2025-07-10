import { NextResponse } from 'next/server';
import { clearProtectionCookies } from '@/lib/auth-protection';

export async function POST() {
  // Clear all protection cookies
  await clearProtectionCookies();
  
  return NextResponse.json({ success: true });
}