import { approveBulkComments } from '../comments';
import { sendEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    comment: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    commentVerificationToken: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    emailTemplate: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn(),
}));

jest.mock('@/lib/comment-verification', () => ({
  generateVerificationToken: jest.fn(() => 'test-token-123'),
  hashToken: jest.fn((token) => `hash-${token}`),
  generateVerificationUrls: jest.fn(() => ({
    verificationUrl: 'https://example.com/town/person#comment-123',
    hideUrl: 'https://example.com/verify/comments?token=test-token-123&action=hide',
    manageUrl: 'https://example.com/verify/comments?token=test-token-123&action=manage',
  })),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('Comment Approval with Email Verification', () => {
  const mockSession = {
    user: {
      id: 'admin-user-id',
      email: 'admin@example.com',
      roles: [{ name: 'Site Admin' }],
    },
  };

  const mockEmailTemplate = {
    id: 'template-1',
    name: 'comment_verification',
    subject: 'Your comment on {{personName}} has been approved',
    htmlContent: '<p>Hello {{recipientName}}, your comment has been approved. View it here: {{verificationUrl}}</p>',
    textContent: 'Hello {{recipientName}}, your comment has been approved. View it here: {{verificationUrl}}',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXTAUTH_URL = 'https://example.com';
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
  });

  describe('approveBulkComments with email sending', () => {
    it('should send verification email when comment has email address', async () => {
      const mockComment = {
        id: 'comment-1',
        email: 'commenter@example.com',
        firstName: 'John',
        lastName: 'Doe',
        content: 'Great work!',
        userId: null,
        person: {
          id: 'person-1',
          firstName: 'Jane',
          lastName: 'Smith',
          slug: 'jane-smith',
          town: {
            id: 'town-1',
            name: 'Seattle',
            slug: 'seattle',
          },
        },
      };

      (prisma.comment.findMany as jest.Mock).mockResolvedValue([mockComment]);
      (prisma.commentVerificationToken.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.commentVerificationToken.create as jest.Mock).mockResolvedValue({ id: 'token-1' });
      (prisma.emailTemplate.findUnique as jest.Mock).mockResolvedValue(mockEmailTemplate);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({ id: 'new-user-1' });
      (prisma.comment.update as jest.Mock).mockResolvedValue({ ...mockComment, isApproved: true });
      (sendEmail as jest.Mock).mockResolvedValue(true);

      const result = await approveBulkComments(['comment-1']);

      expect(result.success).toBe(true);
      
      // Verify token was created
      expect(prisma.commentVerificationToken.create).toHaveBeenCalledWith({
        data: {
          email: 'commenter@example.com',
          tokenHash: 'hash-test-token-123',
        },
      });

      // Verify email was sent
      expect(sendEmail).toHaveBeenCalledWith({
        to: 'commenter@example.com',
        subject: 'Your comment on Jane Smith has been approved',
        html: expect.stringContaining('Hello John Doe'),
        text: expect.stringContaining('Hello John Doe'),
      });
    });

    it('should reuse existing token for same email', async () => {
      const existingToken = {
        id: 'existing-token-1',
        email: 'commenter@example.com',
        tokenHash: 'existing-hash',
        isActive: true,
      };

      const mockComment = {
        id: 'comment-1',
        email: 'commenter@example.com',
        firstName: 'John',
        lastName: 'Doe',
        content: 'Great work!',
        userId: null,
        person: {
          id: 'person-1',
          firstName: 'Jane',
          lastName: 'Smith',
          slug: 'jane-smith',
          town: {
            id: 'town-1',
            name: 'Seattle',
            slug: 'seattle',
          },
        },
      };

      (prisma.comment.findMany as jest.Mock).mockResolvedValue([mockComment]);
      (prisma.commentVerificationToken.findFirst as jest.Mock).mockResolvedValue(existingToken);
      (prisma.commentVerificationToken.update as jest.Mock).mockResolvedValue({ ...existingToken, tokenHash: 'hash-test-token-123' });
      (prisma.emailTemplate.findUnique as jest.Mock).mockResolvedValue(mockEmailTemplate);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing-user' });
      (prisma.comment.update as jest.Mock).mockResolvedValue({ ...mockComment, isApproved: true });
      (sendEmail as jest.Mock).mockResolvedValue(true);

      const result = await approveBulkComments(['comment-1']);

      expect(result.success).toBe(true);
      
      // Verify token was updated, not created
      expect(prisma.commentVerificationToken.create).not.toHaveBeenCalled();
      expect(prisma.commentVerificationToken.update).toHaveBeenCalledWith({
        where: { id: 'existing-token-1' },
        data: {
          tokenHash: 'hash-test-token-123',
          lastUsedAt: expect.any(Date),
        },
      });

      // Verify email was still sent
      expect(sendEmail).toHaveBeenCalled();
    });

    it('should not send email when comment has no email address', async () => {
      const mockComment = {
        id: 'comment-1',
        email: null,
        firstName: 'Anonymous',
        lastName: null,
        content: 'Great work!',
        userId: null,
        person: {
          id: 'person-1',
          firstName: 'Jane',
          lastName: 'Smith',
          slug: 'jane-smith',
          town: {
            id: 'town-1',
            name: 'Seattle',
            slug: 'seattle',
          },
        },
      };

      (prisma.comment.findMany as jest.Mock).mockResolvedValue([mockComment]);
      (prisma.comment.update as jest.Mock).mockResolvedValue({ ...mockComment, isApproved: true });

      const result = await approveBulkComments(['comment-1']);

      expect(result.success).toBe(true);
      expect(sendEmail).not.toHaveBeenCalled();
      expect(prisma.commentVerificationToken.create).not.toHaveBeenCalled();
    });

    it('should continue approval even if email sending fails', async () => {
      const mockComment = {
        id: 'comment-1',
        email: 'commenter@example.com',
        firstName: 'John',
        lastName: 'Doe',
        content: 'Great work!',
        userId: null,
        person: {
          id: 'person-1',
          firstName: 'Jane',
          lastName: 'Smith',
          slug: 'jane-smith',
          town: {
            id: 'town-1',
            name: 'Seattle',
            slug: 'seattle',
          },
        },
      };

      (prisma.comment.findMany as jest.Mock).mockResolvedValue([mockComment]);
      (prisma.commentVerificationToken.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.commentVerificationToken.create as jest.Mock).mockResolvedValue({ id: 'token-1' });
      (prisma.emailTemplate.findUnique as jest.Mock).mockResolvedValue(mockEmailTemplate);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({ id: 'new-user-1' });
      (prisma.comment.update as jest.Mock).mockResolvedValue({ ...mockComment, isApproved: true });
      (sendEmail as jest.Mock).mockRejectedValue(new Error('Email service down'));

      const result = await approveBulkComments(['comment-1']);

      // Should still succeed even though email failed
      expect(result.success).toBe(true);
      expect(prisma.comment.update).toHaveBeenCalled();
    });

    it('should not send email if template is missing', async () => {
      const mockComment = {
        id: 'comment-1',
        email: 'commenter@example.com',
        firstName: 'John',
        lastName: 'Doe',
        content: 'Great work!',
        userId: null,
        person: {
          id: 'person-1',
          firstName: 'Jane',
          lastName: 'Smith',
          slug: 'jane-smith',
          town: {
            id: 'town-1',
            name: 'Seattle',
            slug: 'seattle',
          },
        },
      };

      (prisma.comment.findMany as jest.Mock).mockResolvedValue([mockComment]);
      (prisma.commentVerificationToken.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.commentVerificationToken.create as jest.Mock).mockResolvedValue({ id: 'token-1' });
      (prisma.emailTemplate.findUnique as jest.Mock).mockResolvedValue(null); // No template
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({ id: 'new-user-1' });
      (prisma.comment.update as jest.Mock).mockResolvedValue({ ...mockComment, isApproved: true });

      const result = await approveBulkComments(['comment-1']);

      expect(result.success).toBe(true);
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('should handle multiple comments with different scenarios', async () => {
      const mockComments = [
        {
          id: 'comment-1',
          email: 'user1@example.com',
          firstName: 'User',
          lastName: 'One',
          content: 'Comment 1',
          userId: null,
          person: {
            id: 'person-1',
            firstName: 'Jane',
            lastName: 'Smith',
            slug: 'jane-smith',
            town: { id: 'town-1', name: 'Seattle', slug: 'seattle' },
          },
        },
        {
          id: 'comment-2',
          email: null, // No email
          firstName: 'Anonymous',
          lastName: null,
          content: 'Comment 2',
          userId: null,
          person: {
            id: 'person-1',
            firstName: 'Jane',
            lastName: 'Smith',
            slug: 'jane-smith',
            town: { id: 'town-1', name: 'Seattle', slug: 'seattle' },
          },
        },
        {
          id: 'comment-3',
          email: 'user1@example.com', // Same email as comment-1
          firstName: 'User',
          lastName: 'One',
          content: 'Comment 3',
          userId: null,
          person: {
            id: 'person-2',
            firstName: 'Bob',
            lastName: 'Jones',
            slug: 'bob-jones',
            town: { id: 'town-1', name: 'Seattle', slug: 'seattle' },
          },
        },
      ];

      (prisma.comment.findMany as jest.Mock).mockResolvedValue(mockComments);
      (prisma.commentVerificationToken.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // First call for user1@example.com
        .mockResolvedValueOnce({ id: 'token-1', email: 'user1@example.com' }); // Second call for same email
      (prisma.commentVerificationToken.create as jest.Mock).mockResolvedValue({ id: 'token-1' });
      (prisma.commentVerificationToken.update as jest.Mock).mockResolvedValue({ id: 'token-1' });
      (prisma.emailTemplate.findUnique as jest.Mock).mockResolvedValue(mockEmailTemplate);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({ id: 'new-user-1' });
      (prisma.comment.update as jest.Mock).mockImplementation((args) => 
        Promise.resolve({ ...mockComments.find(c => c.id === args.where.id), isApproved: true })
      );
      (sendEmail as jest.Mock).mockResolvedValue(true);

      const result = await approveBulkComments(['comment-1', 'comment-2', 'comment-3']);

      expect(result.success).toBe(true);
      
      // Should create token only once for user1@example.com
      expect(prisma.commentVerificationToken.create).toHaveBeenCalledTimes(1);
      
      // Should send email twice (once for each comment with email)
      expect(sendEmail).toHaveBeenCalledTimes(2);
      
      // All comments should be approved
      expect(prisma.comment.update).toHaveBeenCalledTimes(3);
    });
  });
});