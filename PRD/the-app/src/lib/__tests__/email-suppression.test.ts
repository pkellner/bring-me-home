/**
 * email_suppressions.email is matched in its normal form, trimmed as well as lowercased
 * (issue #1 step 1; before, these lookups lowercased only).
 */
import {
  isEmailSuppressed, addToSuppressionList, areEmailsSuppressed, removeFromSuppressionList,
  SUPPRESSION_REASONS, SUPPRESSION_SOURCES,
} from '../email-suppression';
import { prisma } from '../prisma';

jest.mock('../prisma', () => ({
  prisma: {
    emailSuppression: { findUnique: jest.fn(), upsert: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
    user: { findUnique: jest.fn(), update: jest.fn() },
  },
}));

const suppression = prisma.emailSuppression;

beforeEach(() => jest.clearAllMocks());

describe('email suppression lookups', () => {
  it('isEmailSuppressed finds "bounced@example.com" for " Bounced@Example.com "', async () => {
    (suppression.findUnique as jest.Mock).mockImplementation(async ({ where }: { where: { email: string } }) =>
      where.email === 'bounced@example.com' ? { id: 's1' } : null);
    expect(await isEmailSuppressed(' Bounced@Example.com ')).toBe(true);
  });

  it('addToSuppressionList stores the normal form and opts out the matching user', async () => {
    (prisma.user.findUnique as jest.Mock).mockImplementation(async ({ where }: { where: { email: string } }) =>
      where.email === 'joe@example.com' ? { id: 'user-1' } : null);

    await addToSuppressionList({
      email: 'Joe@Example.com\n', reason: SUPPRESSION_REASONS.BOUNCE_PERMANENT, source: SUPPRESSION_SOURCES.SES_WEBHOOK,
    });
    expect(suppression.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { email: 'joe@example.com' },
      create: expect.objectContaining({ email: 'joe@example.com' }),
    }));
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'user-1' } }));
  });

  it('removeFromSuppressionList deletes the normal form', async () => {
    await removeFromSuppressionList('  Joe@Example.com');
    expect(suppression.delete).toHaveBeenCalledWith({ where: { email: 'joe@example.com' } });
  });

  it('areEmailsSuppressed queries the normal forms and answers for each address as given', async () => {
    (suppression.findMany as jest.Mock).mockResolvedValue([{ email: 'joe@example.com' }]);
    const result = await areEmailsSuppressed([' Joe@Example.com', 'ann@example.com']);
    expect(suppression.findMany).toHaveBeenCalledWith({
      where: { email: { in: ['joe@example.com', 'ann@example.com'] } },
      select: { email: true },
    });
    expect(result.get(' Joe@Example.com')).toBe(true);
    expect(result.get('ann@example.com')).toBe(false);
  });
});
