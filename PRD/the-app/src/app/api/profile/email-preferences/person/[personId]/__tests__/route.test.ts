import { PUT } from '../route';
import { getServerSession } from 'next-auth';
import { toggleEmailOptOut } from '@/app/actions/email-notifications';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/app/actions/email-notifications');

const mockGetServerSession = getServerSession as jest.Mock;
const mockToggleEmailOptOut = toggleEmailOptOut as jest.Mock;

describe('PUT /api/profile/email-preferences/person/[personId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update person-specific email opt-out preference', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user1' },
    });

    mockToggleEmailOptOut.mockResolvedValue({ success: true });

    const request = new Request('http://localhost:3000/api/profile/email-preferences/person/person1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optOut: true }),
    });

    const params = Promise.resolve({ personId: 'person1' });
    const response = await PUT(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockToggleEmailOptOut).toHaveBeenCalledWith('person1', true);
  });

  it('should return 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new Request('http://localhost:3000/api/profile/email-preferences/person/person1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optOut: true }),
    });

    const params = Promise.resolve({ personId: 'person1' });
    const response = await PUT(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  it('should validate request body', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user1' },
    });

    const request = new Request('http://localhost:3000/api/profile/email-preferences/person/person1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optOut: 'not-a-boolean' }),
    });

    const params = Promise.resolve({ personId: 'person1' });
    const response = await PUT(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Invalid request body' });
  });

  it('should handle action failures', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user1' },
    });

    mockToggleEmailOptOut.mockResolvedValue({
      success: false,
      error: 'Database error',
    });

    const request = new Request('http://localhost:3000/api/profile/email-preferences/person/person1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optOut: true }),
    });

    const params = Promise.resolve({ personId: 'person1' });
    const response = await PUT(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Database error' });
  });
});