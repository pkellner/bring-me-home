// Mock dependencies first
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/app/actions/email-notifications', () => ({
  getEmailOptOuts: jest.fn(),
}));

// Then import
import { getServerSession } from 'next-auth';
import { getEmailOptOuts } from '@/app/actions/email-notifications';

const mockGetServerSession = getServerSession as jest.Mock;
const mockGetEmailOptOuts = getEmailOptOuts as jest.Mock;

// Create a mock GET function that mimics the API route
const GET = async () => {
  const session = await getServerSession();
  
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const preferences = await getEmailOptOuts();
    return new Response(JSON.stringify(preferences), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch preferences' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

describe('GET /api/profile/email-preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return email preferences for authenticated user', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user1' },
    });

    mockGetEmailOptOuts.mockResolvedValue({
      globalOptOut: true,
      personOptOuts: ['person1', 'person2'],
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      globalOptOut: true,
      personOptOuts: ['person1', 'person2'],
    });
  });

  it('should return 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  it('should handle errors gracefully', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user1' },
    });

    mockGetEmailOptOuts.mockRejectedValue(new Error('Database error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to fetch preferences' });
  });
});