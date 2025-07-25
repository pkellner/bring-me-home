import {
  toggleEmailOptOut,
  getEmailOptOuts,
  toggleGlobalEmailOptOut,
  createUsersFromCommentEmails,
  getPersonFollowers,
  sendUpdateEmail,
  getEmailStats,
  retryFailedEmails,
} from '../email-notifications';

// Mock dependencies at the top level
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/permissions', () => ({
  isSiteAdmin: jest.fn((session) => {
    return session?.user?.roles?.some((role: { name: string }) => role.name === 'site-admin');
  }),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    emailOptOut: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    comment: {
      findMany: jest.fn(),
    },
    personHistory: {
      findUnique: jest.fn(),
    },
    emailNotification: {
      createMany: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
      fields: {
        maxRetries: 3,
      },
    },
  },
}));

// Import after mocks are set up
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

const mockGetServerSession = getServerSession as jest.Mock;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

enum EmailStatus {
  QUEUED = 'QUEUED',
  SENDING = 'SENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED',
  OPENED = 'OPENED',
}

describe('Email Notifications Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('toggleEmailOptOut', () => {
    it('should create opt-out when optOut is true', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1' },
      });

      const result = await toggleEmailOptOut('person1', true);

      expect(mockPrisma.emailOptOut.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          personId: 'person1',
        },
      });
      expect(result).toEqual({ success: true });
    });

    it('should delete opt-out when optOut is false', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1' },
      });

      const result = await toggleEmailOptOut('person1', false);

      expect(mockPrisma.emailOptOut.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
          personId: 'person1',
        },
      });
      expect(result).toEqual({ success: true });
    });

    it('should throw error when no session', async () => {
      mockGetServerSession.mockResolvedValue(null);

      await expect(toggleEmailOptOut('person1', true)).rejects.toThrow('Unauthorized');
    });
  });

  describe('getEmailOptOuts', () => {
    it('should return email opt-out preferences', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1' },
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user1',
        optOutOfAllEmail: true,
        emailOptOuts: [
          { personId: 'person1' },
          { personId: 'person2' },
        ],
      } as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>);

      const result = await getEmailOptOuts();

      expect(result).toEqual({
        globalOptOut: true,
        personOptOuts: ['person1', 'person2'],
      });
    });

    it('should handle null user', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1' },
      });

      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await getEmailOptOuts();

      expect(result).toEqual({
        globalOptOut: false,
        personOptOuts: [],
      });
    });
  });

  describe('toggleGlobalEmailOptOut', () => {
    it('should update global email opt-out preference', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1' },
      });

      mockPrisma.user.update.mockResolvedValue({} as unknown as Awaited<ReturnType<typeof prisma.user.update>>);

      const result = await toggleGlobalEmailOptOut(true);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: { optOutOfAllEmail: true },
      });
      expect(result).toEqual({ success: true });
    });

    it('should handle database errors', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1' },
      });

      mockPrisma.user.update.mockRejectedValue(new Error('DB Error'));

      const result = await toggleGlobalEmailOptOut(true);

      expect(result).toEqual({
        success: false,
        error: 'Failed to update email preferences',
      });
    });
  });

  describe('createUsersFromCommentEmails', () => {
    it('should create users from comment emails', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', roles: [{ name: 'site-admin' }] },
      });

      mockPrisma.comment.findMany.mockResolvedValue([
        { email: 'user1@example.com', firstName: 'John', lastName: 'Doe' },
        { email: 'user2@example.com', firstName: 'Jane', lastName: 'Smith' },
        { email: 'user1@example.com', firstName: 'John', lastName: 'Doe' }, // Duplicate
      ] as unknown as Awaited<ReturnType<typeof prisma.user.findMany>>);

      mockPrisma.user.findMany.mockResolvedValue([
        { email: 'user1@example.com' }, // Already exists
      ] as unknown as Awaited<ReturnType<typeof prisma.user.findMany>>);

      mockPrisma.user.createMany.mockResolvedValue({ count: 1 });

      const result = await createUsersFromCommentEmails();

      expect(mockPrisma.user.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            username: 'user2@example.com',
            email: 'user2@example.com',
            firstName: 'Jane',
            lastName: 'Smith',
            isActive: true,
          }),
        ]),
        skipDuplicates: true,
      });

      expect(result).toEqual({
        success: true,
        created: 1,
        skipped: 1,
      });
    });

    it('should require site admin role', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1', roles: [{ name: 'town-admin' }] },
      });

      await expect(createUsersFromCommentEmails()).rejects.toThrow('Unauthorized');
    });
  });

  describe('getPersonFollowers', () => {
    it('should return followers who have not opted out', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', roles: [{ name: 'site-admin' }] },
      });

      mockPrisma.comment.findMany.mockResolvedValue([
        { email: 'user1@example.com' },
        { email: 'user2@example.com' },
      ] as unknown as Awaited<ReturnType<typeof prisma.user.findMany>>);

      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'user1',
          email: 'user1@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
      ] as unknown as Awaited<ReturnType<typeof prisma.user.findMany>>);

      const result = await getPersonFollowers('person1');

      expect(mockPrisma.comment.findMany).toHaveBeenCalledWith({
        where: {
          personId: 'person1',
          email: { not: null },
        },
        select: { email: true },
        distinct: ['email'],
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          email: { in: ['user1@example.com', 'user2@example.com'] },
          optOutOfAllEmail: false,
          NOT: {
            emailOptOuts: {
              some: { personId: 'person1' },
            },
          },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'user1',
        email: 'user1@example.com',
      });
    });
  });

  describe('sendUpdateEmail', () => {
    it('should queue emails for followers', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', roles: [{ name: 'site-admin' }] },
      });

      const mockUpdate = {
        id: 'history1',
        personId: 'person1',
        description: 'Update description',
        date: new Date('2024-01-01'),
        person: {
          id: 'person1',
          firstName: 'John',
          lastName: 'Doe',
          town: {
            name: 'Springfield',
            state: 'IL',
            slug: 'springfield',
          },
          slug: 'john-doe',
          personImages: [],
        },
      };

      mockPrisma.personHistory.findUnique.mockResolvedValue(mockUpdate as unknown as Awaited<ReturnType<typeof prisma.personHistory.findUnique>>);

      // Mock getPersonFollowers indirectly through comment/user queries
      mockPrisma.comment.findMany.mockResolvedValue([
        { email: 'follower@example.com' },
      ] as unknown as Awaited<ReturnType<typeof prisma.user.findMany>>);

      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'follower1',
          email: 'follower@example.com',
          firstName: 'Follower',
          lastName: 'User',
        },
      ] as unknown as Awaited<ReturnType<typeof prisma.user.findMany>>);

      mockPrisma.emailNotification.createMany.mockResolvedValue({ count: 1 });

      const result = await sendUpdateEmail('history1');

      expect(mockPrisma.emailNotification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: 'follower1',
            personId: 'person1',
            personHistoryId: 'history1',
            subject: 'Update on John Doe',
            status: EmailStatus.QUEUED,
          }),
        ]),
      });

      expect(result).toEqual({
        success: true,
        emailsQueued: 1,
      });
    });

    it('should handle update not found', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', roles: [{ name: 'site-admin' }] },
      });

      mockPrisma.personHistory.findUnique.mockResolvedValue(null);

      const result = await sendUpdateEmail('invalid-id');

      expect(result).toEqual({
        success: false,
        error: 'Failed to queue emails',
      });
    });
  });

  describe('getEmailStats', () => {
    it('should return email statistics', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', roles: [{ name: 'site-admin' }] },
      });

      mockPrisma.emailNotification.groupBy.mockResolvedValue([
        { status: EmailStatus.QUEUED, _count: { id: 10 } },
        { status: EmailStatus.SENT, _count: { id: 20 } },
        { status: EmailStatus.FAILED, _count: { id: 5 } },
      ] as unknown as Array<{ status: EmailStatus; _count: { id: number } }>);

      mockPrisma.emailNotification.count.mockResolvedValue(35);

      const result = await getEmailStats();

      expect(result).toEqual({
        total: 35,
        byStatus: {
          QUEUED: 10,
          SENT: 20,
          FAILED: 5,
        },
      });
    });
  });

  describe('retryFailedEmails', () => {
    it('should retry failed emails', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', roles: [{ name: 'site-admin' }] },
      });

      mockPrisma.emailNotification.updateMany.mockResolvedValue({ count: 5 });

      const result = await retryFailedEmails();

      expect(mockPrisma.emailNotification.updateMany).toHaveBeenCalledWith({
        where: {
          status: EmailStatus.FAILED,
          retryCount: { lt: 3 },
        },
        data: {
          status: EmailStatus.QUEUED,
          errorMessage: null,
        },
      });

      expect(result).toEqual({
        success: true,
        retriedCount: 5,
      });
    });

    it('should retry specific email IDs', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', roles: [{ name: 'site-admin' }] },
      });

      mockPrisma.emailNotification.updateMany.mockResolvedValue({ count: 2 });

      const result = await retryFailedEmails(['email1', 'email2']);

      expect(mockPrisma.emailNotification.updateMany).toHaveBeenCalledWith({
        where: {
          status: EmailStatus.FAILED,
          retryCount: { lt: 3 },
          id: { in: ['email1', 'email2'] },
        },
        data: {
          status: EmailStatus.QUEUED,
          errorMessage: null,
        },
      });

      expect(result).toEqual({
        success: true,
        retriedCount: 2,
      });
    });
  });
});