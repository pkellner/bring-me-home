/**
 * Test utilities for Next.js 15 Server Components
 * Based on: https://www.reddit.com/r/nextjs/comments/17mc9hn/how_do_you_test_async_server_components/
 */

import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

/**
 * Render an async server component for testing
 * 
 * @example
 * ```typescript
 * import { renderServerComponent } from '@/test-utils/server-component';
 * import HomePage from '@/app/page';
 * 
 * it('should render', async () => {
 *   const { getByText } = await renderServerComponent(HomePage);
 *   expect(getByText('Welcome')).toBeInTheDocument();
 * });
 * ```
 */
export async function renderServerComponent<P = Record<string, unknown>>(
  Component: (props: P) => Promise<ReactElement>,
  props?: P,
  options?: RenderOptions
) {
  // Await the server component
  const resolvedComponent = await Component(props || {} as P);
  
  // Render the resolved component
  return rtlRender(resolvedComponent, options);
}

/**
 * Test async server component with props
 * 
 * @example
 * ```typescript
 * it('should render with params', async () => {
 *   const { getByText } = await renderServerComponent(
 *     TownPage,
 *     { params: { townSlug: 'springfield' } }
 *   );
 *   expect(getByText('Springfield')).toBeInTheDocument();
 * });
 * ```
 */
export async function renderServerComponentWithParams<P = Record<string, unknown>>(
  Component: (props: { params: P }) => Promise<ReactElement>,
  params: P,
  options?: RenderOptions
) {
  // Create proper typed component wrapper
  const wrappedComponent = (props: { params: P }) => Component(props);
  return renderServerComponent(wrappedComponent, { params }, options);
}

/**
 * Mock common server dependencies for testing
 */
export function mockServerDependencies() {
  // Mock next-auth
  jest.mock('next-auth', () => ({
    getServerSession: jest.fn().mockResolvedValue({
      user: {
        id: '1',
        username: 'testuser',
        roles: [{ name: 'user' }],
        townAccess: [],
        personAccess: []
      }
    })
  }));

  // Mock auth options
  jest.mock('@/lib/auth', () => ({
    authOptions: {}
  }));

  // Mock Prisma
  jest.mock('@/lib/prisma', () => ({
    prisma: {
      $transaction: jest.fn(),
      user: { 
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0)
      },
      town: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0)
      },
      person: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0)
      },
      comment: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0)
      }
    }
  }));

  // Mock permissions
  jest.mock('@/lib/permissions', () => ({
    hasPermission: jest.fn().mockReturnValue(true),
    hasRole: jest.fn().mockReturnValue(false)
  }));

  // Mock config
  jest.mock('@/lib/config', () => ({
    getSiteTextConfig: jest.fn().mockResolvedValue({})
  }));
}