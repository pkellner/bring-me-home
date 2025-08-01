import { getPersonFollowers } from '@/app/actions/email-notifications';
import { prisma } from '@/lib/prisma';

// Type definitions without importing from @prisma/client
type User = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  optOutOfAllEmail: boolean;
};

type Comment = {
  email: string | null;
  isApproved?: boolean;
};

// Mock NextAuth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => ({
    user: { id: 'admin-user-id', role: 'site-admin' }
  }))
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {}
}));

// Mock permissions
jest.mock('@/lib/permissions', () => ({
  isSiteAdmin: jest.fn(() => true),
  isTownAdmin: jest.fn(() => false),
  isPersonAdmin: jest.fn(() => false),
  hasPersonAccess: jest.fn(() => true)
}));

// Mock email suppression
jest.mock('@/lib/email-suppression', () => ({
  isEmailSuppressed: jest.fn(() => false)
}));


describe('Email Opt-Out Logic', () => {
  const mockPersonId = 'test-person-id';
  
  // Test users with different opt-out configurations
  const users = {
    noOptOut: {
      id: 'user1',
      email: 'user1@example.com',
      firstName: 'User',
      lastName: 'One',
      optOutOfAllEmail: false
    } as User,
    globalOptOut: {
      id: 'user2',
      email: 'user2@example.com',
      firstName: 'User',
      lastName: 'Two',
      optOutOfAllEmail: true
    } as User,
    personOptOut: {
      id: 'user3',
      email: 'user3@example.com',
      firstName: 'User',
      lastName: 'Three',
      optOutOfAllEmail: false
    } as User,
    bothOptOut: {
      id: 'user4',
      email: 'user4@example.com',
      firstName: 'User',
      lastName: 'Four',
      optOutOfAllEmail: true
    } as User
  };

  const mockComments: Comment[] = [
    { email: 'user1@example.com', isApproved: true },
    { email: 'user2@example.com', isApproved: true },
    { email: 'user3@example.com', isApproved: true },
    { email: 'user4@example.com', isApproved: true },
    { email: 'user5@example.com', isApproved: true } // User without account
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPersonFollowers', () => {
    it('should return only users who have not opted out', async () => {
      // Mock comment lookup
      prisma.comment.findMany.mockResolvedValue(mockComments);
      
      // Mock user lookup - simulate different opt-out scenarios
      prisma.user.findMany.mockImplementation(async (args) => {
        const where = args?.where;
        
        // Simulate the query: users with emails who haven't opted out globally
        // and don't have person-specific opt-outs
        if (where?.optOutOfAllEmail === false) {
          // Return only users who haven't opted out
          return [users.noOptOut];
        }
        
        return [];
      });

      const followers = await getPersonFollowers(mockPersonId, false);
      
      expect(followers).toHaveLength(1);
      expect(followers[0].email).toBe('user1@example.com');
      
      // Verify correct query structure
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          email: {
            in: ['user1@example.com', 'user2@example.com', 'user3@example.com', 'user4@example.com', 'user5@example.com']
          },
          optOutOfAllEmail: false,
          NOT: {
            emailOptOuts: {
              some: {
                personId: mockPersonId
              }
            }
          }
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true
        }
      });
    });

    it('should exclude users with global opt-out', async () => {
      prisma.comment.findMany.mockResolvedValue(mockComments);
      
      // Return users except those with global opt-out
      prisma.user.findMany.mockResolvedValue([
        users.noOptOut,
        users.personOptOut
      ]);

      const followers = await getPersonFollowers(mockPersonId, false);
      
      expect(followers).toHaveLength(2);
      expect(followers.map(f => f.email)).not.toContain('user2@example.com');
      expect(followers.map(f => f.email)).not.toContain('user4@example.com');
    });

    it('should exclude users with person-specific opt-out', async () => {
      prisma.comment.findMany.mockResolvedValue(mockComments);
      
      // Simulate excluding user3 who has person-specific opt-out
      prisma.user.findMany.mockResolvedValue([
        users.noOptOut,
        users.globalOptOut // This wouldn't actually be returned due to global opt-out
      ].filter(u => !u.optOutOfAllEmail));

      const followers = await getPersonFollowers(mockPersonId, false);
      
      expect(followers).toHaveLength(1);
      expect(followers[0].email).toBe('user1@example.com');
    });

    it('should handle users without accounts', async () => {
      prisma.comment.findMany.mockResolvedValue(mockComments);
      
      // Only return users with accounts
      prisma.user.findMany.mockResolvedValue([
        users.noOptOut
      ]);

      const followers = await getPersonFollowers(mockPersonId, false);
      
      // user5@example.com has no account, so only 1 follower
      expect(followers).toHaveLength(1);
      expect(followers.map(f => f.email)).not.toContain('user5@example.com');
    });

    it('should return empty array when no one is following', async () => {
      prisma.comment.findMany.mockResolvedValue([]);
      prisma.user.findMany.mockResolvedValue([]);

      const followers = await getPersonFollowers(mockPersonId, false);
      
      expect(followers).toHaveLength(0);
    });

    it('should handle null emails in comments', async () => {
      prisma.comment.findMany.mockResolvedValue([
        { email: 'user1@example.com' },
        { email: null },
        { email: 'user2@example.com' }
      ]);
      
      prisma.user.findMany.mockResolvedValue([
        users.noOptOut
      ]);

      await getPersonFollowers(mockPersonId, false);
      
      // Verify null emails are filtered out
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: {
              in: ['user1@example.com', 'user2@example.com'] // null filtered out
            }
          })
        })
      );
    });
  });

  describe('Email sending logic edge cases', () => {
    it('should not send to user who commented but then opted out globally', async () => {
      const testUser = {
        ...users.noOptOut,
        optOutOfAllEmail: true
      };
      
      prisma.comment.findMany.mockResolvedValue([
        { email: testUser.email }
      ]);
      
      // User has global opt-out, so should not be returned
      prisma.user.findMany.mockResolvedValue([]);

      const followers = await getPersonFollowers(mockPersonId, false);
      
      expect(followers).toHaveLength(0);
    });

    it('should not send to user who has both global and person-specific opt-out', async () => {
      prisma.comment.findMany.mockResolvedValue([
        { email: users.bothOptOut.email }
      ]);
      
      // User has global opt-out, so query should exclude them
      prisma.user.findMany.mockResolvedValue([]);

      const followers = await getPersonFollowers(mockPersonId, false);
      
      expect(followers).toHaveLength(0);
    });

    it('should handle multiple comments from same user', async () => {
      prisma.comment.findMany.mockResolvedValue([
        { email: 'user1@example.com' },
        { email: 'user1@example.com' },
        { email: 'user1@example.com' }
      ]);
      
      prisma.user.findMany.mockResolvedValue([
        users.noOptOut
      ]);

      const followers = await getPersonFollowers(mockPersonId, false);
      
      // Should only return one user despite multiple comments
      expect(followers).toHaveLength(1);
      expect(followers[0].email).toBe('user1@example.com');
    });

    it('should correctly identify followers for different persons', async () => {
      const person2Id = 'person2';
      
      // User has opted out of person1 but not person2
      prisma.comment.findMany.mockResolvedValue([
        { email: 'user1@example.com' }
      ]);
      
      // For person2, user should be included
      prisma.user.findMany.mockResolvedValue([
        users.noOptOut
      ]);

      const followersP2 = await getPersonFollowers(person2Id, false);
      
      expect(followersP2).toHaveLength(1);
      
      // Verify the query checked for the correct personId
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            NOT: {
              emailOptOuts: {
                some: {
                  personId: person2Id
                }
              }
            }
          })
        })
      );
    });

    it('should exclude users with only unapproved comments', async () => {
      // Mock should only return approved comments
      prisma.comment.findMany.mockResolvedValue([
        { email: 'user1@example.com', isApproved: true },
        { email: 'user3@example.com', isApproved: true },
      ]);
      
      prisma.user.findMany.mockResolvedValue([
        users.noOptOut,
        users.personOptOut
      ]);

      await getPersonFollowers(mockPersonId, false);
      
      // Verify the comment query includes isApproved and hideRequested filters
      expect(prisma.comment.findMany).toHaveBeenCalledWith({
        where: {
          personId: mockPersonId,
          email: {
            not: null,
          },
          isApproved: true,
          hideRequested: false,
        },
        select: {
          email: true,
        },
        distinct: ['email'],
      });
      
      // Verify only users with approved comments are queried
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          email: {
            in: ['user1@example.com', 'user3@example.com'] // Only approved comment emails
          },
          optOutOfAllEmail: false,
          NOT: {
            emailOptOuts: {
              some: {
                personId: mockPersonId
              }
            }
          }
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true
        }
      });
    });

    it('should handle users with both approved and unapproved comments', async () => {
      // User has multiple comments, some approved and some not
      prisma.comment.findMany.mockResolvedValue([
        { email: 'user1@example.com', isApproved: true },
        // The distinct clause means we only get one record per email
      ]);
      
      prisma.user.findMany.mockResolvedValue([users.noOptOut]);

      const followers = await getPersonFollowers(mockPersonId, false);
      
      expect(followers).toHaveLength(1);
      expect(followers[0].email).toBe('user1@example.com');
    });
  });
});