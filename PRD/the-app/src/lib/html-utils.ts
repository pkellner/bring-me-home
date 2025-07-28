/**
 * Strip HTML tags from a string to get plain text
 */
export function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Truncate HTML content safely
 * This strips tags first to avoid breaking HTML structure
 */
export function truncateHtml(html: string, maxLength: number): string {
  const textContent = stripHtmlTags(html);
  if (textContent.length <= maxLength) return html;
  
  // For now, return plain text truncated
  // A more sophisticated approach would preserve some HTML formatting
  return textContent.substring(0, maxLength).trim() + '...';
}

/**
 * Get a plain text preview from HTML content
 * Useful for email subjects, previews, etc.
 */
export function getTextPreview(html: string, maxLength: number = 100): string {
  const text = stripHtmlTags(html);
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}