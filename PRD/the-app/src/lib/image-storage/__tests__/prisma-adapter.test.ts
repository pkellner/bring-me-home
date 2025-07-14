import { PrismaStorageAdapter } from '../prisma/adapter';
import { PrismaClient } from '@prisma/client';

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    imageStorage: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  })),
}));

describe('PrismaStorageAdapter', () => {
  let adapter: PrismaStorageAdapter;
  let prisma: PrismaClient;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = new PrismaClient();
    adapter = new PrismaStorageAdapter(prisma);
  });

  describe('store', () => {
    it('should store image in database', async () => {
      const buffer = Buffer.from('test-image-data');
      const metadata = {
        mimeType: 'image/jpeg',
        size: buffer.length,
        width: 800,
        height: 600,
      };
      const options = {
        caption: 'Test caption',
        uploadedById: 'user-123',
      };

      const mockImage = {
        id: 'image-123',
        data: buffer,
        mimeType: metadata.mimeType,
        size: metadata.size,
        width: metadata.width,
        height: metadata.height,
        caption: options.caption,
        uploadedById: options.uploadedById,
        storageType: 'database',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.imageStorage.create as jest.Mock).mockResolvedValue(mockImage);

      const result = await adapter.store(buffer, metadata, options);

      expect(prisma.imageStorage.create).toHaveBeenCalledWith({
        data: {
          data: buffer,
          mimeType: metadata.mimeType,
          size: metadata.size,
          width: metadata.width,
          height: metadata.height,
          caption: options.caption,
          uploadedById: options.uploadedById,
          storageType: 'database',
        },
      });

      expect(result).toEqual({
        id: mockImage.id,
        mimeType: mockImage.mimeType,
        size: mockImage.size,
        width: mockImage.width,
        height: mockImage.height,
        caption: mockImage.caption,
        uploadedById: mockImage.uploadedById,
        storageType: 'database',
        createdAt: mockImage.createdAt,
        updatedAt: mockImage.updatedAt,
      });
    });

    it('should handle null values in optional fields', async () => {
      const buffer = Buffer.from('test-image-data');
      const metadata = {
        mimeType: 'image/png',
        size: buffer.length,
      };

      const mockImage = {
        id: 'image-456',
        data: buffer,
        mimeType: metadata.mimeType,
        size: metadata.size,
        width: null,
        height: null,
        caption: null,
        uploadedById: null,
        storageType: 'database',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.imageStorage.create as jest.Mock).mockResolvedValue(mockImage);

      const result = await adapter.store(buffer, metadata);

      expect(result).toEqual({
        id: mockImage.id,
        mimeType: mockImage.mimeType,
        size: mockImage.size,
        width: undefined,
        height: undefined,
        caption: undefined,
        uploadedById: undefined,
        storageType: 'database',
        createdAt: mockImage.createdAt,
        updatedAt: mockImage.updatedAt,
      });
    });
  });

  describe('retrieve', () => {
    it('should retrieve image from database', async () => {
      const imageId = 'image-123';
      const imageData = Buffer.from('test-image-data');
      const mockImage = {
        id: imageId,
        data: imageData,
        mimeType: 'image/jpeg',
        size: imageData.length,
        width: 800,
        height: 600,
      };

      (prisma.imageStorage.findUnique as jest.Mock).mockResolvedValue(mockImage);

      const result = await adapter.retrieve(imageId);

      expect(prisma.imageStorage.findUnique).toHaveBeenCalledWith({
        where: { id: imageId },
      });

      expect(result).toEqual({
        buffer: imageData,
        mimeType: 'image/jpeg',
        size: imageData.length,
        width: 800,
        height: 600,
      });
    });

    it('should return null when image not found', async () => {
      (prisma.imageStorage.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await adapter.retrieve('non-existent');

      expect(result).toBeNull();
    });

    it('should return null when image data is null', async () => {
      const mockImage = {
        id: 'image-123',
        data: null,
        mimeType: 'image/jpeg',
        size: 0,
      };

      (prisma.imageStorage.findUnique as jest.Mock).mockResolvedValue(mockImage);

      const result = await adapter.retrieve('image-123');

      expect(result).toBeNull();
    });

    it('should handle null width and height', async () => {
      const imageData = Buffer.from('test-image-data');
      const mockImage = {
        id: 'image-123',
        data: imageData,
        mimeType: 'image/jpeg',
        size: imageData.length,
        width: null,
        height: null,
      };

      (prisma.imageStorage.findUnique as jest.Mock).mockResolvedValue(mockImage);

      const result = await adapter.retrieve('image-123');

      expect(result).toEqual({
        buffer: imageData,
        mimeType: 'image/jpeg',
        size: imageData.length,
        width: undefined,
        height: undefined,
      });
    });
  });

  describe('delete', () => {
    it('should delete image from database', async () => {
      const imageId = 'image-123';
      (prisma.imageStorage.delete as jest.Mock).mockResolvedValue({});

      const result = await adapter.delete(imageId);

      expect(prisma.imageStorage.delete).toHaveBeenCalledWith({
        where: { id: imageId },
      });

      expect(result).toBe(true);
    });

    it('should return false when deletion fails', async () => {
      const imageId = 'image-123';
      (prisma.imageStorage.delete as jest.Mock).mockRejectedValue(new Error('Delete failed'));

      const result = await adapter.delete(imageId);

      expect(result).toBe(false);
    });
  });

  describe('exists', () => {
    it('should return true when image exists', async () => {
      const imageId = 'image-123';
      (prisma.imageStorage.count as jest.Mock).mockResolvedValue(1);

      const result = await adapter.exists(imageId);

      expect(prisma.imageStorage.count).toHaveBeenCalledWith({
        where: { id: imageId },
      });

      expect(result).toBe(true);
    });

    it('should return false when image does not exist', async () => {
      const imageId = 'non-existent';
      (prisma.imageStorage.count as jest.Mock).mockResolvedValue(0);

      const result = await adapter.exists(imageId);

      expect(prisma.imageStorage.count).toHaveBeenCalledWith({
        where: { id: imageId },
      });

      expect(result).toBe(false);
    });
  });
});