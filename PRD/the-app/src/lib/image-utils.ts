import sharp from 'sharp';

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

export interface ProcessedImages {
  fullImage: Buffer;
  thumbnail: Buffer;
}

const DEFAULT_THUMBNAIL_OPTIONS: ThumbnailOptions = {
  width: 300,
  height: 300,
  quality: 80,
  format: 'jpeg',
};

const DEFAULT_FULL_IMAGE_OPTIONS: ThumbnailOptions = {
  width: 1200,
  height: 1200,
  quality: 85,
  format: 'jpeg',
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

export async function processImageForStorage(
  buffer: Buffer
): Promise<ProcessedImages> {
  // Generate optimized full image (JPEG)
  const fullImage = await optimizeImage(buffer, { format: 'jpeg' });

  // Generate thumbnail (JPEG)
  const thumbnail = await generateThumbnail(buffer, { format: 'jpeg' });

  return {
    fullImage,
    thumbnail,
  };
}
