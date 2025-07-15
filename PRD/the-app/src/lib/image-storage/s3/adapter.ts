import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand,
  HeadObjectCommand 
} from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  ImageStorageAdapter,
  ImageData,
  StoredImage,
  ImageMetadata,
  StoreImageOptions,
  ImageStorageConfig
} from '../types';

export class S3StorageAdapter implements ImageStorageAdapter {
  private s3Client: S3Client;
  private bucket: string;
  private region: string;

  constructor(
    private prisma: PrismaClient,
    config: NonNullable<ImageStorageConfig['s3Config']>
  ) {

    // Validate required S3 configuration
    if (!config.bucket) {
      throw new Error('S3 bucket is required when using S3 storage. Please set AWS_S3_BUCKET environment variable.');
    }
    if (!config.region) {
      throw new Error('S3 region is required when using S3 storage. Please set AWS_S3_REGION environment variable.');
    }
    if (!config.accessKeyId) {
      throw new Error('S3 access key ID is required when using S3 storage. Please set AWS_ACCESS_KEY_ID environment variable.');
    }
    if (!config.secretAccessKey) {
      throw new Error('S3 secret access key is required when using S3 storage. Please set AWS_SECRET_ACCESS_KEY environment variable.');
    }

    this.bucket = config.bucket;
    this.region = config.region;
    
    this.s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: config.endpoint,
    });
    
  }

  private generateS3Key(imageId: string, mimeType: string): string {
    const extension = mimeType.split('/')[1] || 'jpg';
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `images/${year}/${month}/${imageId}.${extension}`;
  }

  async store(
    buffer: Buffer,
    metadata: ImageMetadata,
    options?: StoreImageOptions
  ): Promise<StoredImage> {
    const imageId = randomUUID();
    const s3Key = this.generateS3Key(imageId, metadata.mimeType);


    try {
      // Upload to S3
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        Body: buffer,
        ContentType: metadata.mimeType,
        ContentLength: metadata.size,
        Metadata: {
          width: metadata.width?.toString() || '',
          height: metadata.height?.toString() || '',
        },
      }));
    } catch (error) {
      console.error('S3 upload error:', {
        error,
        bucket: this.bucket,
        key: s3Key,
        region: this.region,
      });
      throw error;
    }

    // Store metadata in database
    const image = await this.prisma.imageStorage.create({
      data: {
        id: imageId,
        mimeType: metadata.mimeType,
        size: metadata.size,
        width: metadata.width,
        height: metadata.height,
        caption: options?.caption,
        uploadedById: options?.uploadedById,
        storageType: 's3',
        s3Key: s3Key,
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
      storageType: 's3',
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
    };
  }

  async retrieve(imageId: string): Promise<ImageData | null> {
    const image = await this.prisma.imageStorage.findUnique({
      where: { id: imageId },
    });

    if (!image || image.storageType !== 's3' || !image.s3Key) {
      return null;
    }

    try {
      const response = await this.s3Client.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: image.s3Key,
      }));

      if (!response.Body) {
        return null;
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      return {
        buffer,
        mimeType: image.mimeType,
        size: image.size,
        width: image.width ?? undefined,
        height: image.height ?? undefined,
      };
    } catch (error) {
      console.error('Error retrieving image from S3:', error);
      return null;
    }
  }

  async delete(imageId: string): Promise<boolean> {
    const image = await this.prisma.imageStorage.findUnique({
      where: { id: imageId },
    });

    if (!image || image.storageType !== 's3' || !image.s3Key) {
      return false;
    }

    try {
      // Delete from S3
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: image.s3Key,
      }));

      // Delete from database
      await this.prisma.imageStorage.delete({
        where: { id: imageId },
      });

      return true;
    } catch (error) {
      console.error('Error deleting image from S3:', error);
      return false;
    }
  }

  async exists(imageId: string): Promise<boolean> {
    const image = await this.prisma.imageStorage.findUnique({
      where: { id: imageId },
    });

    if (!image || image.storageType !== 's3' || !image.s3Key) {
      return false;
    }

    try {
      await this.s3Client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: image.s3Key,
      }));
      return true;
    } catch {
      return false;
    }
  }
}