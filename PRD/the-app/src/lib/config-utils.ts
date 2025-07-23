// Client-safe configuration utilities
// These functions can be safely imported in client components

export function replaceTextPlaceholders(
  text: string,
  replacements: Record<string, string | number>
): string {
  let result = text;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return result;
}