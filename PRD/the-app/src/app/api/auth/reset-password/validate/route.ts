import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    // Find the token and check if it's valid
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid password reset link',
      });
    }

    if (resetToken.used) {
      return NextResponse.json({
        valid: false,
        error: 'This password reset link has already been used',
      });
    }

    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json({
        valid: false,
        error: 'This password reset link has expired',
      });
    }

    return NextResponse.json({
      valid: true,
    });
  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to validate token' },
      { status: 500 }
    );
  }
}