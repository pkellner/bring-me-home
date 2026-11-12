const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

// For text and double- or single-quoted attribute values in HTML built as a string.
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, ch => HTML_ESCAPES[ch]);
}
