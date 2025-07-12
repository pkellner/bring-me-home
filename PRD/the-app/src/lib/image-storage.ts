import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';

const prisma = new PrismaClient();

// Parse image sizing configuration from environment
const getFullImageDimensions = (): { width?: number; height?: number; fit: 'inside' | 'outside' | 'cover' | 'fill' | 'contain' } => {
  // Option 1: Max size (default) - preserves aspect ratio within boundary
  if (process.env.IMAGE_FULL_MAX_SIZE) {
    const maxSize = parseInt(process.env.IMAGE_FULL_MAX_SIZE) || 1200;
    if (!isNaN(maxSize)) {
      return { width: maxSize, height: maxSize, fit: 'inside' };
    }
  }
  
  // Option 2: Fixed width, auto height
  if (process.env.IMAGE_FULL_WIDTH) {
    const width = parseInt(process.env.IMAGE_FULL_WIDTH) || 1200;
    if (!isNaN(width)) {
      return { width, height: undefined, fit: 'inside' };
    }
  }
  
  // Option 3: Fixed height, auto width
  if (process.env.IMAGE_FULL_HEIGHT) {
    const height = parseInt(process.env.IMAGE_FULL_HEIGHT) || 1200;
    if (!isNaN(height)) {
      return { width: undefined, height, fit: 'inside' };
    }
  }
  
  // Default fallback
  return { width: 1200, height: 1200, fit: 'inside' };
};

const fullImageConfig = getFullImageDimensions();
const thumbnailSize = parseInt(process.env.IMAGE_THUMBNAIL_SIZE || '300') || 300;
const fullImageQuality = parseInt(process.env.IMAGE_FULL_QUALITY || '85') || 85;
const thumbnailQuality = parseInt(process.env.IMAGE_THUMBNAIL_QUALITY || '80') || 80;

export interface ImageData {
  buffer: Buffer;
  mimeType: string;
  width?: number;
  height?: number;
}

export interface ProcessedImages {
  fullImage: ImageData;
  thumbnail: ImageData;
}

export async function processAndStoreImage(
  buffer: Buffer
): Promise<{ fullImageId: string; thumbnailImageId: string }> {
  // Process full-size image using environment configuration
  const fullImageBuffer = await sharp(buffer)
    .rotate() // Auto-rotate based on EXIF orientation
    .resize(fullImageConfig.width, fullImageConfig.height, {
      fit: fullImageConfig.fit,
      withoutEnlargement: true,
    })
    .jpeg({ quality: fullImageQuality })
    .toBuffer();

  const fullImageMetadata = await sharp(fullImageBuffer).metadata();

  // Create thumbnail using environment configuration
  const thumbnailBuffer = await sharp(buffer)
    .rotate() // Auto-rotate based on EXIF orientation
    .resize(thumbnailSize, thumbnailSize, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({ quality: thumbnailQuality })
    .toBuffer();

  const thumbnailMetadata = await sharp(thumbnailBuffer).metadata();

  // Store both images in database
  const [fullImage, thumbnailImage] = await Promise.all([
    prisma.imageStorage.create({
      data: {
        data: fullImageBuffer,
        mimeType: 'image/jpeg',
        size: fullImageBuffer.length,
        width: fullImageMetadata.width,
        height: fullImageMetadata.height,
      },
    }),
    prisma.imageStorage.create({
      data: {
        data: thumbnailBuffer,
        mimeType: 'image/jpeg',
        size: thumbnailBuffer.length,
        width: thumbnailMetadata.width,
        height: thumbnailMetadata.height,
      },
    }),
  ]);

  return {
    fullImageId: fullImage.id,
    thumbnailImageId: thumbnailImage.id,
  };
}

export async function getImage(imageId: string): Promise<ImageData | null> {
  const image = await prisma.imageStorage.findUnique({
    where: { id: imageId },
  });

  if (!image) {
    return null;
  }

  return {
    buffer: Buffer.from(image.data),
    mimeType: image.mimeType,
    width: image.width ?? undefined,
    height: image.height ?? undefined,
  };
}

export async function deleteImage(imageId: string): Promise<boolean> {
  try {
    await prisma.imageStorage.delete({
      where: { id: imageId },
    });
    return true;
  } catch {
    return false;
  }
}

export async function processImageBuffer(
  buffer: Buffer,
  type: 'full' | 'thumbnail'
): Promise<ImageData> {
  const processedBuffer = await sharp(buffer)
    .rotate() // Auto-rotate based on EXIF orientation
    .resize(
      type === 'full' ? fullImageConfig.width : thumbnailSize,
      type === 'full' ? fullImageConfig.height : thumbnailSize, 
      {
        fit: type === 'full' ? fullImageConfig.fit : 'cover',
        withoutEnlargement: type === 'full',
        position: 'center',
      }
    )
    .jpeg({ quality: type === 'full' ? fullImageQuality : thumbnailQuality })
    .toBuffer();

  const metadata = await sharp(processedBuffer).metadata();

  return {
    buffer: processedBuffer,
    mimeType: 'image/jpeg',
    width: metadata.width,
    height: metadata.height,
  };
}
