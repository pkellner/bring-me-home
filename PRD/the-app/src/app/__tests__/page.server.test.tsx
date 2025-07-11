/**
 * Testing Async Server Components using the Reddit approach
 * https://www.reddit.com/r/nextjs/comments/17mc9hn/how_do_you_test_async_server_components/
 * 
 * The key is to await the component and then render the result
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock all server dependencies BEFORE importing
jest.mock('next-auth', () => ({
  getServerSession: jest.fn().mockResolvedValue({
    user: {
      id: '1',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      roles: [],
      townAccess: [],
      personAccess: []
    }
  })
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {}
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    town: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: '1',
          name: 'Test Town',
          state: 'TS',
          _count: { persons: 5 }
        }
      ])
    },
    person: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          imageUrl: '/test.jpg',
          slug: 'john-doe',
          town: { name: 'Test Town', slug: 'test-town' }
        }
      ]),
      count: jest.fn().mockResolvedValue(3)
    },
    user: {
      count: jest.fn().mockResolvedValue(10)
    },
    $transaction: jest.fn().mockImplementation(async () => {
      // Return mocked values for the transaction
      return [
        // towns
        [{
          id: '1',
          name: 'Test Town',
          state: 'TS',
          _count: { persons: 5 }
        }],
        // recent persons
        [{
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          imageUrl: '/test.jpg',
          slug: 'john-doe',
          town: { name: 'Test Town', slug: 'test-town' }
        }],
        // total detained count
        3
      ];
    })
  }
}));

jest.mock('@/lib/config', () => ({
  getSiteTextConfig: jest.fn().mockResolvedValue({
    hero_title: 'Test Title',
    hero_subtitle: 'Test Subtitle'
  })
}));

// Mock client components
jest.mock('@/components/HeaderNavigation', () => ({
  __esModule: true,
  default: () => <nav data-testid="header-nav">Header Nav</nav>
}));

jest.mock('@/components/FooterWrapper', () => ({
  __esModule: true,
  default: () => <footer data-testid="footer">Footer</footer>
}));

// Import the server component after mocks
import HomePage from '../page';

describe('HomePage Server Component', () => {
  it('should render the page content', async () => {
    // The key: await the server component
    const PageContent = await HomePage();
    
    // Then render the result
    render(PageContent);
    
    // Now we can test the rendered content
    expect(screen.getByTestId('header-nav')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  it('should display towns from the database', async () => {
    const PageContent = await HomePage();
    render(PageContent);
    
    // Check if the mocked town data appears
    expect(screen.getByText('Test Town')).toBeInTheDocument();
  });

  it('should display recent persons', async () => {
    const PageContent = await HomePage();
    render(PageContent);
    
    // Check if the mocked person data appears
    expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
  });
});

// Test with different data scenarios
describe('HomePage with no data', () => {
  beforeEach(() => {
    interface PrismaMock {
      prisma: {
        town: { findMany: jest.Mock };
        person: { findMany: jest.Mock };
        user: { count: jest.Mock };
      };
    }
    const { prisma } = jest.requireMock('@/lib/prisma') as PrismaMock;
    prisma.town.findMany.mockResolvedValue([]);
    prisma.person.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(0);
  });

  it('should handle empty data gracefully', async () => {
    const PageContent = await HomePage();
    render(PageContent);
    
    // Should still render the page structure
    expect(screen.getByTestId('header-nav')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });
});