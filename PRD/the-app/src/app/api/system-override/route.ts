import { NextRequest, NextResponse } from 'next/server';
import {
  setSystemOverrideCookie,
  verifySystemOverride,
} from '@/lib/auth-protection';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const isValid = await verifySystemOverride(username, password);

    if (isValid) {
      await setSystemOverrideCookie();
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('System override error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
