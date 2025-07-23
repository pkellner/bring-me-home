import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    return NextResponse.json({
      sessionExists: !!session,
      user: session?.user ? {
        id: session.user.id,
        username: session.user.username,
        email: session.user.email,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        roles: session.user.roles,
        townAccess: session.user.townAccess,
        personAccess: session.user.personAccess,
      } : null,
      expires: session?.expires,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get session',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}