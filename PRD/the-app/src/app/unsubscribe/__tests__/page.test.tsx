import { render, screen, waitFor } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import UnsubscribePage from '../page';

// Mock the dependencies
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock fetch
global.fetch = jest.fn();

describe('UnsubscribePage', () => {
  const mockSearchParams = new URLSearchParams();
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
  });

  it('should show error when no token or action is provided', async () => {
    render(<UnsubscribePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid or Expired Link')).toBeInTheDocument();
      expect(screen.getByText('Invalid unsubscribe link')).toBeInTheDocument();
    });
  });

  it('should process unsubscribe and show success message for all emails', async () => {
    mockSearchParams.set('token', 'valid-token');
    mockSearchParams.set('action', 'all');
    
    const mockFetch = global.fetch as jest.Mock;
    
    // First call validates the token
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        valid: true,
        action: 'all',
        email: 'john.doe@example.com',
      }),
    });
    
    // Second call processes the unsubscribe
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        isGloballyOptedOut: false,
      }),
    });

    render(<UnsubscribePage />);
    
    await waitFor(() => {
      expect(screen.getByText("You've Been Unsubscribed")).toBeInTheDocument();
      expect(screen.getByText('You have been successfully unsubscribed from all Bring Me Home email updates.')).toBeInTheDocument();
      expect(screen.getByText('j***@example.com')).toBeInTheDocument(); // Obfuscated email
    });

    // Check for transactional email notice
    expect(screen.getByText(/You may still receive transactional emails/)).toBeInTheDocument();
    
    // Check for resubscribe information
    expect(screen.getByText(/Want to receive updates again?/)).toBeInTheDocument();
    expect(screen.getByText(/Keep me updated/)).toBeInTheDocument();
  });

  it('should show person-specific unsubscribe message', async () => {
    mockSearchParams.set('token', 'valid-token');
    mockSearchParams.set('action', 'person');
    
    const mockFetch = global.fetch as jest.Mock;
    
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        valid: true,
        action: 'person',
        email: 'jane@example.org',
        personName: 'John Smith',
      }),
    });
    
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        isGloballyOptedOut: false,
      }),
    });

    render(<UnsubscribePage />);
    
    await waitFor(() => {
      expect(screen.getByText("You've Been Unsubscribed")).toBeInTheDocument();
      expect(screen.getByText('You have been successfully unsubscribed from updates about John Smith.')).toBeInTheDocument();
      expect(screen.getByText('j***@example.org')).toBeInTheDocument();
    });
  });

  it('should show additional warning when globally opted out', async () => {
    mockSearchParams.set('token', 'valid-token');
    mockSearchParams.set('action', 'person');
    
    const mockFetch = global.fetch as jest.Mock;
    
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        valid: true,
        action: 'person',
        email: 'user@test.com',
        personName: 'Jane Doe',
      }),
    });
    
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        isGloballyOptedOut: true,
      }),
    });

    render(<UnsubscribePage />);
    
    await waitFor(() => {
      expect(screen.getByText(/You are currently opted out from all emails from Bring Me Home/)).toBeInTheDocument();
      expect(screen.getByText(/you'll need to re-enable emails when posting a new comment/)).toBeInTheDocument();
    });
  });

  it('should show error message for invalid token', async () => {
    mockSearchParams.set('token', 'invalid-token');
    mockSearchParams.set('action', 'all');
    
    const mockFetch = global.fetch as jest.Mock;
    
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        valid: false,
        error: 'Invalid or expired token',
        message: 'This opt-out link has expired or is invalid.',
      }),
    });

    render(<UnsubscribePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid or Expired Link')).toBeInTheDocument();
      expect(screen.getByText('This opt-out link has expired or is invalid.')).toBeInTheDocument();
    });
  });

  it('should handle fetch errors gracefully', async () => {
    mockSearchParams.set('token', 'valid-token');
    mockSearchParams.set('action', 'all');
    
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<UnsubscribePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid or Expired Link')).toBeInTheDocument();
      expect(screen.getByText('Failed to process unsubscribe request')).toBeInTheDocument();
    });
  });

  it('should show loading state initially', () => {
    mockSearchParams.set('token', 'valid-token');
    mockSearchParams.set('action', 'all');
    
    render(<UnsubscribePage />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});