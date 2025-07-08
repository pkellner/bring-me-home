import sharp from 'sharp';
import { join } from 'path';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

const DEFAULT_THUMBNAIL_OPTIONS: ThumbnailOptions = {
  width: 300,
  height: 300,
  quality: 80,
  format: 'webp',
};

const DEFAULT_FULL_IMAGE_OPTIONS: ThumbnailOptions = {
  width: 1200,
  height: 1200,
  quality: 85,
  format: 'webp',
};

export async function generateThumbnail(
  inputBuffer: Buffer,
  options: ThumbnailOptions = {}
): Promise<Buffer> {
  const opts = { ...DEFAULT_THUMBNAIL_OPTIONS, ...options };

  return await sharp(inputBuffer)
    .resize(opts.width, opts.height, {
      fit: 'cover',
      position: 'center',
    })
    .toFormat(opts.format!, { quality: opts.quality })
    .toBuffer();
}

export async function optimizeImage(
  inputBuffer: Buffer,
  options: ThumbnailOptions = {}
): Promise<Buffer> {
  const opts = { ...DEFAULT_FULL_IMAGE_OPTIONS, ...options };

  return await sharp(inputBuffer)
    .resize(opts.width, opts.height, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .toFormat(opts.format!, { quality: opts.quality })
    .toBuffer();
}

export async function getImageDimensions(
  buffer: Buffer
): Promise<ImageDimensions> {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
}

export async function validateImageBuffer(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(buffer).metadata();
    return !!(metadata.width && metadata.height && metadata.format);
  } catch {
    return false;
  }
}

export async function saveImageWithThumbnail(
  buffer: Buffer,
  personId: string,
  filename: string
): Promise<{ fullPath: string; thumbnailPath: string }> {
  const uploadDir = join(
    process.cwd(),
    'public',
    'uploads',
    'persons',
    personId
  );
  const thumbnailDir = join(uploadDir, 'thumbnails');

  // Ensure directories exist
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }
  if (!existsSync(thumbnailDir)) {
    await mkdir(thumbnailDir, { recursive: true });
  }

  // Generate optimized full image
  const fullImageBuffer = await optimizeImage(buffer);
  const fullImagePath = join(uploadDir, filename);

  // Generate thumbnail
  const thumbnailBuffer = await generateThumbnail(buffer);
  const thumbnailPath = join(thumbnailDir, filename);

  // Import writeFile dynamically to avoid circular dependency
  const { writeFile } = await import('fs/promises');

  // Save both images
  await writeFile(fullImagePath, fullImageBuffer);
  await writeFile(thumbnailPath, thumbnailBuffer);

  return {
    fullPath: `/uploads/persons/${personId}/${filename}`,
    thumbnailPath: `/uploads/persons/${personId}/thumbnails/${filename}`,
  };
}
