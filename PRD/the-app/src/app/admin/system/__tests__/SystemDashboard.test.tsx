/**
 * Issue #1 step 3: the System page shows the version of the database the app is connected to
 * (read by page.tsx from the server), not a hardcoded "MySQL 8.0".
 */
import { fireEvent, render, screen } from '@testing-library/react';
import SystemDashboard from '../SystemDashboard';

jest.mock('@/contexts/EnvironmentContext', () => ({
  useEnvironment: () => ({ env: { releaseVersion: '7', releaseDate: 'today' } }),
}));

const systemStats = {
  totalUsers: 3,
  activeUsers: 2,
  totalTowns: 1,
  totalPersons: 4,
  totalComments: 5,
  pendingComments: 1,
  approvedComments: 4,
  recentUsers: [],
  recentComments: [],
};

describe('SystemDashboard database version', () => {
  it('shows the version it is given under Database Version', () => {
    render(<SystemDashboard systemStats={systemStats} databaseVersion="PostgreSQL 18.6" />);
    fireEvent.click(screen.getByRole('button', { name: /Performance/ }));

    const label = screen.getByText('Database Version');
    expect(label.nextElementSibling).toHaveTextContent('PostgreSQL 18.6');
    expect(screen.queryByText(/MySQL/)).not.toBeInTheDocument();
  });
});
