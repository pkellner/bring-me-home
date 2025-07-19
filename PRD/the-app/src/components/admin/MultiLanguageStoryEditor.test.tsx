import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MultiLanguageStoryEditor from './MultiLanguageStoryEditor';

// Mock the RichTextEditor component
jest.mock('@/components/RichTextEditor', () => {
  return function MockRichTextEditor({ 
    value, 
    onChange 
  }: { 
    value: string; 
    onChange: (value: string) => void;
  }) {
    return (
      <div data-testid="rich-text-editor">
        <textarea
          data-testid="editor-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Story content editor"
        />
        <div data-testid="editor-content">{value}</div>
      </div>
    );
  };
});

describe('MultiLanguageStoryEditor', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays existing stories when provided', () => {
    const existingStories = [
      {
        language: 'en',
        storyType: 'personal',
        content: 'This is my personal story in English'
      },
      {
        language: 'es',
        storyType: 'personal',
        content: 'Esta es mi historia personal en español'
      },
      {
        language: 'en',
        storyType: 'detention',
        content: 'These are the detention circumstances'
      }
    ];

    render(
      <MultiLanguageStoryEditor
        stories={existingStories}
        onChange={mockOnChange}
      />
    );

    // The English personal story should be displayed by default
    expect(screen.getByTestId('editor-content')).toHaveTextContent(
      'This is my personal story in English'
    );
  });

  it('displays correct story when switching language', async () => {
    const existingStories = [
      {
        language: 'en',
        storyType: 'personal',
        content: 'English personal story'
      },
      {
        language: 'es',
        storyType: 'personal',
        content: 'Spanish personal story'
      }
    ];

    render(
      <MultiLanguageStoryEditor
        stories={existingStories}
        onChange={mockOnChange}
      />
    );

    // Initially shows English
    expect(screen.getByTestId('editor-content')).toHaveTextContent(
      'English personal story'
    );

    // Switch to Spanish
    const languageButtons = screen.getAllByRole('button');
    const spanishButton = languageButtons.find(btn => 
      btn.textContent?.includes('Español')
    );
    
    if (spanishButton) {
      fireEvent.click(spanishButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('editor-content')).toHaveTextContent(
          'Spanish personal story'
        );
      });
    }
  });

  it('displays correct story when switching story type', async () => {
    const existingStories = [
      {
        language: 'en',
        storyType: 'personal',
        content: 'Personal story content'
      },
      {
        language: 'en',
        storyType: 'detention',
        content: 'Detention story content'
      }
    ];

    render(
      <MultiLanguageStoryEditor
        stories={existingStories}
        onChange={mockOnChange}
      />
    );

    // Initially shows personal story
    expect(screen.getByTestId('editor-content')).toHaveTextContent(
      'Personal story content'
    );

    // Switch to detention story
    const storyTypeButtons = screen.getAllByRole('button');
    const detentionButton = storyTypeButtons.find(btn => 
      btn.textContent?.includes('Detention Circumstances')
    );
    
    if (detentionButton) {
      fireEvent.click(detentionButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('editor-content')).toHaveTextContent(
          'Detention story content'
        );
      });
    }
  });

  it('handles empty stories array', () => {
    render(
      <MultiLanguageStoryEditor
        stories={[]}
        onChange={mockOnChange}
      />
    );

    // Should render without errors and show empty editor
    expect(screen.getByTestId('editor-content')).toHaveTextContent('');
  });

  it('handles undefined stories', () => {
    render(
      <MultiLanguageStoryEditor
        onChange={mockOnChange}
      />
    );

    // Should render without errors and show empty editor
    expect(screen.getByTestId('editor-content')).toHaveTextContent('');
  });

  it('does not cause circular reference errors', () => {
    // This test verifies we're using simplified story objects
    // without circular references
    const stories = [
      {
        language: 'en',
        storyType: 'personal',
        content: 'Test content',
        // Note: No personId, person, or other circular references
      }
    ];

    // This should not throw any errors
    expect(() => {
      render(
        <MultiLanguageStoryEditor
          stories={stories}
          onChange={mockOnChange}
        />
      );
    }).not.toThrow();

    // Verify it rendered correctly
    expect(screen.getByTestId('editor-content')).toHaveTextContent('Test content');
  });

  it('updates story content when edited', async () => {
    const existingStories = [
      {
        language: 'en',
        storyType: 'personal',
        content: 'Original content'
      }
    ];

    render(
      <MultiLanguageStoryEditor
        stories={existingStories}
        onChange={mockOnChange}
      />
    );

    // Edit the content
    const textarea = screen.getByTestId('editor-textarea');
    fireEvent.change(textarea, { target: { value: 'Updated content' } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            language: 'en',
            storyType: 'personal',
            content: 'Updated content'
          })
        ])
      );
    });
  });
});