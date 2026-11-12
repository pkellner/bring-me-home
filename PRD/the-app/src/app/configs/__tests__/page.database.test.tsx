/**
 * Issue #1: the public /configs page shows the database product and version, and still renders
 * when the version query fails.
 */
import { render, screen } from '@testing-library/react';
import { getDatabaseVersion } from '@/lib/database-health';
import ConfigsPage from '../page';

jest.mock('next-auth', () => ({ getServerSession: jest.fn().mockResolvedValue(null) }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/database-health', () => ({ getDatabaseVersion: jest.fn() }));
jest.mock('@/app/actions/systemConfig', () => ({
  getSystemLayoutTheme: jest.fn().mockResolvedValue({ layout: 'grid', theme: 'default' }),
}));
jest.mock('@/components/configs/ImageServingDemo', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/configs/HealthCheckSection', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/configs/CacheStatsSection', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/configs/ImageHitStatsSection', () => ({ __esModule: true, default: () => null }));

function databaseValue() {
  return screen.getByText('Database').nextElementSibling;
}

describe('ConfigsPage database row', () => {
  afterEach(() => jest.restoreAllMocks());

  it('shows PostgreSQL with its version, without the build note', async () => {
    jest.mocked(getDatabaseVersion).mockResolvedValue('PostgreSQL 18.6 (Debian 18.6-1.pgdg13+1)');
    render(await ConfigsPage());
    expect(databaseValue()).toHaveTextContent(/^PostgreSQL 18\.6$/);
  });

  it('still renders, logging the error, when the version query fails', async () => {
    const error = new Error('connect ECONNREFUSED');
    jest.mocked(getDatabaseVersion).mockRejectedValue(error);
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(await ConfigsPage());
    expect(databaseValue()).toHaveTextContent('PostgreSQL (version unavailable)');
    expect(screen.getByText('System Configuration')).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith('Configs page: could not read the database version:', error);
  });
});
