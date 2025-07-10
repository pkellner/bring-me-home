import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';

const prisma = new PrismaClient();

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
  // Process full-size image (convert to JPEG, max 1200x1200)
  const fullImageBuffer = await sharp(buffer)
    .resize(1200, 1200, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toBuffer();

  const fullImageMetadata = await sharp(fullImageBuffer).metadata();

  // Create thumbnail (300x300 JPEG)
  const thumbnailBuffer = await sharp(buffer)
    .resize(300, 300, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({ quality: 80 })
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
    .resize(type === 'full' ? 1200 : 300, type === 'full' ? 1200 : 300, {
      fit: type === 'full' ? 'inside' : 'cover',
      withoutEnlargement: type === 'full',
      position: 'center',
    })
    .jpeg({ quality: type === 'full' ? 85 : 80 })
    .toBuffer();

  const metadata = await sharp(processedBuffer).metadata();

  return {
    buffer: processedBuffer,
    mimeType: 'image/jpeg',
    width: metadata.width,
    height: metadata.height,
  };
}
