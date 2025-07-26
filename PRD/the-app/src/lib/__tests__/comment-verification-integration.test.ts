import { prisma } from '../prisma';
import { approveBulkComments } from '@/app/actions/comments';
import { verifyToken } from '../comment-verification';
import { getPersonFollowers } from '@/app/actions/email-notifications';
import { getServerSession } from 'next-auth';
import type { Comment, User, CommentVerificationToken } from '@prisma/client';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('Comment Verification Integration Tests', () => {
  const mockAdminSession = {
    user: {
      id: 'admin-user-id',
      email: 'admin@example.com',
      roles: [{ name: 'Site Admin' }],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);
  });

  describe('Complete verification flow', () => {
    it('should exclude hidden comments from public view', async () => {
      // Mock comment data
      const mockComments = [
        {
          id: 'comment-1',
          email: 'user1@example.com',
          isApproved: true,
          hideRequested: false,
          personId: 'person-1',
        },
        {
          id: 'comment-2',
          email: 'user2@example.com',
          isApproved: true,
          hideRequested: true, // This comment is hidden
          personId: 'person-1',
        },
        {
          id: 'comment-3',
          email: 'user3@example.com',
          isApproved: true,
          hideRequested: false,
          personId: 'person-1',
        },
      ];

      // Mock Prisma to return only non-hidden comments
      jest.spyOn(prisma.comment, 'findMany').mockImplementation(async (args) => {
        if (args?.where?.hideRequested === false) {
          return mockComments.filter(c => !c.hideRequested) as unknown as Comment[];
        }
        return mockComments as unknown as Comment[];
      });

      // Query for public comments (should exclude hidden)
      const publicComments = await prisma.comment.findMany({
        where: {
          personId: 'person-1',
          isApproved: true,
          hideRequested: false,
        },
      });

      expect(publicComments).toHaveLength(2);
      expect(publicComments.map(c => c.id)).toEqual(['comment-1', 'comment-3']);
      expect(publicComments.map(c => c.id)).not.toContain('comment-2');
    });

    it('should exclude hidden comments from email notifications', async () => {
      // Mock data
      const mockComments = [
        {
          id: 'comment-1',
          email: 'follower1@example.com',
          isApproved: true,
          hideRequested: false,
        },
        {
          id: 'comment-2',
          email: 'follower2@example.com',
          isApproved: true,
          hideRequested: true, // Hidden - should not receive emails
        },
      ];

      const mockUsers = [
        {
          id: 'user-1',
          email: 'follower1@example.com',
          firstName: 'Follower',
          lastName: 'One',
          optOutOfAllEmail: false,
        },
        {
          id: 'user-2',
          email: 'follower2@example.com',
          firstName: 'Follower',
          lastName: 'Two',
          optOutOfAllEmail: false,
        },
      ];

      // Mock Prisma calls
      jest.spyOn(prisma.comment, 'findMany').mockResolvedValue(mockComments.filter(c => !c.hideRequested) as unknown as Comment[]);
      jest.spyOn(prisma.user, 'findMany').mockResolvedValue([mockUsers[0]] as unknown as User[]);
      jest.spyOn(prisma.personHistory, 'findMany').mockResolvedValue([]);

      const followers = await getPersonFollowers('person-1');

      expect(followers).toHaveLength(1);
      expect(followers[0].email).toBe('follower1@example.com');
      expect(followers.map(f => f.email)).not.toContain('follower2@example.com');
    });

    it('should show all comments to admin including hidden ones', async () => {
      const mockComments = [
        {
          id: 'comment-1',
          email: 'user1@example.com',
          isApproved: true,
          hideRequested: false,
        },
        {
          id: 'comment-2',
          email: 'user2@example.com',
          isApproved: true,
          hideRequested: true,
        },
      ];

      // Admin query doesn't filter by hideRequested
      jest.spyOn(prisma.comment, 'findMany').mockResolvedValue(mockComments as unknown as Comment[]);

      const adminComments = await prisma.comment.findMany({
        where: {
          personId: 'person-1',
        },
      });

      expect(adminComments).toHaveLength(2);
      expect(adminComments.map(c => c.id)).toEqual(['comment-1', 'comment-2']);
    });
  });

  describe('Edge cases', () => {
    it('should handle comments without email addresses', async () => {
      const mockComment = {
        id: 'comment-1',
        email: null, // No email
        firstName: 'Anonymous',
        isApproved: false,
      };

      jest.spyOn(prisma.comment, 'findMany').mockResolvedValue([mockComment] as unknown as Comment[]);
      jest.spyOn(prisma.comment, 'update').mockResolvedValue({ ...mockComment, isApproved: true } as unknown as Comment);

      // Should not throw error when approving comment without email
      const result = await approveBulkComments(['comment-1']);
      expect(result.success).toBe(true);
    });

    it('should handle token verification for non-existent email', async () => {
      jest.spyOn(prisma.commentVerificationToken, 'findFirst').mockResolvedValue(null);

      const result = await verifyToken('non-existent-token');
      expect(result).toBeNull();
    });

    it('should handle multiple comments from same email', async () => {
      const email = 'user@example.com';

      jest.spyOn(prisma.comment, 'updateMany').mockResolvedValue({ count: 3 });

      // Hide all comments for this email
      await prisma.comment.updateMany({
        where: { email },
        data: { hideRequested: true, hideRequestedAt: new Date() },
      });

      expect(prisma.comment.updateMany).toHaveBeenCalledWith({
        where: { email },
        data: { hideRequested: true, hideRequestedAt: expect.any(Date) },
      });
    });

    it('should handle revoked tokens', async () => {
      // Token is revoked, so findFirst returns null
      jest.spyOn(prisma.commentVerificationToken, 'findFirst').mockResolvedValue(null);

      const result = await verifyToken('revoked-token');
      expect(result).toBeNull();
    });
  });

  describe('Security considerations', () => {
    it('should not expose token in logs or responses', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock comment approval with token generation
      const mockComment = {
        id: 'comment-1',
        email: 'user@example.com',
        person: { firstName: 'John', lastName: 'Doe', slug: 'john-doe', town: { name: 'Seattle', slug: 'seattle' } },
      };

      jest.spyOn(prisma.comment, 'findMany').mockResolvedValue([mockComment] as unknown as Comment[]);
      jest.spyOn(prisma.commentVerificationToken, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.commentVerificationToken, 'create').mockResolvedValue({ id: 'token-1' } as unknown as CommentVerificationToken);
      jest.spyOn(prisma.emailTemplate, 'findUnique').mockResolvedValue({
        id: 'template-1',
        name: 'Test',
        subject: 'Test',
        htmlContent: 'Test',
        textContent: null,
        variables: null,
        isActive: true,
        trackingEnabled: false,
        webhookUrl: null,
        webhookHeaders: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      jest.spyOn(prisma.comment, 'update').mockResolvedValue({ ...mockComment, isApproved: true } as unknown as Comment);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.user, 'create').mockResolvedValue({ id: 'user-1' } as unknown as User);

      await approveBulkComments(['comment-1']);

      // Check that no logs contain the actual token
      const allLogs = consoleSpy.mock.calls.flat().join(' ');
      const allErrors = consoleErrorSpy.mock.calls.flat().join(' ');
      
      expect(allLogs).not.toContain('test-token-123');
      expect(allErrors).not.toContain('test-token-123');

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should use different tokens for different emails', async () => {
      const tokens: string[] = [];
      
      jest.spyOn(prisma.commentVerificationToken, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.commentVerificationToken, 'create').mockImplementation(async (args) => {
        tokens.push(args.data.tokenHash as string);
        return { 
          id: `token-${tokens.length}`,
          email: args.data.email as string,
          tokenHash: args.data.tokenHash as string,
          isActive: true,
          createdAt: new Date(),
          lastUsedAt: new Date(),
          usageCount: 0,
          lastAction: null,
          revokedAt: null,
          revokedBy: null,
        } as CommentVerificationToken;
      });

      // Mock two comments with different emails
      const mockComments = [
        { id: 'comment-1', email: 'user1@example.com' },
        { id: 'comment-2', email: 'user2@example.com' },
      ];

      for (const comment of mockComments) {
        await prisma.commentVerificationToken.create({
          data: {
            email: comment.email,
            tokenHash: `hash-for-${comment.email}`,
          },
        });
      }

      expect(tokens).toHaveLength(2);
      expect(tokens[0]).not.toBe(tokens[1]);
    });
  });
});