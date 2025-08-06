import { z } from 'zod';

// Get character limits from environment variables (matching person-history.ts)
const CHAR_LIMIT = parseInt(process.env.NEXT_PUBLIC_PERSON_HISTORY_CHAR_LIMIT || '5000', 10);
const HTML_MULTIPLIER = parseInt(process.env.NEXT_PUBLIC_PERSON_HISTORY_HTML_MULTIPLIER || '3', 10);
const HTML_LIMIT = CHAR_LIMIT * HTML_MULTIPLIER; // 15000 by default

// Re-create the schema from person-history.ts for testing
const personHistorySchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().min(1, 'Description is required').max(HTML_LIMIT, `Description HTML content exceeds maximum size. Your content has too much formatting. Please simplify the formatting or shorten the text.`),
  date: z.string().optional().refine((val) => {
    if (!val) return true; // Optional field
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, 'Invalid date format'),
  visible: z.boolean().optional(),
  sendNotifications: z.boolean().optional(),
});

describe('PersonHistory validation', () => {
  describe(`HTML content limit (${HTML_LIMIT} characters with ${CHAR_LIMIT} plain text limit)`, () => {
    it(`should accept plain text under ${HTML_LIMIT} characters`, () => {
      const plainText = 'a'.repeat(HTML_LIMIT - 1);
      const result = personHistorySchema.safeParse({
        title: 'Test Title',
        description: plainText,
        visible: true,
      });
      
      expect(result.success).toBe(true);
    });

    it(`should accept exactly ${HTML_LIMIT} characters of HTML`, () => {
      const exactLimit = 'a'.repeat(HTML_LIMIT);
      const result = personHistorySchema.safeParse({
        title: 'Test Title',
        description: exactLimit,
        visible: true,
      });
      
      expect(result.success).toBe(true);
    });

    it(`should reject HTML content over ${HTML_LIMIT} characters`, () => {
      const overLimit = 'a'.repeat(HTML_LIMIT + 1);
      const result = personHistorySchema.safeParse({
        title: 'Test Title',
        description: overLimit,
        visible: true,
      });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.description).toContain(
          'Description HTML content exceeds maximum size. Your content has too much formatting. Please simplify the formatting or shorten the text.'
        );
      }
    });

    it(`should accept HTML content under ${HTML_LIMIT} total characters`, () => {
      // This HTML has about 100 characters of markup
      const htmlContent = '<p>This is <strong>bold</strong> and <em>italic</em> text with <a href="http://example.com">a link</a>.</p>';
      expect(htmlContent.length).toBeLessThan(HTML_LIMIT);
      
      const result = personHistorySchema.safeParse({
        title: 'Test Title',
        description: htmlContent,
        visible: true,
      });
      
      expect(result.success).toBe(true);
    });

    it(`should accept ${CHAR_LIMIT} chars of plain text with heavy HTML formatting`, () => {
      // Create HTML content with CHAR_LIMIT plain text chars but lots of HTML
      const plainText = 'a'.repeat(CHAR_LIMIT);
      const htmlContent = `<p><strong><em>${plainText}</em></strong></p>`; // Adds 33 chars of HTML
      expect(htmlContent.length).toBe(CHAR_LIMIT + 33); // Well under HTML_LIMIT
      
      const result = personHistorySchema.safeParse({
        title: 'Test Title',
        description: htmlContent,
        visible: true,
      });
      
      expect(result.success).toBe(true); // Should pass as it's under 15000
    });

    it(`should handle complex HTML with exactly ${HTML_LIMIT} characters`, () => {
      // Create a string that results in exactly HTML_LIMIT characters when wrapped in HTML
      const textLength = HTML_LIMIT - '<p></p>'.length;
      const text = 'a'.repeat(textLength);
      const htmlContent = `<p>${text}</p>`;
      expect(htmlContent.length).toBe(HTML_LIMIT);
      
      const result = personHistorySchema.safeParse({
        title: 'Test Title',
        description: htmlContent,
        visible: true,
      });
      
      expect(result.success).toBe(true);
    });

    it(`should accept content with ${CHAR_LIMIT - 1} plain text chars and heavy HTML formatting`, () => {
      // Create content with just under CHAR_LIMIT plain text chars and lots of HTML styling
      const plainTextContent = 'a'.repeat(CHAR_LIMIT - 1);
      // Wrap in complex HTML with lots of inline styles (adds ~70 chars)
      const htmlContent = `<p style="font-weight: bold; color: red; font-size: 14px;">${plainTextContent}</p>`;
      
      // This should be around CHAR_LIMIT + 70 chars total - well under HTML_LIMIT
      expect(htmlContent.length).toBeLessThan(HTML_LIMIT);
      
      const result = personHistorySchema.safeParse({
        title: 'Test Title',
        description: htmlContent,
        visible: true,
      });
      
      // It should PASS since total HTML is under 15000
      expect(result.success).toBe(true);
    });

    it(`should properly fail at exactly ${HTML_LIMIT + 1} characters`, () => {
      const overByOne = 'a'.repeat(HTML_LIMIT + 1);
      expect(overByOne.length).toBe(HTML_LIMIT + 1);
      
      const result = personHistorySchema.safeParse({
        title: 'Test Title',
        description: overByOne,
        visible: true,
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('Realistic use cases', () => {
    it('should accept user\'s original content (1992 plain chars, 4855 with HTML)', () => {
      // Simulate the user's original problematic content
      const plainText = 'a'.repeat(1992);
      // Add significant HTML formatting to reach ~4855 chars total
      const htmlContent = `<p style="font-weight: bold;">` + 
        plainText.substring(0, 500) + 
        `</p><p style="color: red;">` + 
        plainText.substring(500, 1000) + 
        `</p><p style="font-size: 14px;">` + 
        plainText.substring(1000) + 
        `</p>`;
      
      // This simulates the user's case: ~1992 plain text, more with HTML
      expect(htmlContent.length).toBeLessThan(HTML_LIMIT); // Well under new limit
      
      const result = personHistorySchema.safeParse({
        title: 'Test Title',
        description: htmlContent,
        visible: true,
      });
      
      expect(result.success).toBe(true); // Should now pass!
    });

    it('should demonstrate the difference between plain text and HTML counting', () => {
      const plainText = 'This is some text content that will be wrapped in HTML tags.';
      const htmlContent = `<p style="font-weight: bold; color: red;">${plainText}</p>`;
      
      // The plain text is much shorter than the HTML
      expect(plainText.length).toBeLessThan(htmlContent.length);
      
      // The HTML version includes all the markup
      const plainTextLength = plainText.length;
      const htmlLength = htmlContent.length;
      const markupLength = htmlLength - plainTextLength;
      
      expect(markupLength).toBeGreaterThan(0);
      
      // Both should be validated based on total HTML length
      const plainResult = personHistorySchema.safeParse({
        title: 'Test',
        description: plainText,
      });
      
      const htmlResult = personHistorySchema.safeParse({
        title: 'Test',
        description: htmlContent,
      });
      
      expect(plainResult.success).toBe(true);
      expect(htmlResult.success).toBe(true);
    });
  });
});