import { generateVerificationToken, hashToken, verifyToken, generateVerificationUrls } from '../comment-verification';
import { prisma } from '../prisma';

// Mock Prisma
jest.mock('../prisma', () => ({
  prisma: {
    commentVerificationToken: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('Comment Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateVerificationToken', () => {
    it('should generate a URL-safe token', () => {
      const token = generateVerificationToken();
      expect(token).toBeTruthy();
      expect(token.length).toBeGreaterThan(0);
      // URL-safe base64 should only contain these characters
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should generate unique tokens', () => {
      const token1 = generateVerificationToken();
      const token2 = generateVerificationToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('hashToken', () => {
    it('should hash a token consistently', () => {
      const token = 'test-token';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 character hex string
    });

    it('should produce different hashes for different tokens', () => {
      const hash1 = hashToken('token1');
      const hash2 = hashToken('token2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid active token', async () => {
      const token = 'valid-token';
      const tokenHash = hashToken(token);
      const mockToken = {
        id: '1',
        email: 'test@example.com',
        tokenHash,
        isActive: true,
        lastUsedAt: new Date(),
        usageCount: 0,
      };

      (prisma.commentVerificationToken.findFirst as jest.Mock).mockResolvedValue(mockToken);
      (prisma.commentVerificationToken.update as jest.Mock).mockResolvedValue({
        ...mockToken,
        lastUsedAt: new Date(),
        usageCount: 1,
      });

      const result = await verifyToken(token);
      
      expect(result).toBeTruthy();
      expect(result?.email).toBe('test@example.com');
      expect(prisma.commentVerificationToken.findFirst).toHaveBeenCalledWith({
        where: {
          tokenHash,
          isActive: true,
        },
      });
      expect(prisma.commentVerificationToken.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          lastUsedAt: expect.any(Date),
          usageCount: { increment: 1 },
        },
      });
    });

    it('should return null for invalid token', async () => {
      (prisma.commentVerificationToken.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await verifyToken('invalid-token');
      
      expect(result).toBeNull();
      expect(prisma.commentVerificationToken.update).not.toHaveBeenCalled();
    });

    it('should return null for inactive token', async () => {
      const token = 'inactive-token';

      // Inactive tokens are not returned by the query (isActive: true filter)
      (prisma.commentVerificationToken.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await verifyToken(token);
      
      expect(result).toBeNull();
    });
  });

  describe('generateVerificationUrls', () => {
    it('should generate correct URLs', () => {
      const baseUrl = 'https://example.com';
      const token = 'test-token';
      const personSlug = 'john-doe';
      const townSlug = 'seattle';
      const commentId = 'comment-123';

      const urls = generateVerificationUrls(baseUrl, token, personSlug, townSlug, commentId);

      expect(urls.verificationUrl).toBe(`${baseUrl}/${townSlug}/${personSlug}#comment-${commentId}`);
      expect(urls.hideUrl).toBe(`${baseUrl}/verify/comments?token=${token}&action=hide`);
      expect(urls.manageUrl).toBe(`${baseUrl}/verify/comments?token=${token}&action=manage`);
    });

    it('should handle missing commentId', () => {
      const baseUrl = 'https://example.com';
      const token = 'test-token';
      const personSlug = 'john-doe';
      const townSlug = 'seattle';

      const urls = generateVerificationUrls(baseUrl, token, personSlug, townSlug);

      expect(urls.verificationUrl).toBe(`${baseUrl}/${townSlug}/${personSlug}`);
      expect(urls.hideUrl).toBe(`${baseUrl}/verify/comments?token=${token}&action=hide`);
      expect(urls.manageUrl).toBe(`${baseUrl}/verify/comments?token=${token}&action=manage`);
    });
  });
});