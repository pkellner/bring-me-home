import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import sharp from 'sharp';
import { ImageStorageService } from '@/lib/image-storage';

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
      timestamp: string;
    }>
  }
) {
  try {
    const { id } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters
    const width = searchParams.get('w') ? parseInt(searchParams.get('w')!) : undefined;
    const height = searchParams.get('h') ? parseInt(searchParams.get('h')!) : undefined;
    const quality = searchParams.get('q') ? parseInt(searchParams.get('q')!) : 85;
    const format = searchParams.get('f') as 'jpeg' | 'webp' | 'png' | undefined;
    
    // Validate parameters
    if (width && (width < 1 || width > 4000)) {
      return NextResponse.json({ error: 'Invalid width' }, { status: 400 });
    }
    if (height && (height < 1 || height > 4000)) {
      return NextResponse.json({ error: 'Invalid height' }, { status: 400 });
    }
    if (quality < 1 || quality > 100) {
      return NextResponse.json({ error: 'Invalid quality' }, { status: 400 });
    }

    // Use ImageStorageService to retrieve the image
    const imageStorageService = new ImageStorageService(prisma);
    const imageData = await imageStorageService.getImage(id);

    if (!imageData) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }
    
    // Get metadata for cache headers
    const imageMetadata = await prisma.imageStorage.findUnique({
      where: { id },
      select: { updatedAt: true },
    });
    
    if (!imageMetadata) {
      return NextResponse.json({ error: 'Image metadata not found' }, { status: 404 });
    }

    // Set up Sharp for image processing
    let sharpInstance = sharp(imageData.buffer);

    // Apply resizing if width or height is specified
    if (width || height) {
      sharpInstance = sharpInstance.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Convert to specified format or keep original
    const outputFormat = format || 'jpeg';
    let processedBuffer: Buffer;
    let contentType: string;

    switch (outputFormat) {
      case 'webp':
        processedBuffer = await sharpInstance.webp({ quality }).toBuffer();
        contentType = 'image/webp';
        break;
      case 'png':
        processedBuffer = await sharpInstance.png({ quality }).toBuffer();
        contentType = 'image/png';
        break;
      default:
        processedBuffer = await sharpInstance.jpeg({ quality }).toBuffer();
        contentType = 'image/jpeg';
    }

    // Set cache headers - cache for 1 year since we use timestamp for cache busting
    const headers = new Headers({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Last-Modified': imageMetadata.updatedAt.toUTCString(),
    });

    return new NextResponse(processedBuffer, { headers });
  } catch (error) {
    console.error('Error serving image:', error);
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    );
  }
}