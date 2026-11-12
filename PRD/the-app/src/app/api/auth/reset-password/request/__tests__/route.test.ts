/**
 * The password reset request finds the account by the normalised email (issue #1 step 1).
 */
import { POST } from '../route';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    passwordResetToken: { findFirst: jest.fn(), create: jest.fn() },
    emailTemplate: { findUnique: jest.fn() },
    emailNotification: { create: jest.fn() },
  },
}));
jest.mock('@/lib/email-opt-out-tokens', () => ({ generateOptOutToken: jest.fn(async () => 'opt-out') }));

const findUnique = prisma.user.findUnique as jest.Mock;

const post = (body: unknown) => POST(new Request('http://localhost/api/auth/reset-password/request', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe('POST /api/auth/reset-password/request', () => {
  it('looks the account up by the trimmed, lowercased email', async () => {
    findUnique.mockResolvedValue(null);
    const response = await post({ email: '  Joe@Example.COM\n' });
    expect(findUnique).toHaveBeenCalledWith({ where: { email: 'joe@example.com' } });
    expect(await response.json()).toEqual({ success: true });
  });

  it('finds the stored account for a space-padded address and creates a reset token for it', async () => {
    findUnique.mockImplementation(async ({ where }: { where: { email: string } }) =>
      where.email === 'joe@example.com' ? { id: 'user-1', email: 'joe@example.com', firstName: 'Joe' } : null);
    (prisma.passwordResetToken.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.passwordResetToken.create as jest.Mock).mockResolvedValue({ token: 't' });

    await post({ email: ' joe@example.com ' });
    expect(prisma.passwordResetToken.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'user-1' }) }));
  });
});
