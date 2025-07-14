import { prisma } from '@/lib/prisma';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import { PrismaStorageAdapter } from './prisma/adapter';
import { S3StorageAdapter } from './s3/adapter';
import {
  ImageStorageAdapter,
  ImageData,
  StoredImage,
  StoreImageOptions,
  PersonImageData,
  DetentionCenterImageData,
  ImageStorageConfig,
} from './types';

// Parse image sizing configuration from environment
const getImageDimensions = (): { width?: number; height?: number; fit: 'inside' | 'outside' | 'cover' | 'fill' | 'contain' } => {
  // Option 1: Max size (default) - preserves aspect ratio within boundary
  if (process.env.IMAGE_MAX_SIZE) {
    const maxSize = parseInt(process.env.IMAGE_MAX_SIZE) || 1200;
    if (!isNaN(maxSize)) {
      return { width: maxSize, height: maxSize, fit: 'inside' };
    }
  }

  // Option 2: Fixed width, auto height
  if (process.env.IMAGE_WIDTH) {
    const width = parseInt(process.env.IMAGE_WIDTH) || 1200;
    if (!isNaN(width)) {
      return { width, height: undefined, fit: 'inside' };
    }
  }

  // Option 3: Fixed height, auto width
  if (process.env.IMAGE_HEIGHT) {
    const height = parseInt(process.env.IMAGE_HEIGHT) || 1200;
    if (!isNaN(height)) {
      return { width: undefined, height, fit: 'inside' };
    }
  }

  // Default fallback
  return { width: 1200, height: 1200, fit: 'inside' };
};

const imageConfig = getImageDimensions();
const imageQuality = parseInt(process.env.IMAGE_QUALITY || '70') || 70;

export class ImageStorageService {
  private adapter: ImageStorageAdapter;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;

    const config = this.getStorageConfig();

    if (config.storageType === 's3' && config.s3Config) {
      this.adapter = new S3StorageAdapter(prisma, config.s3Config);
    } else {
      this.adapter = new PrismaStorageAdapter(prisma);
    }
  }

  private getStorageConfig(): ImageStorageConfig {
    const storageType = (process.env.IMAGE_STORAGE_TYPE || 'database') as 'database' | 's3';

    if (storageType === 's3') {
      const bucket = process.env.AWS_S3_BUCKET;
      const region = process.env.AWS_S3_REGION || 'us-east-1';
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
      const endpoint = process.env.AWS_S3_ENDPOINT;

      if (!bucket || !region || !accessKeyId || !secretAccessKey) {
        throw new Error(
          'S3 configuration incomplete. When IMAGE_STORAGE_TYPE is set to "s3", the following environment variables are required: ' +
          'AWS_S3_BUCKET, AWS_S3_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY'
        );
      }

      return {
        storageType: 's3',
        s3Config: {
          bucket,
          region,
          accessKeyId,
          secretAccessKey,
          endpoint,
        },
      };
    }

    return { storageType: 'database' };
  }

  async processImageBuffer(buffer: Buffer): Promise<ImageData> {
    const processedBuffer = await sharp(buffer)
      .rotate() // Auto-rotate based on EXIF orientation
      .resize(imageConfig.width, imageConfig.height, {
        fit: imageConfig.fit,
        withoutEnlargement: true,
        position: 'center',
      })
      .jpeg({ quality: imageQuality })
      .toBuffer();

    const metadata = await sharp(processedBuffer).metadata();

    return {
      buffer: processedBuffer,
      mimeType: 'image/jpeg',
      size: processedBuffer.length,
      width: metadata.width,
      height: metadata.height,
    };
  }

  async storeImage(
    buffer: Buffer,
    options?: StoreImageOptions
  ): Promise<StoredImage> {
    const processedImage = await this.processImageBuffer(buffer);
    return this.adapter.store(processedImage.buffer, processedImage, options);
  }

  async getImage(imageId: string): Promise<ImageData | null> {
    return this.adapter.retrieve(imageId);
  }

  async deleteImage(imageId: string): Promise<boolean> {
    // Delete all associations first
    await this.prisma.personImage.deleteMany({
      where: { imageId },
    });

    await this.prisma.detentionCenterImage.deleteMany({
      where: { imageId },
    });

    return this.adapter.delete(imageId);
  }

  async imageExists(imageId: string): Promise<boolean> {
    return this.adapter.exists(imageId);
  }

  // Person image management
  async addPersonImage(
    personId: string,
    buffer: Buffer,
    imageType: 'primary' | 'gallery' = 'gallery',
    options?: StoreImageOptions & { sequenceNumber?: number }
  ): Promise<PersonImageData> {
    const storedImage = await this.storeImage(buffer, options);

    // Get the next sequence number if not provided
    let sequenceNumber = options?.sequenceNumber;
    if (sequenceNumber === undefined) {
      const maxSeq = await this.prisma.personImage.aggregate({
        where: { personId },
        _max: { sequenceNumber: true },
      });
      sequenceNumber = (maxSeq._max.sequenceNumber ?? -1) + 1;
    }

    const personImage = await this.prisma.personImage.create({
      data: {
        personId,
        imageId: storedImage.id,
        imageType,
        sequenceNumber,
      },
    });

    return {
      imageId: personImage.imageId,
      personId: personImage.personId,
      imageType: personImage.imageType as 'primary' | 'gallery',
      sequenceNumber: personImage.sequenceNumber,
    };
  }

  async getPersonImages(personId: string): Promise<(PersonImageData & { image: StoredImage })[]> {
    const personImages = await this.prisma.personImage.findMany({
      where: { personId },
      include: { image: true },
      orderBy: [
        { imageType: 'asc' }, // primary images first
        { sequenceNumber: 'asc' },
      ],
    });

    return personImages.map(pi => ({
      imageId: pi.imageId,
      personId: pi.personId,
      imageType: pi.imageType as 'primary' | 'gallery',
      sequenceNumber: pi.sequenceNumber,
      image: {
        id: pi.image.id,
        mimeType: pi.image.mimeType,
        size: pi.image.size,
        width: pi.image.width ?? undefined,
        height: pi.image.height ?? undefined,
        caption: pi.image.caption ?? undefined,
        uploadedById: pi.image.uploadedById ?? undefined,
        storageType: pi.image.storageType as 'database' | 's3',
        createdAt: pi.image.createdAt,
        updatedAt: pi.image.updatedAt,
      },
    }));
  }

  async updatePersonImageSequence(
    personId: string,
    imageId: string,
    newSequenceNumber: number
  ): Promise<void> {
    await this.prisma.personImage.update({
      where: {
        personId_imageId: { personId, imageId },
      },
      data: { sequenceNumber: newSequenceNumber },
    });
  }

  async removePersonImage(personId: string, imageId: string): Promise<boolean> {
    try {
      await this.prisma.personImage.delete({
        where: {
          personId_imageId: { personId, imageId },
        },
      });

      // Check if image is used elsewhere
      const otherUsage = await this.prisma.$transaction([
        this.prisma.personImage.count({ where: { imageId } }),
        this.prisma.detentionCenterImage.count({ where: { imageId } }),
      ]);

      const totalUsage = otherUsage[0] + otherUsage[1];

      // Delete image if no longer used
      if (totalUsage === 0) {
        await this.deleteImage(imageId);
      }

      return true;
    } catch {
      return false;
    }
  }

  // Detention center image management
  async setDetentionCenterImage(
    detentionCenterId: string,
    buffer: Buffer,
    options?: StoreImageOptions
  ): Promise<DetentionCenterImageData> {
    // Delete existing image if any
    const existing = await this.prisma.detentionCenterImage.findUnique({
      where: { detentionCenterId },
    });

    if (existing) {
      await this.removeDetentionCenterImage(detentionCenterId);
    }

    const storedImage = await this.storeImage(buffer, options);

    const dcImage = await this.prisma.detentionCenterImage.create({
      data: {
        detentionCenterId,
        imageId: storedImage.id,
      },
    });

    return {
      imageId: dcImage.imageId,
      detentionCenterId: dcImage.detentionCenterId,
    };
  }

  async getDetentionCenterImage(
    detentionCenterId: string
  ): Promise<(DetentionCenterImageData & { image: StoredImage }) | null> {
    const dcImage = await this.prisma.detentionCenterImage.findUnique({
      where: { detentionCenterId },
      include: { image: true },
    });

    if (!dcImage) {
      return null;
    }

    return {
      imageId: dcImage.imageId,
      detentionCenterId: dcImage.detentionCenterId,
      image: {
        id: dcImage.image.id,
        mimeType: dcImage.image.mimeType,
        size: dcImage.image.size,
        width: dcImage.image.width ?? undefined,
        height: dcImage.image.height ?? undefined,
        caption: dcImage.image.caption ?? undefined,
        uploadedById: dcImage.image.uploadedById ?? undefined,
        storageType: dcImage.image.storageType as 'database' | 's3',
        createdAt: dcImage.image.createdAt,
        updatedAt: dcImage.image.updatedAt,
      },
    };
  }

  async removeDetentionCenterImage(detentionCenterId: string): Promise<boolean> {
    try {
      const dcImage = await this.prisma.detentionCenterImage.findUnique({
        where: { detentionCenterId },
      });

      if (!dcImage) {
        return false;
      }

      const imageId = dcImage.imageId;

      await this.prisma.detentionCenterImage.delete({
        where: { detentionCenterId },
      });

      // Check if image is used elsewhere
      const personImageCount = await this.prisma.personImage.count({
        where: { imageId },
      });

      // Delete image if no longer used
      if (personImageCount === 0) {
        await this.deleteImage(imageId);
      }

      return true;
    } catch {
      return false;
    }
  }
}

// Export convenience functions for backward compatibility
export async function processAndStoreImage(
  buffer: Buffer,
  options?: {
    personId?: string;
    imageType?: string;
    sequenceNumber?: number;
    caption?: string;
    uploadedById?: string;
  }
): Promise<{ imageId: string }> {
  const service = new ImageStorageService(prisma);

  if (options?.personId) {
    const result = await service.addPersonImage(
      options.personId,
      buffer,
      options.imageType as 'primary' | 'gallery' || 'gallery',
      {
        caption: options.caption,
        uploadedById: options.uploadedById,
        sequenceNumber: options.sequenceNumber,
      }
    );
    return { imageId: result.imageId };
  }

  const image = await service.storeImage(buffer, {
    caption: options?.caption,
    uploadedById: options?.uploadedById,
  });

  return { imageId: image.id };
}

export async function getImage(imageId: string): Promise<ImageData | null> {
  const service = new ImageStorageService(prisma);
  return service.getImage(imageId);
}

export async function deleteImage(imageId: string): Promise<boolean> {
  const service = new ImageStorageService(prisma);
  return service.deleteImage(imageId);
}

export async function processImageBuffer(buffer: Buffer): Promise<ImageData> {
  const service = new ImageStorageService(prisma);
  return service.processImageBuffer(buffer);
}

// Re-export types
export type { ImageData, StoredImage, ImageMetadata } from './types';