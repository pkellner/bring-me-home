import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isSiteAdmin } from '@/lib/permissions';

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { email, userId } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Determine which user to update
    let targetUserId = session.user.id;
    
    // If userId is provided, check if the user is an admin
    if (userId && userId !== session.user.id) {
      if (!isSiteAdmin(session)) {
        return NextResponse.json(
          { error: 'Unauthorized to update other users' },
          { status: 403 }
        );
      }
      targetUserId = userId;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Check if the target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });
    
    if (!targetUser) {
      console.error('User not found:', targetUserId);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if email is already taken by another user
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser && existingUser.id !== targetUserId) {
      return NextResponse.json(
        { error: 'This email is already in use' },
        { status: 400 }
      );
    }
    
    // Update email
    await prisma.user.update({
      where: { id: targetUserId },
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