/**
 * Testing Admin Users Page - Server Component
 * Using the async/await pattern from Reddit
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock authentication
jest.mock('next-auth', () => ({
  getServerSession: jest.fn().mockResolvedValue({
    user: {
      id: '1',
      username: 'admin',
      roles: [{ name: 'admin', permissions: '{}' }]
    }
  })
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {}
}));

// Mock permissions
jest.mock('@/lib/permissions', () => ({
  hasPermission: jest.fn().mockReturnValue(true),
  hasRole: jest.fn().mockReturnValue(true)
}));

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: '1',
          username: 'user1',
          email: 'user1@example.com',
          firstName: 'User',
          lastName: 'One',
          createdAt: new Date('2024-01-01'),
          roles: [{ name: 'user' }]
        },
        {
          id: '2',
          username: 'user2',
          email: 'user2@example.com',
          firstName: 'User',
          lastName: 'Two',
          createdAt: new Date('2024-01-02'),
          roles: [{ name: 'admin' }]
        }
      ])
    }
  }
}));

// Mock config
jest.mock('@/lib/config', () => ({
  getSiteTextConfig: jest.fn().mockResolvedValue({})
}));

// Import after mocks
import UsersPage from '../page';

describe('UsersPage Server Component', () => {
  it('should render users list', async () => {
    // Await the server component
    const PageContent = await UsersPage();
    
    // Render the result
    render(PageContent);
    
    // Test the content
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    expect(screen.getByText('user2@example.com')).toBeInTheDocument();
  });

  it('should show user roles', async () => {
    const PageContent = await UsersPage();
    render(PageContent);
    
    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('should display add user button for admins', async () => {
    const PageContent = await UsersPage();
    render(PageContent);
    
    const addButton = screen.getByRole('link', { name: /add user/i });
    expect(addButton).toBeInTheDocument();
    expect(addButton).toHaveAttribute('href', '/admin/users/new');
  });
});