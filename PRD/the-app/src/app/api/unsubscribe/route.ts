import { NextRequest, NextResponse } from 'next/server';
import { validateOptOutToken, consumeOptOutToken } from '@/lib/email-opt-out-tokens';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  const action = searchParams.get('action');

  if (!token || !action) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const tokenData = await validateOptOutToken(token);

  if (!tokenData) {
    return NextResponse.json({
      error: 'Invalid or expired token',
      message: 'This opt-out link has expired or is invalid. Please log into your account at bring-me-home.com to manage your email preferences, or use the opt-out link from a more recent email.'
    }, { status: 400 });
  }

  // Get user and person info for display
  const user = await prisma.user.findUnique({
    where: { id: tokenData.userId },
    select: { email: true },
  });

  let person = null;
  if (tokenData.personId) {
    person = await prisma.person.findUnique({
      where: { id: tokenData.personId },
      select: { firstName: true, lastName: true },
    });
  }

  return NextResponse.json({
    valid: true,
    action,
    email: user?.email,
    personName: person ? `${person.firstName} ${person.lastName}` : null,
  });
}

export async function POST(request: NextRequest) {
  const { token } = await request.json();

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  const result = await consumeOptOutToken(token);

  if (!result) {
    return NextResponse.json({
      error: 'Invalid or expired token',
      message: 'This opt-out link has expired or is invalid. Please log into your account at bring-me-home.com to manage your email preferences, or use the opt-out link from a more recent email.'
    }, { status: 400 });
  }

  // Check if user is globally opted out
  const user = await prisma.user.findUnique({
    where: { id: result.userId },
    select: { optOutOfAllEmail: true },
  });

  return NextResponse.json({
    success: true,
    message: result.personId
      ? 'You have been unsubscribed from following this person.'
      : 'You have been unsubscribed from all emails.',
    isGloballyOptedOut: user?.optOutOfAllEmail || false,
  });
}