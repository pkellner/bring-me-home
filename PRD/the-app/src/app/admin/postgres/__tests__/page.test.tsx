/**
 * Issue #1: /admin/postgres shows the database overview to a site admin and redirects anyone else.
 */
import { render, screen, within } from '@testing-library/react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { getPostgresOverview } from '@/lib/postgres-overview';
import PostgresPage from '../page';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('next/navigation', () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
jest.mock('@/lib/postgres-overview', () => ({ getPostgresOverview: jest.fn() }));

const sessionWith = (roleName: string) => ({
  user: { id: '1', username: 'u', roles: [{ id: 'r', name: roleName, permissions: '{}' }] },
});

const overview = {
  version: 'PostgreSQL 18.6',
  database: { name: 'bring_me_home', sizePretty: '13 MB', localeProvider: 'icu', locale: 'und' },
  connections: { activeConnections: 5, maxConnections: 300 },
  connectionLimit: 10,
  migrations: [{ name: '20261112025125_postgres_baseline', finishedAt: new Date('2026-11-12T02:51:25Z') }],
  tables: [
    { name: 'persons', rowCount: 18, sizePretty: '216 kB' },
    { name: 'users', rowCount: 1065, sizePretty: '112 kB' },
  ],
};

describe('PostgresPage', () => {
  beforeEach(() => {
    jest.mocked(getPostgresOverview).mockReset().mockResolvedValue(overview);
    jest.mocked(redirect).mockClear();
  });

  it('shows a site admin the version, the database, the connections and each table with its count', async () => {
    jest.mocked(getServerSession).mockResolvedValue(sessionWith('site-admin'));
    render(await PostgresPage());

    expect(screen.getByText('PostgreSQL 18.6')).toBeInTheDocument();
    expect(screen.getByText('bring_me_home')).toBeInTheDocument();
    expect(screen.getByText('13 MB')).toBeInTheDocument();
    expect(screen.getByText('icu, und')).toBeInTheDocument();
    expect(screen.getByText('5 of 300 (max_connections)')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Tables (2, 1,083 rows)')).toBeInTheDocument();

    const usersRow = screen.getByText('users').closest('tr') as HTMLElement;
    expect(within(usersRow).getByText('1,065')).toBeInTheDocument();
    expect(within(usersRow).getByText('112 kB')).toBeInTheDocument();

    expect(screen.getByText('20261112025125_postgres_baseline')).toBeInTheDocument();
    expect(screen.getByText('2026-11-12T02:51:25.000Z')).toBeInTheDocument();
  });

  it('redirects a signed-in user who is not a site admin, without querying', async () => {
    jest.mocked(getServerSession).mockResolvedValue(sessionWith('town-admin'));
    await expect(PostgresPage()).rejects.toThrow('NEXT_REDIRECT /admin');
    expect(getPostgresOverview).not.toHaveBeenCalled();
  });

  it('sends a signed-out visitor to sign in', async () => {
    jest.mocked(getServerSession).mockResolvedValue(null);
    await expect(PostgresPage()).rejects.toThrow('NEXT_REDIRECT /auth/signin');
  });
});
