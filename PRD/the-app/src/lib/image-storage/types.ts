export interface ImageMetadata {
  width?: number;
  height?: number;
  mimeType: string;
  size: number;
}

export interface ImageData extends ImageMetadata {
  buffer: Buffer;
}

export interface StoredImage extends ImageMetadata {
  id: string;
  caption?: string;
  uploadedById?: string;
  storageType: 'database' | 's3';
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonImageData {
  imageId: string;
  personId: string;
  imageType: 'primary' | 'gallery';
  sequenceNumber: number;
}

export interface DetentionCenterImageData {
  imageId: string;
  detentionCenterId: string;
}

export interface StoreImageOptions {
  caption?: string;
  uploadedById?: string;
}

export interface ImageStorageAdapter {
  store(buffer: Buffer, metadata: ImageMetadata, options?: StoreImageOptions): Promise<StoredImage>;
  retrieve(imageId: string): Promise<ImageData | null>;
  delete(imageId: string): Promise<boolean>;
  exists(imageId: string): Promise<boolean>;
}

export interface ImageStorageConfig {
  storageType: 'database' | 's3';
  s3Config?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string;
  };
}