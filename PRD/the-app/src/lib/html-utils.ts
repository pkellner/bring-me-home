/**
 * Strip HTML tags and decode HTML entities from a string to get plain text
 */
export function stripHtmlTags(html: string): string {
  const stripped = html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&amp;/g, '&') // Replace ampersand entities
    .replace(/&lt;/g, '<') // Replace less-than entities
    .replace(/&gt;/g, '>') // Replace greater-than entities
    .replace(/&quot;/g, '"') // Replace quote entities
    .replace(/&#39;/g, "'") // Replace apostrophe entities
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(Number(dec))) // Replace decimal entities
    .replace(/&#x([a-fA-F0-9]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16))) // Replace hex entities
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim(); // Remove leading/trailing whitespace

  return stripped;
}

/**
 * Truncate text to a maximum length, adding ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Truncate HTML content safely by stripping tags first
 * This avoids breaking HTML structure
 */
export function truncateHtml(html: string, maxLength: number): string {
  const plainText = stripHtmlTags(html);
  return truncateText(plainText, maxLength);
}

/**
 * Get a plain text preview from HTML content
 * Useful for email subjects, previews, etc.
 */
export function getTextPreview(html: string, maxLength: number = 100): string {
  const plainText = stripHtmlTags(html);
  return truncateText(plainText, maxLength);
}