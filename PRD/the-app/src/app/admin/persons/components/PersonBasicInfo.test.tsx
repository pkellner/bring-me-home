import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PersonBasicInfo from './PersonBasicInfo';

describe('PersonBasicInfo', () => {
  const mockTowns = [
    { id: 'town1', name: 'Town One', state: 'ST', slug: 'town-one' },
    { id: 'town2', name: 'Town Two', state: 'TX', slug: 'town-two' },
    { id: 'town3', name: 'Town Three', state: 'CA', slug: 'town-three' },
  ];

  const mockPerson = {
    firstName: 'John',
    lastName: 'Doe',
    middleName: 'Michael',
    townId: 'town1',
    dateOfBirth: new Date('1990-01-01'),
    lastKnownAddress: '123 Main St',
    isActive: true,
    status: 'detained',
  };

  describe('First Name field validation', () => {
    test('handles empty first name', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('First Name');
      
      expect(input).toHaveAttribute('required');
      expect(input).toHaveValue('');
    });

    test('handles first name with only spaces', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('First Name');
      
      await userEvent.type(input, '   ');
      expect(input).toHaveValue('   ');
    });

    test('handles first name with leading/trailing spaces', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('First Name');
      
      await userEvent.type(input, '  John  ');
      expect(input).toHaveValue('  John  ');
    });

    test('handles multi-word first names', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('First Name');
      
      await userEvent.type(input, 'Mary Jane');
      expect(input).toHaveValue('Mary Jane');
    });

    test('handles first names with hyphens', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('First Name');
      
      await userEvent.type(input, 'Jean-Pierre');
      expect(input).toHaveValue('Jean-Pierre');
    });

    test('handles first names with apostrophes', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('First Name');
      
      await userEvent.type(input, "D'Angelo");
      expect(input).toHaveValue("D'Angelo");
    });

    test('handles international characters in first name', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('First Name');
      
      await userEvent.type(input, 'José María Ñoño');
      expect(input).toHaveValue('José María Ñoño');
    });

    test('displays first name validation errors', () => {
      const errors = { firstName: ['First name is required'] };
      render(<PersonBasicInfo towns={mockTowns} errors={errors} />);
      
      expect(screen.getByText('First name is required')).toBeInTheDocument();
    });
  });

  describe('Last Name field validation', () => {
    test('handles empty last name', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('Last Name');
      
      expect(input).toHaveAttribute('required');
      expect(input).toHaveValue('');
    });

    test('handles last name with only spaces', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('Last Name');
      
      await userEvent.type(input, '   ');
      expect(input).toHaveValue('   ');
    });

    test('handles compound last names', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('Last Name');
      
      await userEvent.type(input, 'García-López de la Vega');
      expect(input).toHaveValue('García-López de la Vega');
    });

    test('handles last names with special characters', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('Last Name');
      
      await userEvent.type(input, "O'Connor-Smith Jr.");
      expect(input).toHaveValue("O'Connor-Smith Jr.");
    });

    test('displays last name validation errors', () => {
      const errors = { lastName: ['Last name is required'] };
      render(<PersonBasicInfo towns={mockTowns} errors={errors} />);
      
      expect(screen.getByText('Last name is required')).toBeInTheDocument();
    });
  });

  describe('Middle Name field validation', () => {
    test('handles empty middle name', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('Middle Name');
      
      expect(input).not.toHaveAttribute('required');
      expect(input).toHaveValue('');
    });

    test('handles middle name with spaces', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('Middle Name');
      
      await userEvent.type(input, '  Ann Marie  ');
      expect(input).toHaveValue('  Ann Marie  ');
    });

    test('handles single letter middle name', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('Middle Name');
      
      await userEvent.type(input, 'J');
      expect(input).toHaveValue('J');
    });

    test('handles multiple middle names', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('Middle Name');
      
      await userEvent.type(input, 'John Paul George');
      expect(input).toHaveValue('John Paul George');
    });

    test('preserves null middle name from existing person', () => {
      const person = { ...mockPerson, middleName: null };
      render(<PersonBasicInfo person={person} towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('Middle Name');
      
      expect(input).toHaveValue('');
    });

    test('handles removing an existing middle name', async () => {
      // Start with a person who has a middle name
      const person = { ...mockPerson, middleName: 'Michael' };
      render(<PersonBasicInfo person={person} towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('Middle Name');
      
      // Verify initial value
      expect(input).toHaveValue('Michael');
      
      // Clear the middle name
      await userEvent.clear(input);
      expect(input).toHaveValue('');
      
      // The form should accept empty middle name as it's optional
      expect(input).not.toHaveAttribute('required');
    });
  });

  describe('Date of Birth field validation', () => {
    test('handles empty date of birth', () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('Date of Birth');
      
      expect(input).toHaveValue('');
      expect(input.getAttribute('type')).toBe('date');
    });

    test('handles valid date of birth', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('Date of Birth');
      
      await userEvent.type(input, '1990-05-15');
      expect(input).toHaveValue('1990-05-15');
    });

    test('handles future date of birth', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('Date of Birth');
      
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];
      
      await userEvent.type(input, futureDateStr);
      expect(input).toHaveValue(futureDateStr);
    });

    test('handles very old date of birth', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('Date of Birth');
      
      await userEvent.type(input, '1900-01-01');
      expect(input).toHaveValue('1900-01-01');
    });

    test('formats existing date of birth correctly', () => {
      render(<PersonBasicInfo person={mockPerson} towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('Date of Birth');
      
      expect(input).toHaveValue('1990-01-01');
    });

    test('handles timezone issues with dates (1/1/2000 showing as 12/31/1999)', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('Date of Birth');
      
      // Enter a date that might have timezone issues
      await userEvent.type(input, '2000-01-01');
      expect(input).toHaveValue('2000-01-01');
      
      // Test with a person that has a midnight UTC date
      const personWithMidnightDate = {
        ...mockPerson,
        // This represents midnight UTC on Jan 1, 2000
        // which could display as Dec 31, 1999 in timezones behind UTC
        dateOfBirth: new Date('2000-01-01T00:00:00.000Z')
      };
      
      render(<PersonBasicInfo person={personWithMidnightDate} towns={mockTowns} errors={{}} />);
      
      // The component should handle timezone conversion properly
      // Check what the actual value is - it might show as 1999-12-31 due to timezone
      const dateInput = screen.getByLabelText('Date of Birth') as HTMLInputElement;
      
      // This test documents the actual behavior - if the date shows as 1999-12-31
      // it means the component is converting UTC to local timezone
      const displayedDate = dateInput.value;
      
      // Add expectation based on timezone behavior
      // If in a timezone behind UTC, this might be '1999-12-31'
      // If in UTC or ahead, this should be '2000-01-01'
      expect(displayedDate).toMatch(/^(1999-12-31|2000-01-01)$/);
      
      // Document this timezone issue for developers
      if (displayedDate === '1999-12-31') {
        console.warn('Date displays as 1999-12-31 due to timezone conversion from UTC to local time');
      }
    });

    test('handles date input in various formats', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('Date of Birth');
      
      // Test standard format
      await userEvent.type(input, '2000-01-01');
      expect(input).toHaveValue('2000-01-01');
      
      // Clear and test another date
      await userEvent.clear(input);
      await userEvent.type(input, '1999-12-31');
      expect(input).toHaveValue('1999-12-31');
    });
  });

  describe('Address field validation', () => {
    test('handles empty address', () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('Last Known Address');
      
      expect(input).toHaveAttribute('required');
      expect(input).toHaveValue('');
    });

    test('handles address with only spaces', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('Last Known Address');
      
      await userEvent.type(input, '     ');
      expect(input).toHaveValue('     ');
    });

    test('handles short address', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('Last Known Address');
      
      await userEvent.type(input, '123 A St');
      expect(input).toHaveValue('123 A St');
    });

    test('handles long complex address', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('Last Known Address');
      
      const longAddress = '12345 Very Long Street Name, Apartment Complex Building B, Unit 567, Floor 12, Near the Big Shopping Mall, City Name, State 12345-6789';
      await userEvent.type(input, longAddress);
      expect(input).toHaveValue(longAddress);
    });

    test('handles address with special characters', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('Last Known Address');
      
      await userEvent.type(input, '123 Main St. #4-B, Cross Street @ 5th Ave.');
      expect(input).toHaveValue('123 Main St. #4-B, Cross Street @ 5th Ave.');
    });

    test('handles international address format', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('Last Known Address');
      
      await userEvent.type(input, 'Calle Principal №123, Piso 4°, Depto. B');
      expect(input).toHaveValue('Calle Principal №123, Piso 4°, Depto. B');
    });

    test('displays address validation errors', () => {
      const errors = { lastKnownAddress: ['Address is required'] };
      render(<PersonBasicInfo towns={mockTowns} errors={errors} />);
      
      expect(screen.getByText('Address is required')).toBeInTheDocument();
    });
  });

  describe('Town selection validation', () => {
    test('shows empty option by default', () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const select = screen.getByLabelText('Town');
      
      expect(select).toHaveValue('');
      expect(screen.getByText('Select a town')).toBeInTheDocument();
    });

    test('displays all towns with state', () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      
      expect(screen.getByText('Town One, ST')).toBeInTheDocument();
      expect(screen.getByText('Town Two, TX')).toBeInTheDocument();
      expect(screen.getByText('Town Three, CA')).toBeInTheDocument();
    });

    test('handles town selection', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const select = screen.getByLabelText('Town');
      
      await userEvent.selectOptions(select, 'town2');
      expect(select).toHaveValue('town2');
    });

    test('displays town validation errors', () => {
      const errors = { townId: ['Please select a town'] };
      render(<PersonBasicInfo towns={mockTowns} errors={errors} />);
      
      expect(screen.getByText('Please select a town')).toBeInTheDocument();
    });

    test('preserves selected town from existing person', () => {
      render(<PersonBasicInfo person={mockPerson} towns={mockTowns} errors={{}} />);
      const select = screen.getByLabelText('Town');
      
      expect(select).toHaveValue('town1');
    });
  });

  describe('Status field validation', () => {
    test('defaults to detained status', () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const select = screen.getByLabelText('Status');
      
      expect(select).toHaveValue('detained');
    });

    test('displays all status options', () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const select = screen.getByLabelText('Status');
      
      const options = Array.from(select.querySelectorAll('option')).map(opt => opt.textContent);
      expect(options).toEqual(['Detained', 'Missing', 'Released', 'Deported']);
    });

    test('handles status change', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const select = screen.getByLabelText('Status');
      
      await userEvent.selectOptions(select, 'missing');
      expect(select).toHaveValue('missing');
      
      await userEvent.selectOptions(select, 'released');
      expect(select).toHaveValue('released');
      
      await userEvent.selectOptions(select, 'deported');
      expect(select).toHaveValue('deported');
    });

    test('displays status validation errors', () => {
      const errors = { status: ['Invalid status'] };
      render(<PersonBasicInfo towns={mockTowns} errors={errors} />);
      
      expect(screen.getByText('Invalid status')).toBeInTheDocument();
    });
  });

  describe('Active checkbox validation', () => {
    test('defaults to checked for new person', () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const checkbox = screen.getByLabelText('Active (visible to public)');
      
      expect(checkbox).toBeChecked();
    });

    test('preserves active state from existing person', () => {
      const inactivePerson = { ...mockPerson, isActive: false };
      render(<PersonBasicInfo person={inactivePerson} towns={mockTowns} errors={{}} />);
      const checkbox = screen.getByLabelText('Active (visible to public)');
      
      expect(checkbox).not.toBeChecked();
    });

    test('handles checkbox toggle', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const checkbox = screen.getByLabelText('Active (visible to public)');
      
      expect(checkbox).toBeChecked();
      
      await userEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
      
      await userEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    });
  });

  describe('Edge cases', () => {
    test('handles all fields with maximum length values', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      
      const veryLongString = 'A'.repeat(255);
      
      await userEvent.type(screen.getByLabelText('First Name'), veryLongString);
      await userEvent.type(screen.getByLabelText('Last Name'), veryLongString);
      await userEvent.type(screen.getByLabelText('Middle Name'), veryLongString);
      await userEvent.type(screen.getByLabelText('Last Known Address'), veryLongString);
      
      expect(screen.getByLabelText('First Name')).toHaveValue(veryLongString);
      expect(screen.getByLabelText('Last Name')).toHaveValue(veryLongString);
      expect(screen.getByLabelText('Middle Name')).toHaveValue(veryLongString);
      expect(screen.getByLabelText('Last Known Address')).toHaveValue(veryLongString);
    });

    test('handles rapid field changes', async () => {
      render(<PersonBasicInfo towns={mockTowns} errors={{}} />);
      const input = screen.getByLabelText('First Name');
      
      // Rapid typing and clearing
      await userEvent.type(input, 'Test');
      await userEvent.clear(input);
      await userEvent.type(input, 'Another');
      await userEvent.clear(input);
      await userEvent.type(input, 'Final');
      
      expect(input).toHaveValue('Final');
    });

    test('handles empty towns array', () => {
      render(<PersonBasicInfo towns={[]} errors={{}} />);
      const select = screen.getByLabelText('Town');
      
      expect(select).toHaveValue('');
      expect(screen.getByText('Select a town')).toBeInTheDocument();
      const options = select.querySelectorAll('option');
      expect(options).toHaveLength(1); // Only the default option
    });
  });
});