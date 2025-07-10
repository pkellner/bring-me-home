import { NextRequest, NextResponse } from 'next/server';
import { getImage } from '@/lib/image-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: imageId } = await params;

    if (!imageId) {
      return new NextResponse('Image ID is required', { status: 400 });
    }

    // Get image from database
    const imageData = await getImage(imageId);

    if (!imageData) {
      return new NextResponse('Image not found', { status: 404 });
    }

    // Set appropriate headers
    const headers = new Headers();
    headers.set('Content-Type', imageData.mimeType);
    headers.set('Content-Length', imageData.buffer.length.toString());
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    // Return image
    return new NextResponse(imageData.buffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
