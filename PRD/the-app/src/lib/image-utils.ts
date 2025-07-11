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

// Parse image sizing configuration from environment
const getImageSizeConfig = () => {
  // Option 1: Max size (default) - both dimensions set to same value
  if (process.env.IMAGE_FULL_MAX_SIZE) {
    const maxSize = parseInt(process.env.IMAGE_FULL_MAX_SIZE);
    return { width: maxSize, height: maxSize };
  }
  
  // Option 2: Fixed width, auto height
  if (process.env.IMAGE_FULL_WIDTH) {
    return { width: parseInt(process.env.IMAGE_FULL_WIDTH), height: undefined };
  }
  
  // Option 3: Fixed height, auto width
  if (process.env.IMAGE_FULL_HEIGHT) {
    return { width: undefined, height: parseInt(process.env.IMAGE_FULL_HEIGHT) };
  }
  
  // Default fallback
  return { width: 1200, height: 1200 };
};

const imageDimensions = getImageSizeConfig();

const DEFAULT_THUMBNAIL_OPTIONS: ThumbnailOptions = {
  width: parseInt(process.env.IMAGE_THUMBNAIL_SIZE || '300'),
  height: parseInt(process.env.IMAGE_THUMBNAIL_SIZE || '300'),
  quality: parseInt(process.env.IMAGE_THUMBNAIL_QUALITY || '80'),
  format: 'jpeg',
};

const DEFAULT_FULL_IMAGE_OPTIONS: ThumbnailOptions = {
  width: imageDimensions.width || 1200,
  height: imageDimensions.height || 1200,
  quality: parseInt(process.env.IMAGE_FULL_QUALITY || '85'),
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
