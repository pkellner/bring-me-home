import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
  }

  try {
    // Check if a user exists with this email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { 
        allowAnonymousComments: true 
      }
    });

    if (!user) {
      // If no user exists, anonymous comments are allowed by default
      return NextResponse.json({ allowAnonymousComments: true });
    }

    return NextResponse.json({ 
      allowAnonymousComments: user.allowAnonymousComments 
    });
  } catch (error) {
    console.error('Error checking email status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { allowAnonymousComments } = body;

    if (typeof allowAnonymousComments !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Update the user's allowAnonymousComments setting
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { allowAnonymousComments },
      select: { 
        id: true,
        allowAnonymousComments: true 
      }
    });

    return NextResponse.json({ 
      success: true,
      allowAnonymousComments: updatedUser.allowAnonymousComments 
    });
  } catch (error) {
    console.error('Error updating anonymous comments preference:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}