import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { hashToken } from '@/lib/comment-verification';
import { sendUpdateEmail } from '../email-notifications';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/permissions', () => ({
  isSiteAdmin: jest.fn(() => true),
  isTownAdmin: jest.fn(() => false),
  isPersonAdmin: jest.fn(() => false),
  hasPersonAccess: jest.fn(async () => true),
}));

jest.mock('@/lib/email-opt-out-tokens', () => ({
  generateOptOutToken: jest.fn(async () => 'opt-out-token'),
}));

jest.mock('@/lib/email-suppression', () => ({
  isEmailSuppressed: jest.fn(async () => false),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    personHistory: { findUnique: jest.fn(), findMany: jest.fn() },
    comment: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
    emailTemplate: { findFirst: jest.fn(), findUnique: jest.fn() },
    magicLinkToken: { create: jest.fn() },
    commentVerificationToken: { upsert: jest.fn() },
    emailNotification: { createMany: jest.fn() },
  },
}));

const FOLLOWER_EMAIL = 'follower+news@example.com';

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXTAUTH_URL = 'https://app.example.test';
  (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'admin-1' } });
  (prisma.personHistory.findUnique as jest.Mock).mockResolvedValue({
    id: 'history-1',
    personId: 'person-1',
    title: 'Hearing date set',
    description: 'Details',
    date: new Date('2026-11-01T12:00:00Z'),
    person: {
      firstName: 'Ana',
      lastName: 'Lopez',
      slug: 'ana-lopez',
      town: { name: 'Julian', slug: 'julian' },
      personImages: [],
    },
  });
  (prisma.personHistory.findMany as jest.Mock).mockResolvedValue([{ id: 'history-1' }]);
  (prisma.comment.findMany as jest.Mock).mockResolvedValue([{ email: FOLLOWER_EMAIL }]);
  (prisma.user.findMany as jest.Mock).mockResolvedValue([
    { id: 'user-9', email: FOLLOWER_EMAIL, firstName: 'Sam', lastName: 'Lee' },
  ]);
  (prisma.emailTemplate.findFirst as jest.Mock).mockResolvedValue({
    id: 'template-1',
    subject: 'Update about {{personName}}',
    htmlContent: '<a href="{{hideUrl}}">Hide</a> <a href="{{manageUrl}}">Manage</a>',
    textContent: 'Hide: {{hideUrl}}\nManage: {{manageUrl}}',
  });
  (prisma.magicLinkToken.create as jest.Mock).mockResolvedValue({});
  (prisma.commentVerificationToken.upsert as jest.Mock).mockResolvedValue({});
  (prisma.emailNotification.createMany as jest.Mock).mockImplementation(
    async ({ data }: { data: unknown[] }) => ({ count: data.length })
  );
});

function queuedText(): string {
  const [{ data }] = (prisma.emailNotification.createMany as jest.Mock).mock.calls[0];
  return data[0].textContent as string;
}

function linkFromText(label: string): URL {
  const line = queuedText()
    .split('\n')
    .find(l => l.startsWith(`${label}: `));
  if (!line) throw new Error(`No ${label} line in the queued email`);
  return new URL(line.slice(label.length + 2));
}

describe('sendUpdateEmail comment visibility links', () => {
  it('gives the hide and manage links a token stored for the follower email', async () => {
    const result = await sendUpdateEmail('history-1');

    expect(result).toEqual({ success: true, emailsQueued: 1 });
    expect(prisma.commentVerificationToken.upsert).toHaveBeenCalledTimes(1);
    const [{ where, create }] = (prisma.commentVerificationToken.upsert as jest.Mock).mock.calls[0];
    expect(where).toEqual({ email: FOLLOWER_EMAIL });

    const hide = linkFromText('Hide');
    const manage = linkFromText('Manage');
    for (const [link, action] of [[hide, 'hide'], [manage, 'manage']] as const) {
      expect(link.origin + link.pathname).toBe('https://app.example.test/api/profile/anonymous-comments');
      expect(link.searchParams.get('email')).toBe(FOLLOWER_EMAIL);
      expect(link.searchParams.get('action')).toBe(action);
      const token = link.searchParams.get('token');
      expect(token).toBeTruthy();
      expect(hashToken(token as string)).toBe(create.tokenHash);
    }
  });
});
