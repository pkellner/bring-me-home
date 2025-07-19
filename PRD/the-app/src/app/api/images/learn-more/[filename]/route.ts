import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
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

    // Validate filename (prevent directory traversal)
    if (!filename.match(/^[\w-]+\.(png|jpg|jpeg|webp)$/i)) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    // Read the image from the public directory
    const imagePath = join(process.cwd(), 'public', 'images', 'learn-more', filename);
    
    try {
      const imageBuffer = await readFile(imagePath);
      
      // Process image with sharp if transformations are requested
      let processedImage = sharp(imageBuffer);
      
      if (width || height) {
        processedImage = processedImage.resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }
      
      // Set format if specified
      if (format) {
        processedImage = processedImage.toFormat(format, { quality });
      } else {
        // Auto-detect format based on file extension
        const ext = filename.split('.').pop()?.toLowerCase();
        if (ext === 'jpg' || ext === 'jpeg') {
          processedImage = processedImage.jpeg({ quality });
        } else if (ext === 'png') {
          processedImage = processedImage.png({ quality });
        } else if (ext === 'webp') {
          processedImage = processedImage.webp({ quality });
        }
      }
      
      const outputBuffer = await processedImage.toBuffer();
      
      // Determine content type
      let contentType = 'image/jpeg';
      if (format === 'png' || filename.endsWith('.png')) contentType = 'image/png';
      else if (format === 'webp' || filename.endsWith('.webp')) contentType = 'image/webp';
      
      // Return the image with appropriate headers
      return new NextResponse(outputBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (fileError) {
      console.error('Error reading image file:', fileError);
      return NextResponse.json({ error: 'Image file not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}