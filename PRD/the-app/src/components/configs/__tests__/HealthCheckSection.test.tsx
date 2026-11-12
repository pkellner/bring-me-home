/**
 * Issue #1 step 3: the connection pool panel on /configs shows what the PostgreSQL health check
 * returns: sessions by PID, state, wait event and time in state, and the first failed query's
 * message when the concurrent test has failures.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import HealthCheckSection from '../HealthCheckSection';
import { testDatabaseConnectionPool } from '@/app/actions/health-check';

jest.mock('@/app/actions/health-check', () => ({
  testDatabaseConnection: jest.fn(),
  testRedisConnection: jest.fn(),
  testDatabaseConnectionPool: jest.fn(),
}));

function poolResult(overrides: { firstError?: string | null; failed?: number; connectionLimit?: number | string; poolTimeout?: number | string } = {}) {
  const failed = overrides.failed ?? 0;
  return {
    success: true,
    data: {
      connectionPoolStatus: {
        activeConnections: 4,
        maxConnections: 100,
        utilizationPercent: 4,
        connectionLimit: overrides.connectionLimit ?? 10,
        poolTimeout: overrides.poolTimeout ?? 30,
      },
      concurrentTest: {
        attempted: 20,
        successful: 20 - failed,
        failed,
        successRate: Math.round(((20 - failed) / 20) * 100),
        firstError: overrides.firstError ?? null,
      },
      topProcesses: [
        { pid: 4321, state: 'idle', waitEvent: 'ClientRead', secondsInState: 12 },
        { pid: 4322, state: null, waitEvent: null, secondsInState: null },
      ],
      queryTime: 230,
    },
    error: null,
  };
}

async function openPanel(result: ReturnType<typeof poolResult>) {
  (testDatabaseConnectionPool as jest.Mock).mockResolvedValue(result);
  render(<HealthCheckSection />);
  fireEvent.click(screen.getByRole('button', { name: 'Test Connection Pool' }));
  await screen.findByText('✓ Connection Pool Test Complete');
}

describe('HealthCheckSection connection pool panel', () => {
  it('lists the PostgreSQL sessions with state, wait event and time in state', async () => {
    await openPanel(poolResult());
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('columnheader').map(h => h.textContent)).toEqual(['PID', 'State', 'Waiting On', 'Time in State']);
    const rows = within(table).getAllByRole('row').slice(1).map(r => within(r).getAllByRole('cell').map(c => c.textContent));
    expect(rows).toEqual([
      ['4321', 'idle', 'ClientRead', '12s'],
      ['4322', 'unknown', '-', '-'],
    ]);
  });

  it('shows the connections, the limits from DATABASE_URL and no error when every query succeeded', async () => {
    await openPanel(poolResult());
    expect(screen.getByText('4 / 100')).toBeInTheDocument();
    expect(screen.getByText('Connection Limit:').nextElementSibling).toHaveTextContent('10');
    expect(screen.getByText('Pool Timeout:').nextElementSibling).toHaveTextContent(/^30s$/);
    expect(screen.queryByText('First Error:')).not.toBeInTheDocument();
  });

  it('shows the defaults as text, without a stray "s"', async () => {
    await openPanel(poolResult({ connectionLimit: 'Default (2 × CPU cores + 1)', poolTimeout: 'Default (10s)' }));
    expect(screen.getByText('Connection Limit:').nextElementSibling).toHaveTextContent('Default (2 × CPU cores + 1)');
    expect(screen.getByText('Pool Timeout:').nextElementSibling).toHaveTextContent(/^Default \(10s\)$/);
  });

  it('shows the first failed query\'s message when queries failed', async () => {
    await openPanel(poolResult({ failed: 3, firstError: 'Timed out fetching a new connection from the connection pool' }));
    expect(screen.getByText('First Error:').nextElementSibling)
      .toHaveTextContent('Timed out fetching a new connection from the connection pool');
    expect(screen.getByText('85% success rate')).toBeInTheDocument();
  });
});
