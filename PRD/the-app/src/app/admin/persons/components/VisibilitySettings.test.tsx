import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VisibilitySettings from './VisibilitySettings';

describe('VisibilitySettings', () => {
  const mockPerson = {
    showDetentionInfo: true,
    showLastHeardFrom: false,
    showDetentionDate: true,
    showCommunitySupport: false,
  };

  describe('Component rendering', () => {
    test('renders all visibility checkboxes', () => {
      render(<VisibilitySettings />);
      
      expect(screen.getByText('Public Visibility Settings')).toBeInTheDocument();
      expect(screen.getByText('Control what information is visible to the public on the person\'s profile page.')).toBeInTheDocument();
      
      expect(screen.getByLabelText('Show detention center information')).toBeInTheDocument();
      expect(screen.getByLabelText('Show "Last Heard From" information')).toBeInTheDocument();
      expect(screen.getByLabelText('Show detention date')).toBeInTheDocument();
      expect(screen.getByLabelText('Show "Community Support" section')).toBeInTheDocument();
    });

    test('renders checkbox descriptions', () => {
      render(<VisibilitySettings />);
      
      expect(screen.getByText('When checked, detention center details will be shown on the public profile')).toBeInTheDocument();
      expect(screen.getByText('When checked, the last contact date will be shown publicly')).toBeInTheDocument();
      expect(screen.getByText('When checked, the detention date will be shown publicly')).toBeInTheDocument();
      expect(screen.getByText('When checked, the community comments section will be shown publicly')).toBeInTheDocument();
    });
  });

  describe('Default checkbox states', () => {
    test('all checkboxes default to checked when no person provided', () => {
      render(<VisibilitySettings />);
      
      expect(screen.getByLabelText('Show detention center information')).toBeChecked();
      expect(screen.getByLabelText('Show "Last Heard From" information')).toBeChecked();
      expect(screen.getByLabelText('Show detention date')).toBeChecked();
      expect(screen.getByLabelText('Show "Community Support" section')).toBeChecked();
    });

    test('checkboxes reflect person settings when provided', () => {
      render(<VisibilitySettings person={mockPerson} />);
      
      expect(screen.getByLabelText('Show detention center information')).toBeChecked();
      expect(screen.getByLabelText('Show "Last Heard From" information')).not.toBeChecked();
      expect(screen.getByLabelText('Show detention date')).toBeChecked();
      expect(screen.getByLabelText('Show "Community Support" section')).not.toBeChecked();
    });
  });

  describe('Show detention center information checkbox', () => {
    test('toggles detention info checkbox', async () => {
      render(<VisibilitySettings />);
      
      const checkbox = screen.getByLabelText('Show detention center information');
      
      expect(checkbox).toBeChecked();
      await userEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
      await userEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    test('preserves detention info state from person', () => {
      const person = { showDetentionInfo: false };
      render(<VisibilitySettings person={person} />);
      
      const checkbox = screen.getByLabelText('Show detention center information');
      expect(checkbox).not.toBeChecked();
    });

    test('handles null detention info state', () => {
      const person = { showDetentionInfo: null };
      render(<VisibilitySettings person={person} />);
      
      const checkbox = screen.getByLabelText('Show detention center information');
      expect(checkbox).toBeChecked(); // Defaults to true when null
    });
  });

  describe('Show last heard from checkbox', () => {
    test('toggles last heard from checkbox', async () => {
      render(<VisibilitySettings />);
      
      const checkbox = screen.getByLabelText('Show "Last Heard From" information');
      
      expect(checkbox).toBeChecked();
      await userEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
      await userEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    test('preserves last heard from state from person', () => {
      const person = { showLastHeardFrom: false };
      render(<VisibilitySettings person={person} />);
      
      const checkbox = screen.getByLabelText('Show "Last Heard From" information');
      expect(checkbox).not.toBeChecked();
    });

    test('handles null last heard from state', () => {
      const person = { showLastHeardFrom: null };
      render(<VisibilitySettings person={person} />);
      
      const checkbox = screen.getByLabelText('Show "Last Heard From" information');
      expect(checkbox).toBeChecked(); // Defaults to true when null
    });
  });

  describe('Show detention date checkbox', () => {
    test('toggles detention date checkbox', async () => {
      render(<VisibilitySettings />);
      
      const checkbox = screen.getByLabelText('Show detention date');
      
      expect(checkbox).toBeChecked();
      await userEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
      await userEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    test('preserves detention date state from person', () => {
      const person = { showDetentionDate: false };
      render(<VisibilitySettings person={person} />);
      
      const checkbox = screen.getByLabelText('Show detention date');
      expect(checkbox).not.toBeChecked();
    });

    test('handles null detention date state', () => {
      const person = { showDetentionDate: null };
      render(<VisibilitySettings person={person} />);
      
      const checkbox = screen.getByLabelText('Show detention date');
      expect(checkbox).toBeChecked(); // Defaults to true when null
    });
  });

  describe('Show community support checkbox', () => {
    test('toggles community support checkbox', async () => {
      render(<VisibilitySettings />);
      
      const checkbox = screen.getByLabelText('Show "Community Support" section');
      
      expect(checkbox).toBeChecked();
      await userEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
      await userEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    test('preserves community support state from person', () => {
      const person = { showCommunitySupport: false };
      render(<VisibilitySettings person={person} />);
      
      const checkbox = screen.getByLabelText('Show "Community Support" section');
      expect(checkbox).not.toBeChecked();
    });

    test('handles null community support state', () => {
      const person = { showCommunitySupport: null };
      render(<VisibilitySettings person={person} />);
      
      const checkbox = screen.getByLabelText('Show "Community Support" section');
      expect(checkbox).toBeChecked(); // Defaults to true when null
    });
  });

  describe('Multiple checkbox interactions', () => {
    test('toggles all checkboxes independently', async () => {
      render(<VisibilitySettings />);
      
      const detentionInfo = screen.getByLabelText('Show detention center information');
      const lastHeardFrom = screen.getByLabelText('Show "Last Heard From" information');
      const detentionDate = screen.getByLabelText('Show detention date');
      const communitySupport = screen.getByLabelText('Show "Community Support" section');
      
      // All start as checked
      expect(detentionInfo).toBeChecked();
      expect(lastHeardFrom).toBeChecked();
      expect(detentionDate).toBeChecked();
      expect(communitySupport).toBeChecked();
      
      // Toggle first two off
      await userEvent.click(detentionInfo);
      await userEvent.click(lastHeardFrom);
      
      expect(detentionInfo).not.toBeChecked();
      expect(lastHeardFrom).not.toBeChecked();
      expect(detentionDate).toBeChecked();
      expect(communitySupport).toBeChecked();
      
      // Toggle last two off
      await userEvent.click(detentionDate);
      await userEvent.click(communitySupport);
      
      expect(detentionInfo).not.toBeChecked();
      expect(lastHeardFrom).not.toBeChecked();
      expect(detentionDate).not.toBeChecked();
      expect(communitySupport).not.toBeChecked();
      
      // Toggle all back on
      await userEvent.click(detentionInfo);
      await userEvent.click(lastHeardFrom);
      await userEvent.click(detentionDate);
      await userEvent.click(communitySupport);
      
      expect(detentionInfo).toBeChecked();
      expect(lastHeardFrom).toBeChecked();
      expect(detentionDate).toBeChecked();
      expect(communitySupport).toBeChecked();
    });

    test('handles rapid checkbox toggling', async () => {
      render(<VisibilitySettings />);
      
      const checkbox = screen.getByLabelText('Show detention center information');
      
      // Rapid toggling
      for (let i = 0; i < 10; i++) {
        await userEvent.click(checkbox);
      }
      
      // After even number of clicks, should be in original state
      expect(checkbox).toBeChecked();
    });
  });

  describe('Edge cases', () => {
    test('handles person with all visibility settings as true', () => {
      const person = {
        showDetentionInfo: true,
        showLastHeardFrom: true,
        showDetentionDate: true,
        showCommunitySupport: true,
      };
      
      render(<VisibilitySettings person={person} />);
      
      expect(screen.getByLabelText('Show detention center information')).toBeChecked();
      expect(screen.getByLabelText('Show "Last Heard From" information')).toBeChecked();
      expect(screen.getByLabelText('Show detention date')).toBeChecked();
      expect(screen.getByLabelText('Show "Community Support" section')).toBeChecked();
    });

    test('handles person with all visibility settings as false', () => {
      const person = {
        showDetentionInfo: false,
        showLastHeardFrom: false,
        showDetentionDate: false,
        showCommunitySupport: false,
      };
      
      render(<VisibilitySettings person={person} />);
      
      expect(screen.getByLabelText('Show detention center information')).not.toBeChecked();
      expect(screen.getByLabelText('Show "Last Heard From" information')).not.toBeChecked();
      expect(screen.getByLabelText('Show detention date')).not.toBeChecked();
      expect(screen.getByLabelText('Show "Community Support" section')).not.toBeChecked();
    });

    test('handles person with mixed boolean and null values', () => {
      const person = {
        showDetentionInfo: true,
        showLastHeardFrom: null,
        showDetentionDate: false,
        showCommunitySupport: null,
      };
      
      render(<VisibilitySettings person={person} />);
      
      expect(screen.getByLabelText('Show detention center information')).toBeChecked();
      expect(screen.getByLabelText('Show "Last Heard From" information')).toBeChecked(); // null defaults to true
      expect(screen.getByLabelText('Show detention date')).not.toBeChecked();
      expect(screen.getByLabelText('Show "Community Support" section')).toBeChecked(); // null defaults to true
    });

    test('handles empty person object', () => {
      const person = {};
      render(<VisibilitySettings person={person} />);
      
      // All should default to checked
      expect(screen.getByLabelText('Show detention center information')).toBeChecked();
      expect(screen.getByLabelText('Show "Last Heard From" information')).toBeChecked();
      expect(screen.getByLabelText('Show detention date')).toBeChecked();
      expect(screen.getByLabelText('Show "Community Support" section')).toBeChecked();
    });
  });

  describe('Form field attributes', () => {
    test('checkboxes have correct input attributes', () => {
      render(<VisibilitySettings />);
      
      const detentionInfo = screen.getByLabelText('Show detention center information');
      const lastHeardFrom = screen.getByLabelText('Show "Last Heard From" information');
      const detentionDate = screen.getByLabelText('Show detention date');
      const communitySupport = screen.getByLabelText('Show "Community Support" section');
      
      // Check type
      expect(detentionInfo).toHaveAttribute('type', 'checkbox');
      expect(lastHeardFrom).toHaveAttribute('type', 'checkbox');
      expect(detentionDate).toHaveAttribute('type', 'checkbox');
      expect(communitySupport).toHaveAttribute('type', 'checkbox');
      
      // Check names
      expect(detentionInfo).toHaveAttribute('name', 'showDetentionInfo');
      expect(lastHeardFrom).toHaveAttribute('name', 'showLastHeardFrom');
      expect(detentionDate).toHaveAttribute('name', 'showDetentionDate');
      expect(communitySupport).toHaveAttribute('name', 'showCommunitySupport');
      
      // Check IDs
      expect(detentionInfo).toHaveAttribute('id', 'showDetentionInfo');
      expect(lastHeardFrom).toHaveAttribute('id', 'showLastHeardFrom');
      expect(detentionDate).toHaveAttribute('id', 'showDetentionDate');
      expect(communitySupport).toHaveAttribute('id', 'showCommunitySupport');
    });

    test('checkboxes have correct CSS classes', () => {
      render(<VisibilitySettings />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveClass('h-4', 'w-4', 'text-indigo-600', 'focus:ring-indigo-500', 'border-gray-300', 'rounded');
      });
    });
  });
});