import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'No session found' }, { status: 401 });
  }
  
  return NextResponse.json({
    session: {
      user: {
        id: session.user.id,
        username: session.user.username,
        email: session.user.email,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        roles: session.user.roles,
        townAccess: session.user.townAccess,
        personAccess: session.user.personAccess,
      },
      expires: session.expires,
    }
  });
}