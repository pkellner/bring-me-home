/**
 * @jest-environment node
 */
/**
 * The anonymous-comments routes. Two sets of tests share this file:
 * - PR #3: hide, show, manage, count and POST need a verified matching session or an active
 *   comment-verification token for the address; the manage page escapes what it interpolates.
 * - Issue #1 step 1: the submitted email is normalised (trim + lowercase) before it is compared
 *   with the session's or token's email and before it is matched.
 */
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { hashToken } from '@/lib/comment-verification';
import { GET, POST } from '../route';
import { GET as COUNT } from '../count/route';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    comment: {
      updateMany: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    commentVerificationToken: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockSession = getServerSession as jest.Mock;
const mockCommentUpdateMany = prisma.comment.updateMany as jest.Mock;
const mockUserUpdateMany = prisma.user.updateMany as jest.Mock;
const mockUserFindUnique = prisma.user.findUnique as jest.Mock;
const mockGroupBy = prisma.comment.groupBy as jest.Mock;
const mockTokenFindFirst = prisma.commentVerificationToken.findFirst as jest.Mock;

const OWNER = 'owner@example.com';
const VALID_TOKEN = 'valid-token-for-owner';

// Active comment-verification tokens, keyed by the email they were issued for.
let activeTokens: Record<string, string> = {};

function useTokens(tokens: Record<string, string>) {
  activeTokens = tokens;
  mockTokenFindFirst.mockImplementation(
    async ({ where }: { where: { tokenHash: string; isActive?: boolean } }) => {
      if (where.isActive !== true) return null;
      const email = Object.keys(activeTokens).find(
        e => hashToken(activeTokens[e]) === where.tokenHash
      );
      return email ? { id: `token-${email}`, email, tokenHash: where.tokenHash, isActive: true } : null;
    }
  );
}

// Signs a user in; their account row says whether the email is verified.
function signIn(user: { id: string; email: string; verified: boolean }) {
  mockSession.mockResolvedValue({ user: { id: user.id, email: user.email } });
  mockUserFindUnique.mockImplementation(
    async ({ where }: { where: { id?: string; email?: string } }) => {
      if (where.id === user.id) {
        return { email: user.email, emailVerified: user.verified ? new Date('2026-01-01') : null };
      }
      return null;
    }
  );
}

function get(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

function pageUrl(params: Record<string, string>) {
  return `/api/profile/anonymous-comments?${new URLSearchParams(params).toString()}`;
}

function countUrl(email: string) {
  return `/api/profile/anonymous-comments/count?${new URLSearchParams({ email }).toString()}`;
}

function expectNoVisibilityWrite() {
  expect(mockCommentUpdateMany).not.toHaveBeenCalled();
  expect(mockUserUpdateMany).not.toHaveBeenCalled();
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.mockResolvedValue(null);
  mockUserFindUnique.mockResolvedValue(null);
  useTokens({ [OWNER]: VALID_TOKEN });
  mockCommentUpdateMany.mockResolvedValue({ count: 3 });
  mockUserUpdateMany.mockResolvedValue({ count: 1 });
  mockGroupBy.mockResolvedValue([
    { hideRequested: true, _count: 2 },
    { hideRequested: false, _count: 5 },
  ]);
});

describe('GET /api/profile/anonymous-comments?action=hide|show', () => {
  it.each(['hide', 'show'])('refuses %s with no token and no session, and writes nothing', async action => {
    const response = await GET(get(pageUrl({ email: OWNER, action })));

    expect(response.status).toBe(401);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(await response.text()).toContain('Link Not Valid');
    expectNoVisibilityWrite();
  });

  it('refuses hide with a token that is not active', async () => {
    const response = await GET(get(pageUrl({ email: OWNER, action: 'hide', token: 'made-up-token' })));

    expect(response.status).toBe(401);
    expectNoVisibilityWrite();
  });

  it('refuses hide when the token belongs to a different email', async () => {
    useTokens({ [OWNER]: VALID_TOKEN, 'someone@example.com': 'someone-token' });

    const response = await GET(get(pageUrl({ email: OWNER, action: 'hide', token: 'someone-token' })));

    expect(response.status).toBe(401);
    expectNoVisibilityWrite();
  });

  it("refuses hide for another user's session", async () => {
    signIn({ id: 'user-2', email: 'someone@example.com', verified: true });

    const response = await GET(get(pageUrl({ email: OWNER, action: 'hide' })));

    expect(response.status).toBe(401);
    expectNoVisibilityWrite();
  });

  it('refuses hide for a matching session whose email is not verified', async () => {
    signIn({ id: 'user-1', email: OWNER, verified: false });

    const response = await GET(get(pageUrl({ email: OWNER, action: 'hide' })));

    expect(response.status).toBe(401);
    expectNoVisibilityWrite();
  });

  it('hides every comment for the email with a valid token', async () => {
    const response = await GET(get(pageUrl({ email: OWNER, action: 'hide', token: VALID_TOKEN })));

    expect(response.status).toBe(200);
    expect(mockCommentUpdateMany).toHaveBeenCalledWith({
      where: { email: OWNER },
      data: { hideRequested: true, hideRequestedAt: expect.any(Date) },
    });
    expect(mockUserUpdateMany).toHaveBeenCalledWith({
      where: { email: OWNER },
      data: { allowAnonymousComments: false },
    });
    const html = await response.text();
    expect(html).toContain('Comments Hidden');
    expect(html).toContain('All 3 comments associated with your email have been hidden');
  });

  it('accepts a token when the email in the link differs only in case and spaces, and acts on the stored address', async () => {
    const response = await GET(
      get(pageUrl({ email: '  Owner@Example.COM ', action: 'hide', token: VALID_TOKEN }))
    );

    expect(response.status).toBe(200);
    expect(mockCommentUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: OWNER } })
    );
  });

  it('writes the normal form when the token was stored in another case (issue #1 step 1)', async () => {
    useTokens({ ' Owner@Example.com': VALID_TOKEN });

    const response = await GET(get(pageUrl({ email: OWNER, action: 'hide', token: VALID_TOKEN })));

    expect(response.status).toBe(200);
    expect(mockCommentUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { email: OWNER } }));
    expect(mockUserUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { email: OWNER } }));
  });

  it('hides for a signed-in owner whose email is verified, with no token', async () => {
    signIn({ id: 'user-1', email: OWNER, verified: true });

    const response = await GET(get(pageUrl({ email: OWNER, action: 'hide' })));

    expect(response.status).toBe(200);
    expect(mockCommentUpdateMany).toHaveBeenCalledTimes(1);
    expect(mockTokenFindFirst).not.toHaveBeenCalled();
  });

  it('shows every comment with a valid token and links back to manage with the token', async () => {
    const response = await GET(get(pageUrl({ email: OWNER, action: 'show', token: VALID_TOKEN })));

    expect(response.status).toBe(200);
    expect(mockCommentUpdateMany).toHaveBeenCalledWith({
      where: { email: OWNER },
      data: { hideRequested: false, hideRequestedAt: null },
    });
    expect(mockUserUpdateMany).toHaveBeenCalledWith({
      where: { email: OWNER },
      data: { allowAnonymousComments: true },
    });
    const html = await response.text();
    expect(html).toContain('Comments Shown');
    expect(html).toContain(
      `href="/api/profile/anonymous-comments?email=owner%40example.com&amp;action=manage&amp;token=${VALID_TOKEN}"`
    );
  });
});

describe('GET /api/profile/anonymous-comments?action=manage', () => {
  it('refuses with no token and no session and does not show the email', async () => {
    const response = await GET(get(pageUrl({ email: OWNER, action: 'manage' })));

    expect(response.status).toBe(401);
    const html = await response.text();
    expect(html).toContain('Link Not Valid');
    expect(html).not.toContain(OWNER);
  });

  it("refuses another user's session", async () => {
    signIn({ id: 'user-2', email: 'someone@example.com', verified: true });

    const response = await GET(get(pageUrl({ email: OWNER, action: 'manage' })));

    expect(response.status).toBe(401);
  });

  it('serves the page with a valid token and hands the token to the script', async () => {
    const response = await GET(get(pageUrl({ email: OWNER, action: 'manage', token: VALID_TOKEN })));

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain(`<strong>${OWNER}</strong>`);
    expect(html).toContain(`data-email="${OWNER}" data-token="${VALID_TOKEN}"`);
    expect(html).toContain("'x-verification-token': token");
    expectNoVisibilityWrite();
  });

  it('serves the page to a signed-in verified owner with an empty token', async () => {
    signIn({ id: 'user-1', email: OWNER, verified: true });

    const response = await GET(get(pageUrl({ email: OWNER, action: 'manage' })));

    expect(response.status).toBe(200);
    expect(await response.text()).toContain(`data-email="${OWNER}" data-token=""`);
  });

  it('escapes markup in the email', async () => {
    const email = '<img src=x onerror=alert(1)>@example.com';
    useTokens({ [email]: 'markup-token' });

    const response = await GET(get(pageUrl({ email, action: 'manage', token: 'markup-token' })));

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).not.toContain('<img');
    expect(html).toContain('<strong>&lt;img src=x onerror=alert(1)&gt;@example.com</strong>');
  });

  it('keeps a script-closing email out of the inline script', async () => {
    const email = '</script><script>alert(1)</script>@example.com';
    useTokens({ [email]: 'script-token' });

    const response = await GET(get(pageUrl({ email, action: 'manage', token: 'script-token' })));

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html.match(/<script>/g)).toHaveLength(1);
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    expect(html).not.toContain('alert(1)</script>');
    expect(html).toContain('data-email="&lt;/script&gt;&lt;script&gt;alert(1)&lt;/script&gt;@example.com"');
  });

  it('escapes quotes so the email cannot leave its attribute', async () => {
    const email = 'a"onmouseover="alert(1)\'@example.com';
    useTokens({ [email]: 'quote-token' });

    const response = await GET(get(pageUrl({ email, action: 'manage', token: 'quote-token' })));

    const html = await response.text();
    expect(html).not.toContain('"onmouseover="');
    expect(html).toContain('data-email="a&quot;onmouseover=&quot;alert(1)&#39;@example.com"');
  });
});

describe('GET /api/profile/anonymous-comments with no action', () => {
  it('still answers the public comment form without a session', async () => {
    mockUserFindUnique.mockResolvedValue({ allowAnonymousComments: false });

    const response = await GET(get(pageUrl({ email: OWNER })));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ allowAnonymousComments: false });
    expectNoVisibilityWrite();
  });

  it('requires the email parameter', async () => {
    const response = await GET(get('/api/profile/anonymous-comments?action=hide'));

    expect(response.status).toBe(400);
    expectNoVisibilityWrite();
  });
});

describe('GET /api/profile/anonymous-comments/count', () => {
  it('refuses with no token and no session and does not count', async () => {
    const response = await COUNT(get(countUrl(OWNER)));

    expect(response.status).toBe(401);
    expect(mockGroupBy).not.toHaveBeenCalled();
  });

  it('refuses a token for a different email', async () => {
    useTokens({ [OWNER]: VALID_TOKEN, 'someone@example.com': 'someone-token' });

    const response = await COUNT(get(countUrl(OWNER), { 'x-verification-token': 'someone-token' }));

    expect(response.status).toBe(401);
    expect(mockGroupBy).not.toHaveBeenCalled();
  });

  it("refuses another user's session", async () => {
    signIn({ id: 'user-2', email: 'someone@example.com', verified: true });

    const response = await COUNT(get(countUrl(OWNER)));

    expect(response.status).toBe(401);
    expect(mockGroupBy).not.toHaveBeenCalled();
  });

  it('counts with a valid token in the x-verification-token header', async () => {
    const response = await COUNT(get(countUrl(OWNER), { 'x-verification-token': VALID_TOKEN }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ total: 7, hidden: 2, visible: 5 });
    expect(mockGroupBy).toHaveBeenCalledWith({
      by: ['hideRequested'],
      where: { email: OWNER },
      _count: true,
    });
  });

  it('counts by the normal form of the email in the link (issue #1 step 1)', async () => {
    const response = await COUNT(get(countUrl(' OWNER@Example.com '), { 'x-verification-token': VALID_TOKEN }));

    expect(response.status).toBe(200);
    expect(mockGroupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { email: OWNER } }));
  });

  it('counts for a signed-in verified owner', async () => {
    signIn({ id: 'user-1', email: OWNER, verified: true });

    const response = await COUNT(get(countUrl(OWNER)));

    expect(response.status).toBe(200);
    expect(mockGroupBy).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/profile/anonymous-comments', () => {
  function post(body: unknown, headers: Record<string, string> = {}) {
    return new NextRequest('http://localhost:3000/api/profile/anonymous-comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
  }

  it('refuses with no token and no session', async () => {
    const response = await POST(post({ allowAnonymousComments: false, email: OWNER }));

    expect(response.status).toBe(401);
    expect(mockUserUpdateMany).not.toHaveBeenCalled();
  });

  it('refuses a matching session whose email is not verified', async () => {
    signIn({ id: 'user-1', email: OWNER, verified: false });

    const response = await POST(post({ allowAnonymousComments: false, email: OWNER }));

    expect(response.status).toBe(401);
    expect(mockUserUpdateMany).not.toHaveBeenCalled();
  });

  it('updates with a valid token in the header', async () => {
    const response = await POST(
      post({ allowAnonymousComments: false, email: OWNER }, { 'x-verification-token': VALID_TOKEN })
    );

    expect(response.status).toBe(200);
    expect(mockUserUpdateMany).toHaveBeenCalledWith({
      where: { email: OWNER },
      data: { allowAnonymousComments: false },
    });
  });

  it('rejects a non-string email', async () => {
    const response = await POST(post({ allowAnonymousComments: false, email: { not: null } }));

    expect(response.status).toBe(400);
    expect(mockUserUpdateMany).not.toHaveBeenCalled();
  });

  // Issue #1 step 1. Since PR #3 a session proves the address only when its account's email is
  // verified, so these sign in through signIn() instead of a bare session email.
  describe('normalised email (issue #1 step 1)', () => {
    it('lets the signed-in owner change the setting when the typed email differs in case and spaces', async () => {
      signIn({ id: 'user-1', email: OWNER, verified: true });

      const response = await POST(post({ allowAnonymousComments: false, email: ' Owner@Example.COM ' }));

      expect(response.status).toBe(200);
      expect(mockUserUpdateMany).toHaveBeenCalledWith({
        where: { email: OWNER },
        data: { allowAnonymousComments: false },
      });
    });

    it('accepts a token whose email matches in normal form', async () => {
      const response = await POST(
        post({ allowAnonymousComments: true, email: 'OWNER@example.com' }, { 'x-verification-token': VALID_TOKEN })
      );

      expect(response.status).toBe(200);
      expect(mockUserUpdateMany).toHaveBeenCalledWith({
        where: { email: OWNER },
        data: { allowAnonymousComments: true },
      });
    });

    it('refuses a session for another address', async () => {
      signIn({ id: 'user-2', email: 'someone@example.com', verified: true });

      const response = await POST(post({ allowAnonymousComments: true, email: OWNER }));

      expect(response.status).toBe(401);
      expect(mockUserUpdateMany).not.toHaveBeenCalled();
    });
  });
});
