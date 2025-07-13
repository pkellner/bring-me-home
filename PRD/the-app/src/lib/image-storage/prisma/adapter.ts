import { PrismaClient } from '@prisma/client';
import { 
  ImageStorageAdapter, 
  ImageData, 
  StoredImage, 
  ImageMetadata, 
  StoreImageOptions 
} from '../types';

export class PrismaStorageAdapter implements ImageStorageAdapter {
  constructor(private prisma: PrismaClient) {}

  async store(
    buffer: Buffer, 
    metadata: ImageMetadata, 
    options?: StoreImageOptions
  ): Promise<StoredImage> {
    const image = await this.prisma.imageStorage.create({
      data: {
        data: buffer,
        mimeType: metadata.mimeType,
        size: metadata.size,
        width: metadata.width,
        height: metadata.height,
        caption: options?.caption,
        uploadedById: options?.uploadedById,
        storageType: 'database',
      },
    });

    return {
      id: image.id,
      mimeType: image.mimeType,
      size: image.size,
      width: image.width ?? undefined,
      height: image.height ?? undefined,
      caption: image.caption ?? undefined,
      uploadedById: image.uploadedById ?? undefined,
      storageType: 'database',
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
    };
  }

  async retrieve(imageId: string): Promise<ImageData | null> {
    const image = await this.prisma.imageStorage.findUnique({
      where: { id: imageId },
    });

    if (!image || !image.data) {
      return null;
    }

    return {
      buffer: Buffer.from(image.data),
      mimeType: image.mimeType,
      size: image.size,
      width: image.width ?? undefined,
      height: image.height ?? undefined,
    };
  }

  async delete(imageId: string): Promise<boolean> {
    try {
      await this.prisma.imageStorage.delete({
        where: { id: imageId },
      });
      return true;
    } catch {
      return false;
    }
  }

  async exists(imageId: string): Promise<boolean> {
    const count = await this.prisma.imageStorage.count({
      where: { id: imageId },
    });
    return count > 0;
  }
}