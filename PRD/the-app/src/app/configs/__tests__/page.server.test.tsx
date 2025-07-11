/**
 * Example of testing a server component using the helper
 */

import { renderServerComponent, mockServerDependencies } from '@/test-utils/server-component';
import '@testing-library/jest-dom';

// Set up mocks before imports
mockServerDependencies();

// Mock specific dependencies for this component
jest.mock('@/lib/config', () => ({
  getSiteTextConfig: jest.fn().mockResolvedValue({
    site_name: 'Test Site',
    site_description: 'Test Description'
  }),
  getPublicConfig: jest.fn().mockResolvedValue({
    theme: 'light',
    language: 'en'
  })
}));

// Import after mocks
import ConfigsPage from '../page';

describe('ConfigsPage Server Component', () => {
  it('should render configuration page', async () => {
    const { getByText, getByRole } = await renderServerComponent(ConfigsPage);
    
    expect(getByText(/configuration/i)).toBeInTheDocument();
    expect(getByRole('main')).toBeInTheDocument();
  });

  it('should display site configuration', async () => {
    const { getByText } = await renderServerComponent(ConfigsPage);
    
    expect(getByText('Test Site')).toBeInTheDocument();
    expect(getByText('Test Description')).toBeInTheDocument();
  });
});