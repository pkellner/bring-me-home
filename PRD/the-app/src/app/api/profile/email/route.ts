import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Check if email is already taken by another user
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser && existingUser.id !== session.user.id) {
      return NextResponse.json(
        { error: 'This email is already in use' },
        { status: 400 }
      );
    }
    
    // Update email
    await prisma.user.update({
      where: { id: session.user.id },
      data: { email },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email update error:', error);
    return NextResponse.json(
      { error: 'Failed to update email' },
      { status: 500 }
    );
  }
}