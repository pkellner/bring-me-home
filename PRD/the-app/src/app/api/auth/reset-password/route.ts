import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Find the token and user
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Invalid password reset link' },
        { status: 400 }
      );
    }

    if (resetToken.used) {
      return NextResponse.json(
        { error: 'This password reset link has already been used' },
        { status: 400 }
      );
    }

    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This password reset link has expired' },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('Password reset debug:');
    console.log('- User ID:', resetToken.userId);
    console.log('- User email:', resetToken.user.email);
    console.log('- Password length:', password.length);
    console.log('- Hash starts with:', hashedPassword.substring(0, 10));

    // Update user password and mark token as used in a transaction
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ]);
    
    console.log('- Password update successful');
    console.log('- Updated user ID:', updatedUser.id);

    // Optional: Delete all other unused tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: resetToken.userId,
        used: false,
        id: { not: resetToken.id },
      },
    });

    return NextResponse.json({ 
      success: true,
      username: resetToken.user.username 
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}