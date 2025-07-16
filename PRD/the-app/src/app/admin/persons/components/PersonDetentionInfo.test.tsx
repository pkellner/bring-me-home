import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PersonDetentionInfo from './PersonDetentionInfo';
import { DetentionCenter } from '@prisma/client';

describe('PersonDetentionInfo', () => {
  const mockDetentionCenter: DetentionCenter = {
    id: 'center-123',
    name: 'Test Detention Center',
    slug: 'test-detention-center',
    city: 'Test City',
    state: 'TS',
    address: '123 Test St',
    phone: '555-1234',
    email: 'test@detention.gov',
    website: 'https://test.detention.gov',
    capacity: 500,
    currentPopulation: 300,
    imageId: 'image-123',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPerson = {
    detentionDate: new Date('2023-01-15'),
    detentionStatus: 'detained',
    caseNumber: 'CASE-12345',
    bondAmount: '5000.00',
    lastHeardFromDate: new Date('2023-12-01'),
    notesFromLastContact: 'Spoke with family',
    representedByLawyer: true,
    representedByNotes: 'Attorney John Smith',
  };

  const defaultProps = {
    selectedDetentionCenter: null,
    selectedDetentionCenterId: null,
    onOpenModal: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Detention Center Selection', () => {
    test('shows select button when no detention center is selected', () => {
      render(<PersonDetentionInfo {...defaultProps} />);
      
      expect(screen.getByText('Select detention center')).toBeInTheDocument();
      expect(screen.queryByText('Change detention center')).not.toBeInTheDocument();
    });

    test('shows detention center details when selected', () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenter={mockDetentionCenter}
          selectedDetentionCenterId={mockDetentionCenter.id}
        />
      );
      
      expect(screen.getByText('Test Detention Center')).toBeInTheDocument();
      expect(screen.getByText('Test City, TS')).toBeInTheDocument();
      expect(screen.getByText('Change detention center')).toBeInTheDocument();
    });

    test('handles detention center selection button click', () => {
      render(<PersonDetentionInfo {...defaultProps} />);
      
      const selectButton = screen.getByText('Select detention center');
      fireEvent.click(selectButton);
      
      expect(defaultProps.onOpenModal).toHaveBeenCalledTimes(1);
    });

    test('handles change detention center button click', () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenter={mockDetentionCenter}
          selectedDetentionCenterId={mockDetentionCenter.id}
        />
      );
      
      const changeButton = screen.getByText('Change detention center');
      fireEvent.click(changeButton);
      
      expect(defaultProps.onOpenModal).toHaveBeenCalledTimes(1);
    });
  });

  describe('Case Number field validation', () => {
    test('handles empty case number', async () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const input = screen.getByLabelText('Case Number');
      expect(input).toHaveValue('');
    });

    test('handles removing an existing case number', async () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          person={mockPerson}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const input = screen.getByLabelText('Case Number');
      
      // Verify initial value
      expect(input).toHaveValue('CASE-12345');
      
      // Clear the case number
      await userEvent.clear(input);
      expect(input).toHaveValue('');
      
      // The form should accept empty case number as it's optional
      expect(input).not.toHaveAttribute('required');
    });

    test('handles case number with letters and numbers', async () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const input = screen.getByLabelText('Case Number');
      await userEvent.type(input, 'A-123-456-B');
      expect(input).toHaveValue('A-123-456-B');
    });

    test('handles case number with special characters', async () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const input = screen.getByLabelText('Case Number');
      await userEvent.type(input, 'CASE#2023/001-A');
      expect(input).toHaveValue('CASE#2023/001-A');
    });

    test('handles very long case number', async () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const input = screen.getByLabelText('Case Number');
      const longCaseNumber = 'CASE-' + '1234567890'.repeat(10);
      await userEvent.type(input, longCaseNumber);
      expect(input).toHaveValue(longCaseNumber);
    });

    test('handles case number with only spaces', async () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const input = screen.getByLabelText('Case Number');
      await userEvent.type(input, '   ');
      expect(input).toHaveValue('   ');
    });

    test('preserves existing case number', () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          person={mockPerson}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const input = screen.getByLabelText('Case Number');
      expect(input).toHaveValue('CASE-12345');
    });
  });

  describe('Bond Amount field validation', () => {
    test('handles empty bond amount', async () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const input = screen.getByLabelText('Bond Amount') as HTMLInputElement;
      expect(input).toHaveValue(null);
      expect(input.type).toBe('number');
    });

    test('handles removing an existing bond amount', async () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          person={mockPerson}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const input = screen.getByLabelText('Bond Amount');
      
      // Verify initial value
      expect(input).toHaveValue(5000);
      
      // Clear the bond amount
      await userEvent.clear(input);
      expect(input).toHaveValue(null);
      
      // The form should accept empty bond amount as it's optional
      expect(input).not.toHaveAttribute('required');
    });

    test('handles whole number bond amount', async () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const input = screen.getByLabelText('Bond Amount');
      await userEvent.type(input, '10000');
      expect(input).toHaveValue(10000);
    });

    test('handles decimal bond amount', async () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const input = screen.getByLabelText('Bond Amount');
      await userEvent.type(input, '5500.50');
      expect(input).toHaveValue(5500.50);
    });

    test('handles zero bond amount', async () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const input = screen.getByLabelText('Bond Amount');
      await userEvent.type(input, '0');
      expect(input).toHaveValue(0);
    });

    test('handles very large bond amount', async () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const input = screen.getByLabelText('Bond Amount');
      await userEvent.type(input, '9999999.99');
      expect(input).toHaveValue(9999999.99);
    });

    test('validates minimum value constraint', () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const input = screen.getByLabelText('Bond Amount');
      expect(input).toHaveAttribute('min', '0');
    });

    test('validates step constraint for decimals', () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const input = screen.getByLabelText('Bond Amount');
      expect(input).toHaveAttribute('step', '0.01');
    });

    test('preserves existing bond amount', () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          person={mockPerson}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const input = screen.getByLabelText('Bond Amount');
      expect(input).toHaveValue(5000);
    });
  });

  describe('Date fields validation', () => {
    test('handles detention date', async () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const input = screen.getByLabelText('Detention Date');
      await userEvent.type(input, '2023-06-15');
      expect(input).toHaveValue('2023-06-15');
    });

    test('handles last heard from date', async () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const input = screen.getByLabelText('Last Heard From Date');
      await userEvent.type(input, '2023-12-25');
      expect(input).toHaveValue('2023-12-25');
    });

    test('preserves existing dates', () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          person={mockPerson}
          selectedDetentionCenterId="center-123"
        />
      );
      
      expect(screen.getByLabelText('Detention Date')).toHaveValue('2023-01-15');
      expect(screen.getByLabelText('Last Heard From Date')).toHaveValue('2023-12-01');
    });
  });

  describe('Detention Status field', () => {
    test('defaults to detained status', () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const select = screen.getByLabelText('Detention Status');
      expect(select).toHaveValue('detained');
    });

    test('displays all status options', () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const select = screen.getByLabelText('Detention Status');
      const options = Array.from(select.querySelectorAll('option')).map(opt => opt.textContent);
      expect(options).toEqual(['Detained', 'Released', 'Deported', 'In Proceedings']);
    });

    test('handles status change', async () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const select = screen.getByLabelText('Detention Status');
      
      await userEvent.selectOptions(select, 'released');
      expect(select).toHaveValue('released');
      
      await userEvent.selectOptions(select, 'in-proceedings');
      expect(select).toHaveValue('in-proceedings');
    });
  });

  describe('Notes fields validation', () => {
    test('handles empty notes from last contact', async () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const textarea = screen.getByLabelText('Notes from Last Contact');
      expect(textarea).toHaveValue('');
      expect(textarea).toHaveAttribute('rows', '3');
    });

    test('handles removing existing notes from last contact', async () => {
      const personWithNotes = {
        ...mockPerson,
        notesFromLastContact: 'Previous contact notes here'
      };
      
      render(
        <PersonDetentionInfo
          {...defaultProps}
          person={personWithNotes}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const textarea = screen.getByLabelText('Notes from Last Contact');
      
      // Verify initial value
      expect(textarea).toHaveValue('Previous contact notes here');
      
      // Clear the notes
      await userEvent.clear(textarea);
      expect(textarea).toHaveValue('');
      
      // The form should accept empty notes as it's optional
      expect(textarea).not.toHaveAttribute('required');
    });

    test('handles single line notes', async () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const textarea = screen.getByLabelText('Notes from Last Contact');
      await userEvent.type(textarea, 'Brief contact note');
      expect(textarea).toHaveValue('Brief contact note');
    });

    test('handles multi-line notes', async () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const textarea = screen.getByLabelText('Notes from Last Contact');
      const multiLineNote = 'Line 1\nLine 2\nLine 3 with more information';
      await userEvent.type(textarea, multiLineNote);
      expect(textarea).toHaveValue(multiLineNote);
    });

    test('handles notes with special characters', async () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const textarea = screen.getByLabelText('Notes from Last Contact');
      const specialNote = 'Called @ 3:00 PM - Person said "I\'m doing okay" & asked about $$$';
      await userEvent.type(textarea, specialNote);
      expect(textarea).toHaveValue(specialNote);
    });

    test('handles very long notes', async () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const textarea = screen.getByLabelText('Notes from Last Contact');
      const longNote = 'This is a very detailed note about the last contact. '.repeat(20);
      await userEvent.type(textarea, longNote);
      expect(textarea).toHaveValue(longNote);
    });

    test('handles notes with only spaces', async () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const textarea = screen.getByLabelText('Notes from Last Contact');
      await userEvent.type(textarea, '     ');
      expect(textarea).toHaveValue('     ');
    });
  });

  describe('Legal Representation fields', () => {
    test('handles represented by lawyer checkbox', async () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const checkbox = screen.getByLabelText('Represented by Lawyer');
      expect(checkbox).not.toBeChecked();
      
      await userEvent.click(checkbox);
      expect(checkbox).toBeChecked();
      
      await userEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    test('handles legal representation notes', async () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const textarea = screen.getByLabelText('Legal Representation Notes');
      const legalNote = 'Attorney: Jane Doe\nPhone: 555-1234\nCase Status: Pending appeal';
      await userEvent.type(textarea, legalNote);
      expect(textarea).toHaveValue(legalNote);
    });

    test('preserves existing legal representation data', () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          person={mockPerson}
          selectedDetentionCenterId="center-123"
        />
      );
      
      expect(screen.getByLabelText('Represented by Lawyer')).toBeChecked();
      expect(screen.getByLabelText('Legal Representation Notes')).toHaveValue('Attorney John Smith');
    });

    test('handles removing existing legal representation notes', async () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          person={mockPerson}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const textarea = screen.getByLabelText('Legal Representation Notes');
      
      // Verify initial value
      expect(textarea).toHaveValue('Attorney John Smith');
      
      // Clear the notes
      await userEvent.clear(textarea);
      expect(textarea).toHaveValue('');
      
      // The form should accept empty legal notes as it's optional
      expect(textarea).not.toHaveAttribute('required');
    });
  });

  describe('Field visibility', () => {
    test('hides detention fields when no detention center is selected', () => {
      render(<PersonDetentionInfo {...defaultProps} />);
      
      expect(screen.queryByLabelText('Detention Date')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Detention Status')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Case Number')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Bond Amount')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Last Heard From Date')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Notes from Last Contact')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Represented by Lawyer')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Legal Representation Notes')).not.toBeInTheDocument();
    });

    test('shows all detention fields when detention center is selected', () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenterId="center-123"
        />
      );
      
      expect(screen.getByLabelText('Detention Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Detention Status')).toBeInTheDocument();
      expect(screen.getByLabelText('Case Number')).toBeInTheDocument();
      expect(screen.getByLabelText('Bond Amount')).toBeInTheDocument();
      expect(screen.getByLabelText('Last Heard From Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Notes from Last Contact')).toBeInTheDocument();
      expect(screen.getByLabelText('Represented by Lawyer')).toBeInTheDocument();
      expect(screen.getByLabelText('Legal Representation Notes')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    test('handles all fields with maximum values', async () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const caseNumber = screen.getByLabelText('Case Number');
      const bondAmount = screen.getByLabelText('Bond Amount');
      const notes = screen.getByLabelText('Notes from Last Contact');
      const legalNotes = screen.getByLabelText('Legal Representation Notes');
      
      const veryLongString = 'A'.repeat(500);
      
      await userEvent.type(caseNumber, veryLongString);
      await userEvent.type(bondAmount, '99999999.99');
      await userEvent.type(notes, veryLongString);
      await userEvent.type(legalNotes, veryLongString);
      
      expect(caseNumber).toHaveValue(veryLongString);
      expect(bondAmount).toHaveValue(99999999.99);
      expect(notes).toHaveValue(veryLongString);
      expect(legalNotes).toHaveValue(veryLongString);
    });

    test('handles rapid field changes', async () => {
      render(
        <PersonDetentionInfo
          {...defaultProps}
          selectedDetentionCenterId="center-123"
        />
      );
      
      const caseNumber = screen.getByLabelText('Case Number');
      
      await userEvent.type(caseNumber, 'TEST1');
      await userEvent.clear(caseNumber);
      await userEvent.type(caseNumber, 'TEST2');
      await userEvent.clear(caseNumber);
      await userEvent.type(caseNumber, 'FINAL');
      
      expect(caseNumber).toHaveValue('FINAL');
    });
  });
});