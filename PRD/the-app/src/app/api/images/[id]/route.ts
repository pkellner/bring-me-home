import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: imageId } = await params;

    if (!imageId) {
      return new NextResponse('Image ID is required', { status: 400 });
    }

    // Check if image exists
    const image = await prisma.imageStorage.findUnique({
      where: { id: imageId },
      select: { updatedAt: true },
    });

    if (!image) {
      return new NextResponse('Image not found', { status: 404 });
    }

    // Get current timestamp for cache busting
    const timestamp = image.updatedAt.toISOString().replace(/[:.]/g, '-');
    
    // Get query parameters from original request
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    
    // Redirect to new dynamic image endpoint
    const redirectUrl = `/api/images/${imageId}/${timestamp}${queryString ? `?${queryString}` : ''}`;
    
    return NextResponse.redirect(new URL(redirectUrl, request.url), 301);
  } catch (error) {
    console.error('Error serving image:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
