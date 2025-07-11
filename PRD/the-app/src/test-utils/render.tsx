import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';

interface TestSession extends Session {
  user: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    roles: Array<{
      id: string;
      name: string;
      permissions: string;
    }>;
    townAccess: Array<{
      id: string;
      townId: string;
      accessLevel: string;
      town: {
        id: string;
        name: string;
        state: string;
      };
    }>;
    personAccess: Array<{
      id: string;
      personId: string;
      accessLevel: string;
      person: {
        id: string;
        firstName: string;
        lastName: string;
      };
    }>;
  };
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: TestSession | null;
}

const createMockSession = (overrides?: Partial<TestSession>): TestSession => ({
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  user: {
    id: '1',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    roles: [
      {
        id: '1',
        name: 'user',
        permissions: JSON.stringify({ users: ['read'] }),
      },
    ],
    townAccess: [],
    personAccess: [],
    ...overrides?.user,
  },
  ...overrides,
});

const AllTheProviders = ({ children, session }: { children: React.ReactNode; session?: TestSession | null }) => {
  return (
    <SessionProvider session={session}>
      {children}
    </SessionProvider>
  );
};

const customRender = (
  ui: ReactElement,
  { session = null, ...options }: CustomRenderOptions = {}
) =>
  render(ui, {
    wrapper: ({ children }) => <AllTheProviders session={session}>{children}</AllTheProviders>,
    ...options,
  });

export * from '@testing-library/react';
export { customRender as render, createMockSession };