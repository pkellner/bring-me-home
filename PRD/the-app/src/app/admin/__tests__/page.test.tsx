import AdminDashboard from '../page';

// Mock all server-side dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn().mockResolvedValue({
    user: {
      id: '1',
      username: 'testuser',
      firstName: 'Test',
      roles: [{ name: 'admin' }],
      townAccess: [],
      personAccess: []
    }
  })
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {}
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { count: jest.fn().mockResolvedValue(5) },
    town: { count: jest.fn().mockResolvedValue(10) },
    person: { count: jest.fn().mockResolvedValue(20) },
    comment: { count: jest.fn().mockResolvedValue(30) }
  }
}));

jest.mock('@/lib/permissions', () => ({
  hasPermission: jest.fn().mockReturnValue(true),
  hasRole: jest.fn().mockReturnValue(true)
}));

jest.mock('@/lib/config', () => ({
  getSiteTextConfig: jest.fn().mockResolvedValue({
    admin_detained_persons_title: 'Detained Persons'
  })
}));

describe('AdminDashboard', () => {
  it('should be defined', () => {
    expect(AdminDashboard).toBeDefined();
  });

  it('should be an async function', () => {
    expect(AdminDashboard.constructor.name).toBe('AsyncFunction');
  });
});

const testExport = {};
export default testExport;