import { S3StorageAdapter } from '../s3/adapter';
import { PrismaClient } from '@prisma/client';

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    imageStorage: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  })),
}));

const mockS3Send = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: mockS3Send,
  })),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ input, _type: 'PutObjectCommand' })),
  GetObjectCommand: jest.fn().mockImplementation((input) => ({ input, _type: 'GetObjectCommand' })),
  DeleteObjectCommand: jest.fn().mockImplementation((input) => ({ input, _type: 'DeleteObjectCommand' })),
  HeadObjectCommand: jest.fn().mockImplementation((input) => ({ input, _type: 'HeadObjectCommand' })),
}));

describe('S3StorageAdapter', () => {
  let adapter: S3StorageAdapter;
  let prisma: PrismaClient;

  const validConfig = {
    bucket: 'test-bucket',
    region: 'us-east-1',
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockS3Send.mockReset();
    prisma = new PrismaClient();
  });

  describe('constructor', () => {
    it('should create adapter with valid configuration', () => {
      expect(() => {
        adapter = new S3StorageAdapter(prisma, validConfig);
      }).not.toThrow();
    });

    it('should throw error when bucket is missing', () => {
      const invalidConfig = { ...validConfig, bucket: '' };
      expect(() => {
        new S3StorageAdapter(prisma, invalidConfig);
      }).toThrow('S3 bucket is required when using S3 storage. Please set AWS_S3_BUCKET environment variable.');
    });

    it('should throw error when region is missing', () => {
      const invalidConfig = { ...validConfig, region: '' };
      expect(() => {
        new S3StorageAdapter(prisma, invalidConfig);
      }).toThrow('S3 region is required when using S3 storage. Please set AWS_S3_REGION environment variable.');
    });

    it('should throw error when accessKeyId is missing', () => {
      const invalidConfig = { ...validConfig, accessKeyId: '' };
      expect(() => {
        new S3StorageAdapter(prisma, invalidConfig);
      }).toThrow('S3 access key ID is required when using S3 storage. Please set AWS_ACCESS_KEY_ID environment variable.');
    });

    it('should throw error when secretAccessKey is missing', () => {
      const invalidConfig = { ...validConfig, secretAccessKey: '' };
      expect(() => {
        new S3StorageAdapter(prisma, invalidConfig);
      }).toThrow('S3 secret access key is required when using S3 storage. Please set AWS_SECRET_ACCESS_KEY environment variable.');
    });
  });

  describe('store', () => {
    beforeEach(() => {
      adapter = new S3StorageAdapter(prisma, validConfig);
    });

    it('should store image in S3 and save metadata in database', async () => {
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
        id: expect.any(String),
        mimeType: metadata.mimeType,
        size: metadata.size,
        width: metadata.width,
        height: metadata.height,
        caption: options.caption,
        uploadedById: options.uploadedById,
        storageType: 's3',
        s3Key: expect.stringMatching(/^images\/\d{4}\/\d{2}\/.*\.jpeg$/),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockS3Send.mockResolvedValue({});
      (prisma.imageStorage.create as jest.Mock).mockResolvedValue(mockImage);

      const result = await adapter.store(buffer, metadata, options);

      expect(mockS3Send).toHaveBeenCalledTimes(1);
      const putCommand = mockS3Send.mock.calls[0][0];
      expect(putCommand._type).toBe('PutObjectCommand');
      expect(putCommand.input).toMatchObject({
        Bucket: 'test-bucket',
        Key: expect.stringMatching(/^images\/\d{4}\/\d{2}\/.*\.jpeg$/),
        Body: buffer,
        ContentType: 'image/jpeg',
        ContentLength: buffer.length,
        Metadata: {
          width: '800',
          height: '600',
        },
      });

      expect(prisma.imageStorage.create).toHaveBeenCalledWith({
        data: {
          id: expect.any(String),
          mimeType: metadata.mimeType,
          size: metadata.size,
          width: metadata.width,
          height: metadata.height,
          caption: options.caption,
          uploadedById: options.uploadedById,
          storageType: 's3',
          s3Key: expect.stringMatching(/^images\/\d{4}\/\d{2}\/.*\.jpeg$/),
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
        storageType: 's3',
        createdAt: mockImage.createdAt,
        updatedAt: mockImage.updatedAt,
      });
    });

    it('should handle S3 upload failure', async () => {
      const buffer = Buffer.from('test-image-data');
      const metadata = {
        mimeType: 'image/jpeg',
        size: buffer.length,
      };

      mockS3Send.mockRejectedValue(new Error('S3 upload failed'));

      await expect(adapter.store(buffer, metadata)).rejects.toThrow('S3 upload failed');
      expect(prisma.imageStorage.create).not.toHaveBeenCalled();
    });
  });

  describe('retrieve', () => {
    beforeEach(() => {
      adapter = new S3StorageAdapter(prisma, validConfig);
    });

    it('should retrieve image from S3', async () => {
      const imageId = 'image-123';
      const imageData = Buffer.from('test-image-data');
      const mockImage = {
        id: imageId,
        mimeType: 'image/jpeg',
        size: imageData.length,
        width: 800,
        height: 600,
        storageType: 's3',
        s3Key: 'images/2024/01/image-123.jpeg',
      };

      (prisma.imageStorage.findUnique as jest.Mock).mockResolvedValue(mockImage);
      
      const mockStream = {
        transformToByteArray: jest.fn().mockResolvedValue(imageData),
        [Symbol.asyncIterator]: function* () {
          yield imageData;
        },
      };
      
      mockS3Send.mockResolvedValue({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Body: mockStream as any,
      });

      const result = await adapter.retrieve(imageId);

      expect(prisma.imageStorage.findUnique).toHaveBeenCalledWith({
        where: { id: imageId },
      });

      expect(mockS3Send).toHaveBeenCalledTimes(1);
      const getCommand = mockS3Send.mock.calls[0][0];
      expect(getCommand._type).toBe('GetObjectCommand');
      expect(getCommand.input).toMatchObject({
        Bucket: 'test-bucket',
        Key: 'images/2024/01/image-123.jpeg',
      });

      expect(result).toEqual({
        buffer: imageData,
        mimeType: 'image/jpeg',
        size: imageData.length,
        width: 800,
        height: 600,
      });
    });

    it('should return null when image not found in database', async () => {
      (prisma.imageStorage.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await adapter.retrieve('non-existent');

      expect(result).toBeNull();
      expect(mockS3Send).not.toHaveBeenCalled();
    });

    it('should return null when image is not S3 type', async () => {
      const mockImage = {
        id: 'image-123',
        storageType: 'database',
        s3Key: null,
      };

      (prisma.imageStorage.findUnique as jest.Mock).mockResolvedValue(mockImage);

      const result = await adapter.retrieve('image-123');

      expect(result).toBeNull();
      expect(mockS3Send).not.toHaveBeenCalled();
    });

    it('should handle S3 retrieval error', async () => {
      const mockImage = {
        id: 'image-123',
        mimeType: 'image/jpeg',
        size: 1000,
        storageType: 's3',
        s3Key: 'images/2024/01/image-123.jpeg',
      };

      (prisma.imageStorage.findUnique as jest.Mock).mockResolvedValue(mockImage);
      mockS3Send.mockRejectedValue(new Error('S3 error'));

      // Suppress console.error for this test
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      const result = await adapter.retrieve('image-123');

      expect(result).toBeNull();
      
      consoleError.mockRestore();
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      adapter = new S3StorageAdapter(prisma, validConfig);
    });

    it('should delete image from S3 and database', async () => {
      const imageId = 'image-123';
      const mockImage = {
        id: imageId,
        storageType: 's3',
        s3Key: 'images/2024/01/image-123.jpeg',
      };

      (prisma.imageStorage.findUnique as jest.Mock).mockResolvedValue(mockImage);
      mockS3Send.mockResolvedValue({});
      (prisma.imageStorage.delete as jest.Mock).mockResolvedValue({});

      const result = await adapter.delete(imageId);

      expect(prisma.imageStorage.findUnique).toHaveBeenCalledWith({
        where: { id: imageId },
      });

      expect(mockS3Send).toHaveBeenCalledTimes(1);
      const deleteCommand = mockS3Send.mock.calls[0][0];
      expect(deleteCommand._type).toBe('DeleteObjectCommand');
      expect(deleteCommand.input).toMatchObject({
        Bucket: 'test-bucket',
        Key: 'images/2024/01/image-123.jpeg',
      });

      expect(prisma.imageStorage.delete).toHaveBeenCalledWith({
        where: { id: imageId },
      });

      expect(result).toBe(true);
    });

    it('should return false when image not found', async () => {
      (prisma.imageStorage.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await adapter.delete('non-existent');

      expect(result).toBe(false);
      expect(mockS3Send).not.toHaveBeenCalled();
      expect(prisma.imageStorage.delete).not.toHaveBeenCalled();
    });

    it('should handle deletion error', async () => {
      const mockImage = {
        id: 'image-123',
        storageType: 's3',
        s3Key: 'images/2024/01/image-123.jpeg',
      };

      (prisma.imageStorage.findUnique as jest.Mock).mockResolvedValue(mockImage);
      mockS3Send.mockRejectedValue(new Error('S3 delete error'));

      // Suppress console.error for this test
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      const result = await adapter.delete('image-123');

      expect(result).toBe(false);
      
      consoleError.mockRestore();
    });
  });

  describe('exists', () => {
    beforeEach(() => {
      adapter = new S3StorageAdapter(prisma, validConfig);
    });

    it('should return true when image exists in S3', async () => {
      const imageId = 'image-123';
      const mockImage = {
        id: imageId,
        storageType: 's3',
        s3Key: 'images/2024/01/image-123.jpeg',
      };

      (prisma.imageStorage.findUnique as jest.Mock).mockResolvedValue(mockImage);
      mockS3Send.mockResolvedValue({});

      const result = await adapter.exists(imageId);

      expect(prisma.imageStorage.findUnique).toHaveBeenCalledWith({
        where: { id: imageId },
      });

      expect(mockS3Send).toHaveBeenCalledTimes(1);
      const headCommand = mockS3Send.mock.calls[0][0];
      expect(headCommand._type).toBe('HeadObjectCommand');
      expect(headCommand.input).toMatchObject({
        Bucket: 'test-bucket',
        Key: 'images/2024/01/image-123.jpeg',
      });

      expect(result).toBe(true);
    });

    it('should return false when image not found in database', async () => {
      (prisma.imageStorage.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await adapter.exists('non-existent');

      expect(result).toBe(false);
      expect(mockS3Send).not.toHaveBeenCalled();
    });

    it('should return false when S3 object does not exist', async () => {
      const mockImage = {
        id: 'image-123',
        storageType: 's3',
        s3Key: 'images/2024/01/image-123.jpeg',
      };

      (prisma.imageStorage.findUnique as jest.Mock).mockResolvedValue(mockImage);
      mockS3Send.mockRejectedValue(new Error('Not found'));

      const result = await adapter.exists('image-123');

      expect(result).toBe(false);
    });
  });
});