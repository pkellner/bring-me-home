import { GET } from '../route';
import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/comment-verification';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('@/lib/comment-verification');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    comment: {
      updateMany: jest.fn(),
    },
    commentVerificationToken: {
      update: jest.fn(),
    },
  },
}));

describe('Comment Verification API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/verify/comments', () => {
    it('should hide comments when action is hide', async () => {
      const mockToken = {
        id: 'token-1',
        email: 'test@example.com',
        isActive: true,
      };

      (verifyToken as jest.Mock).mockResolvedValue(mockToken);
      (prisma.comment.updateMany as jest.Mock).mockResolvedValue({ count: 3 });
      (prisma.commentVerificationToken.update as jest.Mock).mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/verify/comments?token=valid-token&action=hide');
      const response = await GET(request);

      expect(response.status).toBe(307); // Redirect
      expect(response.headers.get('Location')).toContain('/verify/comments/success?action=hide');
      
      expect(prisma.comment.updateMany).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        data: {
          hideRequested: true,
          hideRequestedAt: expect.any(Date),
        },
      });

      expect(prisma.commentVerificationToken.update).toHaveBeenCalledWith({
        where: { id: 'token-1' },
        data: {
          lastAction: 'hide',
        },
      });
    });

    it('should unhide comments when action is unhide', async () => {
      const mockToken = {
        id: 'token-1',
        email: 'test@example.com',
        isActive: true,
      };

      (verifyToken as jest.Mock).mockResolvedValue(mockToken);
      (prisma.comment.updateMany as jest.Mock).mockResolvedValue({ count: 3 });
      (prisma.commentVerificationToken.update as jest.Mock).mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/verify/comments?token=valid-token&action=unhide');
      const response = await GET(request);

      expect(response.status).toBe(307); // Redirect
      expect(response.headers.get('Location')).toContain('/verify/comments/success?action=unhide');
      
      expect(prisma.comment.updateMany).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        data: {
          hideRequested: false,
          hideRequestedAt: null,
        },
      });

      expect(prisma.commentVerificationToken.update).toHaveBeenCalledWith({
        where: { id: 'token-1' },
        data: {
          lastAction: 'unhide',
        },
      });
    });

    it('should redirect to manage page when action is manage', async () => {
      const mockToken = {
        id: 'token-1',
        email: 'test@example.com',
        isActive: true,
      };

      (verifyToken as jest.Mock).mockResolvedValue(mockToken);

      const request = new NextRequest('http://localhost:3000/api/verify/comments?token=valid-token&action=manage');
      const response = await GET(request);

      expect(response.status).toBe(307); // Redirect
      expect(response.headers.get('Location')).toContain('/verify/comments?token=valid-token');
      
      expect(prisma.comment.updateMany).not.toHaveBeenCalled();
    });

    it('should return error for missing token', async () => {
      const request = new NextRequest('http://localhost:3000/api/verify/comments?action=hide');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Token is required');
    });

    it('should return error for invalid action', async () => {
      const request = new NextRequest('http://localhost:3000/api/verify/comments?token=valid-token&action=invalid');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid action');
    });

    it('should return error for invalid token', async () => {
      (verifyToken as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/verify/comments?token=invalid-token&action=hide');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Invalid or expired token');
    });

    it('should handle database errors gracefully', async () => {
      const mockToken = {
        id: 'token-1',
        email: 'test@example.com',
        isActive: true,
      };

      (verifyToken as jest.Mock).mockResolvedValue(mockToken);
      (prisma.comment.updateMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/verify/comments?token=valid-token&action=hide');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Verification failed');
    });
  });
});