import { generateOptOutToken, validateOptOutToken, consumeOptOutToken } from '@/lib/email-opt-out-tokens';

// Type definitions without importing from @prisma/client
type EmailOptOutToken = {
  id: string;
  token: string;
  userId: string;
  personId: string | null;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
};

type User = {
  id: string;
  optOutOfAllEmail: boolean;
};

type EmailOptOut = {
  id: string;
  userId: string;
  personId: string | null;
  source: string;
  createdAt: Date;
  updatedAt: Date;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('@/lib/prisma');

describe('Email Opt-Out Tokens', () => {
  const mockUserId = 'test-user-id';
  const mockPersonId = 'test-person-id';
  const mockToken = 'test-token-12345';
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the date to a fixed time for consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('generateOptOutToken', () => {
    it('should generate a token for person-specific opt-out', async () => {
      prisma.emailOptOutToken.create.mockResolvedValue({
        id: 'token-id',
        token: mockToken,
        userId: mockUserId,
        personId: mockPersonId,
        expiresAt: new Date('2024-01-15T00:00:00Z'),
        used: false,
        createdAt: new Date()
      } as EmailOptOutToken);

      const token = await generateOptOutToken(mockUserId, mockPersonId);
      
      expect(token).toBe(mockToken);
      expect(prisma.emailOptOutToken.create).toHaveBeenCalledWith({
        data: {
          token: mockToken,
          userId: mockUserId,
          personId: mockPersonId,
          expiresAt: new Date('2024-01-15T00:00:00Z'), // 14 days from now
        }
      });
    });

    it('should generate a token for global opt-out', async () => {
      prisma.emailOptOutToken.create.mockResolvedValue({
        id: 'token-id',
        token: mockToken,
        userId: mockUserId,
        personId: null,
        expiresAt: new Date('2024-01-15T00:00:00Z'),
        used: false,
        createdAt: new Date()
      } as EmailOptOutToken);

      const token = await generateOptOutToken(mockUserId);
      
      expect(token).toBe(mockToken);
      expect(prisma.emailOptOutToken.create).toHaveBeenCalledWith({
        data: {
          token: mockToken,
          userId: mockUserId,
          personId: undefined,
          expiresAt: new Date('2024-01-15T00:00:00Z'),
        }
      });
    });
  });

  describe('validateOptOutToken', () => {
    it('should validate a valid token', async () => {
      const validToken = {
        userId: mockUserId,
        personId: mockPersonId,
        expiresAt: new Date('2024-01-15T00:00:00Z'),
        used: false
      };
      
      prisma.emailOptOutToken.findUnique.mockResolvedValue(validToken as EmailOptOutToken);

      const result = await validateOptOutToken(mockToken);
      
      expect(result).toEqual({
        userId: mockUserId,
        personId: mockPersonId
      });
    });

    it('should return null for non-existent token', async () => {
      prisma.emailOptOutToken.findUnique.mockResolvedValue(null);

      const result = await validateOptOutToken('invalid-token');
      
      expect(result).toBeNull();
    });

    it('should return null for used token', async () => {
      prisma.emailOptOutToken.findUnique.mockResolvedValue({
        userId: mockUserId,
        personId: mockPersonId,
        expiresAt: new Date('2024-01-15T00:00:00Z'),
        used: true
      } as EmailOptOutToken);

      const result = await validateOptOutToken(mockToken);
      
      expect(result).toBeNull();
    });

    it('should return null for expired token', async () => {
      prisma.emailOptOutToken.findUnique.mockResolvedValue({
        userId: mockUserId,
        personId: mockPersonId,
        expiresAt: new Date('2023-12-15T00:00:00Z'), // Expired
        used: false
      } as EmailOptOutToken);

      const result = await validateOptOutToken(mockToken);
      
      expect(result).toBeNull();
    });
  });

  describe('consumeOptOutToken', () => {
    it('should consume token for person-specific opt-out', async () => {
      const validToken = {
        userId: mockUserId,
        personId: mockPersonId,
        expiresAt: new Date('2024-01-15T00:00:00Z'),
        used: false
      };
      
      prisma.emailOptOutToken.findUnique.mockResolvedValue(validToken as EmailOptOutToken);
      prisma.emailOptOutToken.update.mockResolvedValue({ ...validToken, used: true } as EmailOptOutToken);
      prisma.emailOptOut.upsert.mockResolvedValue({} as EmailOptOut);

      const result = await consumeOptOutToken(mockToken);
      
      expect(result).toEqual({
        userId: mockUserId,
        personId: mockPersonId
      });
      
      // Verify token was marked as used
      expect(prisma.emailOptOutToken.update).toHaveBeenCalledWith({
        where: { token: mockToken },
        data: { used: true }
      });
      
      // Verify opt-out was created
      expect(prisma.emailOptOut.upsert).toHaveBeenCalledWith({
        where: {
          userId_personId: {
            userId: mockUserId,
            personId: mockPersonId
          }
        },
        update: {
          source: 'link',
          updatedAt: new Date()
        },
        create: {
          userId: mockUserId,
          personId: mockPersonId,
          source: 'link'
        }
      });
    });

    it('should consume token for global opt-out', async () => {
      const validToken = {
        userId: mockUserId,
        personId: null,
        expiresAt: new Date('2024-01-15T00:00:00Z'),
        used: false
      };
      
      prisma.emailOptOutToken.findUnique.mockResolvedValue(validToken as EmailOptOutToken);
      prisma.emailOptOutToken.update.mockResolvedValue({ ...validToken, used: true } as EmailOptOutToken);
      prisma.user.update.mockResolvedValue({ optOutOfAllEmail: true } as User);

      const result = await consumeOptOutToken(mockToken);
      
      expect(result).toEqual({
        userId: mockUserId,
        personId: undefined
      });
      
      // Verify user was updated for global opt-out
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { optOutOfAllEmail: true }
      });
      
      // Verify person-specific opt-out was NOT created
      expect(prisma.emailOptOut.upsert).not.toHaveBeenCalled();
    });

    it('should return null for invalid token', async () => {
      prisma.emailOptOutToken.findUnique.mockResolvedValue(null);

      const result = await consumeOptOutToken('invalid-token');
      
      expect(result).toBeNull();
      expect(prisma.emailOptOutToken.update).not.toHaveBeenCalled();
      expect(prisma.emailOptOut.upsert).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should return null for already used token', async () => {
      prisma.emailOptOutToken.findUnique.mockResolvedValue({
        userId: mockUserId,
        personId: mockPersonId,
        expiresAt: new Date('2024-01-15T00:00:00Z'),
        used: true
      } as EmailOptOutToken);

      const result = await consumeOptOutToken(mockToken);
      
      expect(result).toBeNull();
      expect(prisma.emailOptOutToken.update).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle token generation with null personId correctly', async () => {
      prisma.emailOptOutToken.create.mockResolvedValue({
        id: 'token-id',
        token: mockToken,
        userId: mockUserId,
        personId: null,
        expiresAt: new Date('2024-01-15T00:00:00Z'),
        used: false,
        createdAt: new Date()
      } as EmailOptOutToken);

      const token = await generateOptOutToken(mockUserId, undefined);
      
      expect(token).toBe(mockToken);
      expect(prisma.emailOptOutToken.create).toHaveBeenCalledWith({
        data: {
          token: mockToken,
          userId: mockUserId,
          personId: undefined,
          expiresAt: new Date('2024-01-15T00:00:00Z'),
        }
      });
    });

    it('should handle token validation at exact expiration time', async () => {
      // Set current time to exact expiration
      jest.setSystemTime(new Date('2024-01-15T00:00:00Z'));
      
      prisma.emailOptOutToken.findUnique.mockResolvedValue({
        userId: mockUserId,
        personId: mockPersonId,
        expiresAt: new Date('2024-01-15T00:00:00Z'),
        used: false
      } as EmailOptOutToken);

      const result = await validateOptOutToken(mockToken);
      
      // At exact expiration time, token should still be valid (> not >=)
      expect(result).toEqual({
        userId: mockUserId,
        personId: mockPersonId
      });
    });

    it('should handle token validation 1 second before expiration', async () => {
      // Set current time to 1 second before expiration
      jest.setSystemTime(new Date('2024-01-14T23:59:59Z'));
      
      prisma.emailOptOutToken.findUnique.mockResolvedValue({
        userId: mockUserId,
        personId: mockPersonId,
        expiresAt: new Date('2024-01-15T00:00:00Z'),
        used: false
      } as EmailOptOutToken);

      const result = await validateOptOutToken(mockToken);
      
      // Should still be valid
      expect(result).toEqual({
        userId: mockUserId,
        personId: mockPersonId
      });
    });

    it('should handle token validation 1 millisecond after expiration', async () => {
      // Set current time to 1 millisecond after expiration
      jest.setSystemTime(new Date('2024-01-15T00:00:00.001Z'));
      
      prisma.emailOptOutToken.findUnique.mockResolvedValue({
        userId: mockUserId,
        personId: mockPersonId,
        expiresAt: new Date('2024-01-15T00:00:00Z'),
        used: false
      } as EmailOptOutToken);

      const result = await validateOptOutToken(mockToken);
      
      // Should be invalid now
      expect(result).toBeNull();
    });
  });
});