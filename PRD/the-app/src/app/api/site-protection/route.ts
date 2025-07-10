import { NextRequest, NextResponse } from 'next/server';
import { verifySiteProtection, setSiteProtectionCookie } from '@/lib/auth-protection';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    const isValid = await verifySiteProtection(password);

    if (isValid) {
      await setSiteProtectionCookie();
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Site protection error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}