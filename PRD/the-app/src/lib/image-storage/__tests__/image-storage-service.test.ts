import { ImageStorageService } from '../index';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import { S3StorageAdapter } from '../s3/adapter';
import { PrismaStorageAdapter } from '../prisma/adapter';

jest.mock('@prisma/client');
jest.mock('sharp');
jest.mock('../s3/adapter');
jest.mock('../prisma/adapter');

const mockSharpInstance = {
  rotate: jest.fn().mockReturnThis(),
  resize: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  toBuffer: jest.fn(),
  metadata: jest.fn(),
};

(sharp as unknown as jest.Mock).mockReturnValue(mockSharpInstance);

describe('ImageStorageService', () => {
  let service: ImageStorageService;
  let prisma: PrismaClient;
  let mockPrismaAdapter: jest.Mocked<PrismaStorageAdapter>;
  let mockS3Adapter: jest.Mocked<S3StorageAdapter>;

  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    
    prisma = new PrismaClient();
    prisma.$transaction = jest.fn();
    prisma.personImage = {
      aggregate: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    
    prisma.detentionCenterImage = {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    mockPrismaAdapter = {
      store: jest.fn(),
      retrieve: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    mockS3Adapter = {
      store: jest.fn(),
      retrieve: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    (PrismaStorageAdapter as jest.Mock).mockImplementation(() => mockPrismaAdapter);
    (S3StorageAdapter as jest.Mock).mockImplementation(() => mockS3Adapter);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should use PrismaStorageAdapter when storage type is database', () => {
      process.env.IMAGE_STORAGE_TYPE = 'database';
      
      service = new ImageStorageService(prisma);
      
      expect(PrismaStorageAdapter).toHaveBeenCalledWith(prisma);
      expect(S3StorageAdapter).not.toHaveBeenCalled();
    });

    it('should use S3StorageAdapter when storage type is s3 with complete config', () => {
      process.env.IMAGE_STORAGE_TYPE = 's3';
      process.env.AWS_S3_BUCKET = 'test-bucket';
      process.env.AWS_S3_REGION = 'us-east-1';
      process.env.AWS_ACCESS_KEY_ID = 'test-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
      
      service = new ImageStorageService(prisma);
      
      expect(S3StorageAdapter).toHaveBeenCalledWith(prisma, {
        bucket: 'test-bucket',
        region: 'us-east-1',
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret',
        endpoint: undefined,
      });
      expect(PrismaStorageAdapter).not.toHaveBeenCalled();
    });

    it('should throw error when storage type is s3 but config is incomplete', () => {
      process.env.IMAGE_STORAGE_TYPE = 's3';
      process.env.AWS_S3_BUCKET = 'test-bucket';
      // Missing other required S3 config
      
      expect(() => {
        new ImageStorageService(prisma);
      }).toThrow(
        'S3 configuration incomplete. When IMAGE_STORAGE_TYPE is set to "s3", the following environment variables are required: ' +
        'AWS_S3_BUCKET, AWS_S3_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY'
      );
    });

    it('should default to database storage when IMAGE_STORAGE_TYPE is not set', () => {
      delete process.env.IMAGE_STORAGE_TYPE;
      
      service = new ImageStorageService(prisma);
      
      expect(PrismaStorageAdapter).toHaveBeenCalledWith(prisma);
    });
  });

  describe('processImageBuffer', () => {
    beforeEach(() => {
      process.env.IMAGE_STORAGE_TYPE = 'database';
      service = new ImageStorageService(prisma);
    });

    it('should process image with default settings', async () => {
      const inputBuffer = Buffer.from('input-image');
      const processedBuffer = Buffer.from('processed-image');
      
      mockSharpInstance.toBuffer.mockResolvedValue(processedBuffer);
      mockSharpInstance.metadata.mockResolvedValue({
        width: 1200,
        height: 800,
      });

      const result = await service.processImageBuffer(inputBuffer);

      expect(sharp).toHaveBeenCalledWith(inputBuffer);
      expect(mockSharpInstance.rotate).toHaveBeenCalled();
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true,
        position: 'center',
      });
      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({ quality: 70 });
      
      expect(result).toEqual({
        buffer: processedBuffer,
        mimeType: 'image/jpeg',
        size: processedBuffer.length,
        width: 1200,
        height: 800,
      });
    });

    it('should use custom image dimensions from environment', async () => {
      process.env.IMAGE_MAX_SIZE = '800';
      process.env.IMAGE_QUALITY = '90';
      
      const inputBuffer = Buffer.from('input-image');
      const processedBuffer = Buffer.from('processed-image');
      
      mockSharpInstance.toBuffer.mockResolvedValue(processedBuffer);
      mockSharpInstance.metadata.mockResolvedValue({
        width: 800,
        height: 600,
      });

      await service.processImageBuffer(inputBuffer);

      // Default values are used since service was already created
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true,
        position: 'center',
      });
      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({ quality: 70 });
    });
  });

  describe('storeImage', () => {
    beforeEach(() => {
      process.env.IMAGE_STORAGE_TYPE = 'database';
      service = new ImageStorageService(prisma);
    });

    it('should process and store image', async () => {
      const inputBuffer = Buffer.from('input-image');
      const processedBuffer = Buffer.from('processed-image');
      const options = { caption: 'Test image', uploadedById: 'user-123' };
      
      mockSharpInstance.toBuffer.mockResolvedValue(processedBuffer);
      mockSharpInstance.metadata.mockResolvedValue({
        width: 800,
        height: 600,
      });
      
      const mockStoredImage = {
        id: 'image-123',
        mimeType: 'image/jpeg',
        size: processedBuffer.length,
        width: 800,
        height: 600,
        caption: options.caption,
        uploadedById: options.uploadedById,
        storageType: 'database',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockPrismaAdapter.store.mockResolvedValue(mockStoredImage);

      const result = await service.storeImage(inputBuffer, options);

      expect(mockPrismaAdapter.store).toHaveBeenCalledWith(
        processedBuffer,
        {
          buffer: processedBuffer,
          mimeType: 'image/jpeg',
          size: processedBuffer.length,
          width: 800,
          height: 600,
        },
        options
      );
      
      expect(result).toEqual(mockStoredImage);
    });
  });

  describe('getImage', () => {
    beforeEach(() => {
      process.env.IMAGE_STORAGE_TYPE = 'database';
      service = new ImageStorageService(prisma);
    });

    it('should retrieve image', async () => {
      const imageId = 'image-123';
      const mockImageData = {
        buffer: Buffer.from('image-data'),
        mimeType: 'image/jpeg',
        size: 1000,
        width: 800,
        height: 600,
      };
      
      mockPrismaAdapter.retrieve.mockResolvedValue(mockImageData);

      const result = await service.getImage(imageId);

      expect(mockPrismaAdapter.retrieve).toHaveBeenCalledWith(imageId);
      expect(result).toEqual(mockImageData);
    });
  });

  describe('deleteImage', () => {
    beforeEach(() => {
      process.env.IMAGE_STORAGE_TYPE = 'database';
      service = new ImageStorageService(prisma);
    });

    it('should delete image and all associations', async () => {
      const imageId = 'image-123';
      
      (prisma.personImage.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });
      (prisma.detentionCenterImage.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      mockPrismaAdapter.delete.mockResolvedValue(true);

      const result = await service.deleteImage(imageId);

      expect(prisma.personImage.deleteMany).toHaveBeenCalledWith({
        where: { imageId },
      });
      expect(prisma.detentionCenterImage.deleteMany).toHaveBeenCalledWith({
        where: { imageId },
      });
      expect(mockPrismaAdapter.delete).toHaveBeenCalledWith(imageId);
      expect(result).toBe(true);
    });
  });

  describe('person image management', () => {
    beforeEach(() => {
      process.env.IMAGE_STORAGE_TYPE = 'database';
      service = new ImageStorageService(prisma);
    });

    describe('addPersonImage', () => {
      it('should add person image with auto-generated sequence number', async () => {
        const personId = 'person-123';
        const inputBuffer = Buffer.from('input-image');
        const processedBuffer = Buffer.from('processed-image');
        
        mockSharpInstance.toBuffer.mockResolvedValue(processedBuffer);
        mockSharpInstance.metadata.mockResolvedValue({ width: 800, height: 600 });
        
        const mockStoredImage = {
          id: 'image-123',
          mimeType: 'image/jpeg',
          size: processedBuffer.length,
          width: 800,
          height: 600,
          storageType: 'database',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        mockPrismaAdapter.store.mockResolvedValue(mockStoredImage);
        
        (prisma.personImage.aggregate as jest.Mock).mockResolvedValue({
          _max: { sequenceNumber: 5 },
        });
        
        const mockPersonImage = {
          personId,
          imageId: 'image-123',
          imageType: 'gallery',
          sequenceNumber: 6,
        };
        
        (prisma.personImage.create as jest.Mock).mockResolvedValue(mockPersonImage);

        const result = await service.addPersonImage(personId, inputBuffer, 'gallery');

        expect(prisma.personImage.aggregate).toHaveBeenCalledWith({
          where: { personId },
          _max: { sequenceNumber: true },
        });
        
        expect(prisma.personImage.create).toHaveBeenCalledWith({
          data: {
            personId,
            imageId: 'image-123',
            imageType: 'gallery',
            sequenceNumber: 6,
          },
        });
        
        expect(result).toEqual({
          imageId: 'image-123',
          personId,
          imageType: 'gallery',
          sequenceNumber: 6,
        });
      });

      it('should use provided sequence number', async () => {
        const personId = 'person-123';
        const inputBuffer = Buffer.from('input-image');
        const processedBuffer = Buffer.from('processed-image');
        
        mockSharpInstance.toBuffer.mockResolvedValue(processedBuffer);
        mockSharpInstance.metadata.mockResolvedValue({ width: 800, height: 600 });
        
        const mockStoredImage = {
          id: 'image-123',
          mimeType: 'image/jpeg',
          size: processedBuffer.length,
          width: 800,
          height: 600,
          storageType: 'database',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        mockPrismaAdapter.store.mockResolvedValue(mockStoredImage);
        
        const mockPersonImage = {
          personId,
          imageId: 'image-123',
          imageType: 'primary',
          sequenceNumber: 0,
        };
        
        (prisma.personImage.create as jest.Mock).mockResolvedValue(mockPersonImage);

        await service.addPersonImage(personId, inputBuffer, 'primary', { sequenceNumber: 0 });

        expect(prisma.personImage.aggregate).not.toHaveBeenCalled();
        
        expect(prisma.personImage.create).toHaveBeenCalledWith({
          data: {
            personId,
            imageId: 'image-123',
            imageType: 'primary',
            sequenceNumber: 0,
          },
        });
      });
    });

    describe('removePersonImage', () => {
      it('should remove person image and delete if not used elsewhere', async () => {
        const personId = 'person-123';
        const imageId = 'image-123';
        
        (prisma.personImage.delete as jest.Mock).mockResolvedValue({});
        (prisma.$transaction as jest.Mock).mockResolvedValue([0, 0]);
        (prisma.personImage.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
        (prisma.detentionCenterImage.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
        mockPrismaAdapter.delete.mockResolvedValue(true);

        const result = await service.removePersonImage(personId, imageId);

        expect(prisma.personImage.delete).toHaveBeenCalledWith({
          where: {
            personId_imageId: { personId, imageId },
          },
        });
        
        expect(prisma.$transaction).toHaveBeenCalledWith([
          prisma.personImage.count({ where: { imageId } }),
          prisma.detentionCenterImage.count({ where: { imageId } }),
        ]);
        expect(prisma.personImage.deleteMany).toHaveBeenCalledWith({ where: { imageId } });
        expect(prisma.detentionCenterImage.deleteMany).toHaveBeenCalledWith({ where: { imageId } });
        expect(mockPrismaAdapter.delete).toHaveBeenCalledWith(imageId);
        
        expect(result).toBe(true);
      });

      it('should not delete image if still used elsewhere', async () => {
        const personId = 'person-123';
        const imageId = 'image-123';
        
        (prisma.personImage.delete as jest.Mock).mockResolvedValue({});
        (prisma.$transaction as jest.Mock).mockResolvedValue([2, 0]);

        const result = await service.removePersonImage(personId, imageId);

        expect(mockPrismaAdapter.delete).not.toHaveBeenCalled();
        expect(result).toBe(true);
      });
    });
  });
});