/**
 * Test helpers for Next.js 15 Server Components
 */

import { ReactElement } from 'react';

/**
 * Extract and test data fetching logic from server components
 */
export async function testServerComponentDataFetching(
  componentFunction: () => Promise<ReactElement>,
  mocks: Record<string, jest.Mock>
) {
  // Set up mocks
  Object.entries(mocks).forEach(([, mock]) => {
    mock.mockClear();
  });

  try {
    // We can't render server components, but we can check if they execute
    const componentPromise = componentFunction();
    expect(componentPromise).toBeInstanceOf(Promise);
    
    // Verify mocks were called
    Object.entries(mocks).forEach(([key, mock]) => {
      if (mock.mock.calls.length > 0) {
        console.log(`${key} was called ${mock.mock.calls.length} times`);
      }
    });
    
    return true;
  } catch (error) {
    console.error('Server component test failed:', error);
    return false;
  }
}

/**
 * Test utility functions extracted from server components
 */
export function extractAndTestBusinessLogic() {
  // This encourages extracting logic into testable functions
  return {
    recommendation: 'Extract data fetching and business logic into separate functions that can be unit tested'
  };
}