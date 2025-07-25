import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import '@testing-library/jest-dom';

// Extract EmailPreferences component for testing
interface EmailPreferencesProps {
  initialOptOutOfAllEmail: boolean;
  personAccess: Array<{
    person: {
      id: string;
      firstName: string;
      lastName: string;
      townName: string;
      townState: string;
    };
  }>;
}

const EmailPreferences = ({ initialOptOutOfAllEmail, personAccess }: EmailPreferencesProps) => {
  const [globalOptOut, setGlobalOptOut] = React.useState(initialOptOutOfAllEmail);
  const [personOptOuts, setPersonOptOuts] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [error, setError] = React.useState('');
  const router = useRouter();

  React.useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await fetch('/api/profile/email-preferences');
        if (response.ok) {
          const data = await response.json();
          setGlobalOptOut(data.globalOptOut);
          setPersonOptOuts(data.personOptOuts || []);
        }
      } catch {
        // Silent fail - use initial values
      } finally {
        setIsLoading(false);
      }
    };
    loadPreferences();
  }, []);

  const handleGlobalOptOutChange = async (checked: boolean) => {
    setError('');
    setIsUpdating(true);
    
    try {
      const response = await fetch('/api/profile/email-preferences/global', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optOut: checked }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to update preferences');
        return;
      }
      
      setGlobalOptOut(checked);
      router.refresh();
    } catch {
      setError('Failed to update preferences');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePersonOptOutChange = async (personId: string, checked: boolean) => {
    setError('');
    setIsUpdating(true);
    
    try {
      const response = await fetch(`/api/profile/email-preferences/person/${personId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optOut: checked }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to update preferences');
        return;
      }
      
      if (checked) {
        setPersonOptOuts([...personOptOuts, personId]);
      } else {
        setPersonOptOuts(personOptOuts.filter(id => id !== personId));
      }
      router.refresh();
    } catch {
      setError('Failed to update preferences');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <div className="text-gray-500">Loading preferences...</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          {error}
        </div>
      )}
      
      <div className="flex items-start">
        <input
          type="checkbox"
          id="global-opt-out"
          checked={globalOptOut}
          onChange={(e) => handleGlobalOptOutChange(e.target.checked)}
          disabled={isUpdating}
          className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 mt-1"
        />
        <label htmlFor="global-opt-out" className="ml-3">
          <div className="text-sm font-medium text-gray-900">
            Opt out of all email notifications
          </div>
          <div className="text-sm text-gray-600">
            You will not receive any email updates about persons you follow
          </div>
        </label>
      </div>
      
      {personAccess.length > 0 && !globalOptOut && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Email notifications by person
          </h3>
          <div className="space-y-3">
            {personAccess.map((access) => (
              <div key={access.person.id} className="flex items-start">
                <input
                  type="checkbox"
                  id={`person-opt-out-${access.person.id}`}
                  checked={personOptOuts.includes(access.person.id)}
                  onChange={(e) => handlePersonOptOutChange(access.person.id, e.target.checked)}
                  disabled={isUpdating}
                  className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 mt-1"
                />
                <label 
                  htmlFor={`person-opt-out-${access.person.id}`} 
                  className="ml-3"
                >
                  <div className="text-sm font-medium text-gray-900">
                    Opt out of updates for {access.person.firstName} {access.person.lastName}
                  </div>
                  <div className="text-sm text-gray-600">
                    {access.person.townName}, {access.person.townState}
                  </div>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const mockUseRouter = useRouter as jest.Mock;
const mockFetch = global.fetch as jest.Mock;

describe('EmailPreferences Component', () => {
  const mockRouter = { refresh: jest.fn() };
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = mockFetch;
  });

  const defaultProps = {
    initialOptOutOfAllEmail: false,
    personAccess: [
      {
        person: {
          id: 'person1',
          firstName: 'John',
          lastName: 'Doe',
          townName: 'Springfield',
          townState: 'IL',
        },
      },
      {
        person: {
          id: 'person2',
          firstName: 'Jane',
          lastName: 'Smith',
          townName: 'Chicago',
          townState: 'IL',
        },
      },
    ],
  };

  it('should load and display email preferences', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        globalOptOut: false,
        personOptOuts: ['person1'],
      }),
    });

    render(<EmailPreferences {...defaultProps} />);

    expect(screen.getByText('Loading preferences...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Opt out of all email notifications')).toBeInTheDocument();
    });

    // Check global opt-out is unchecked
    const globalCheckbox = screen.getByLabelText(/Opt out of all email notifications/);
    expect(globalCheckbox).not.toBeChecked();

    // Check person1 is opted out
    const person1Checkbox = screen.getByLabelText(/Opt out of updates for John Doe/);
    expect(person1Checkbox).toBeChecked();

    // Check person2 is not opted out
    const person2Checkbox = screen.getByLabelText(/Opt out of updates for Jane Smith/);
    expect(person2Checkbox).not.toBeChecked();
  });

  it('should toggle global opt-out', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          globalOptOut: false,
          personOptOuts: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    render(<EmailPreferences {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Opt out of all email notifications')).toBeInTheDocument();
    });

    const globalCheckbox = screen.getByLabelText(/Opt out of all email notifications/);
    fireEvent.click(globalCheckbox);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/profile/email-preferences/global',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ optOut: true }),
        })
      );
    });

    expect(mockRouter.refresh).toHaveBeenCalled();
  });

  it('should toggle person-specific opt-out', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          globalOptOut: false,
          personOptOuts: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    render(<EmailPreferences {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Email notifications by person')).toBeInTheDocument();
    });

    const person1Checkbox = screen.getByLabelText(/Opt out of updates for John Doe/);
    fireEvent.click(person1Checkbox);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/profile/email-preferences/person/person1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ optOut: true }),
        })
      );
    });

    expect(mockRouter.refresh).toHaveBeenCalled();
  });

  it('should hide person-specific options when global opt-out is enabled', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        globalOptOut: true,
        personOptOuts: [],
      }),
    });

    render(<EmailPreferences {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Opt out of all email notifications')).toBeInTheDocument();
    });

    // Person-specific options should not be visible
    expect(screen.queryByText('Email notifications by person')).not.toBeInTheDocument();
  });

  it('should display error when API call fails', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          globalOptOut: false,
          personOptOuts: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      });

    render(<EmailPreferences {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Opt out of all email notifications')).toBeInTheDocument();
    });

    const globalCheckbox = screen.getByLabelText(/Opt out of all email notifications/);
    fireEvent.click(globalCheckbox);

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });
});