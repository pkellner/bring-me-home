import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Simplified EmailPreferences component for testing
function EmailPreferences({ 
  emailSubscriptions 
}: { 
  emailSubscriptions: Array<{
    personId: string;
    firstName: string;
    lastName: string;
    townName: string;
    townState: string;
    isOptedOut: boolean;
  }>;
}) {
  const [showActiveSubscriptions, setShowActiveSubscriptions] = React.useState(true); // Auto-expanded
  const [personOptOuts, setPersonOptOuts] = React.useState<string[]>(
    emailSubscriptions.filter(sub => sub.isOptedOut).map(sub => sub.personId)
  );

  const activeCount = emailSubscriptions.filter(
    sub => !personOptOuts.includes(sub.personId)
  ).length;

  if (emailSubscriptions.length === 0) {
    return null;
  }

  return (
    <div>
      <button
        onClick={() => setShowActiveSubscriptions(!showActiveSubscriptions)}
        className="flex items-center justify-between w-full text-left"
      >
        <span>Manage email subscriptions ({activeCount} active)</span>
        {showActiveSubscriptions ? '▲' : '▼'}
      </button>
      
      {showActiveSubscriptions && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-gray-600 mb-2">
            You&apos;re receiving email updates about these people because you&apos;ve shown support for them.
          </p>
          {emailSubscriptions
            .filter(sub => !personOptOuts.includes(sub.personId))
            .map((subscription) => (
              <div key={subscription.personId} className="p-3">
                <div className="text-sm font-medium">{subscription.firstName} {subscription.lastName}</div>
                <div className="text-xs">{subscription.townName}, {subscription.townState}</div>
                <button
                  onClick={() => setPersonOptOuts([...personOptOuts, subscription.personId])}
                  className="text-sm"
                >
                  Unsubscribe
                </button>
              </div>
            ))}
          {activeCount === 0 && (
            <p className="text-sm text-gray-500 italic p-3">All subscriptions are currently opted out.</p>
          )}
        </div>
      )}
    </div>
  );
}

describe('Email Subscription Auto-expand', () => {
  const mockSubscriptions = [
    {
      personId: 'person-1',
      firstName: 'Jane',
      lastName: 'Smith',
      townName: 'Test Town',
      townState: 'CA',
      isOptedOut: false,
    },
    {
      personId: 'person-2',
      firstName: 'Bob',
      lastName: 'Johnson',
      townName: 'Another Town',
      townState: 'NY',
      isOptedOut: true,
    },
  ];

  it('should auto-expand email subscriptions section by default', () => {
    render(<EmailPreferences emailSubscriptions={mockSubscriptions} />);

    // Check that the section is expanded by default
    expect(screen.getByText('Manage email subscriptions (1 active)')).toBeInTheDocument();
    
    // Active subscription should be visible without clicking
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Test Town, CA')).toBeInTheDocument();
    
    // The explanatory text should be visible
    expect(screen.getByText("You're receiving email updates about these people because you've shown support for them.")).toBeInTheDocument();
  });

  it('should show correct count of active subscriptions', () => {
    render(<EmailPreferences emailSubscriptions={mockSubscriptions} />);

    // Should show 1 active (Jane Smith) since Bob Johnson is opted out
    expect(screen.getByText('Manage email subscriptions (1 active)')).toBeInTheDocument();
  });

  it('should allow collapsing the expanded section', () => {
    render(<EmailPreferences emailSubscriptions={mockSubscriptions} />);

    // Initially expanded
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();

    // Click to collapse
    const button = screen.getByText('Manage email subscriptions (1 active)');
    fireEvent.click(button);

    // Should be collapsed
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    expect(screen.queryByText("You're receiving email updates about these people because you've shown support for them.")).not.toBeInTheDocument();
  });

  it('should update count when unsubscribing', () => {
    render(<EmailPreferences emailSubscriptions={mockSubscriptions} />);

    // Initially 1 active
    expect(screen.getByText('Manage email subscriptions (1 active)')).toBeInTheDocument();

    // Click unsubscribe
    const unsubscribeButton = screen.getByText('Unsubscribe');
    fireEvent.click(unsubscribeButton);

    // Should now show 0 active
    expect(screen.getByText('Manage email subscriptions (0 active)')).toBeInTheDocument();
    expect(screen.getByText('All subscriptions are currently opted out.')).toBeInTheDocument();
  });

  it('should handle empty subscriptions', () => {
    const { container } = render(<EmailPreferences emailSubscriptions={[]} />);
    
    // Should render nothing
    expect(container.firstChild).toBeNull();
  });

  it('should handle all opted out subscriptions', () => {
    const allOptedOut = mockSubscriptions.map(sub => ({ ...sub, isOptedOut: true }));
    render(<EmailPreferences emailSubscriptions={allOptedOut} />);

    // Should show 0 active
    expect(screen.getByText('Manage email subscriptions (0 active)')).toBeInTheDocument();
    
    // Should show the empty message when expanded
    expect(screen.getByText('All subscriptions are currently opted out.')).toBeInTheDocument();
  });

  it('should remain expanded after unsubscribing', () => {
    render(<EmailPreferences emailSubscriptions={mockSubscriptions} />);

    // Click unsubscribe
    const unsubscribeButton = screen.getByText('Unsubscribe');
    fireEvent.click(unsubscribeButton);

    // Section should remain expanded
    expect(screen.getByText("You're receiving email updates about these people because you've shown support for them.")).toBeInTheDocument();
    expect(screen.getByText('All subscriptions are currently opted out.')).toBeInTheDocument();
  });

  it('should toggle expand/collapse indicator', () => {
    render(<EmailPreferences emailSubscriptions={mockSubscriptions} />);

    // Initially shows up arrow (expanded)
    expect(screen.getByText('▲')).toBeInTheDocument();

    // Click to collapse
    const button = screen.getByText('Manage email subscriptions (1 active)');
    fireEvent.click(button);

    // Should show down arrow
    expect(screen.getByText('▼')).toBeInTheDocument();
    expect(screen.queryByText('▲')).not.toBeInTheDocument();
  });
});