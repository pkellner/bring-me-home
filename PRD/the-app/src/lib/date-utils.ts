/**
 * Formats a UTC date string to display the correct local date
 * This handles the timezone issue where dates stored at UTC midnight
 * appear as the previous day in timezones behind UTC
 */
export function formatDateForDisplay(dateString: string): Date {
  // Parse the date string
  const date = new Date(dateString);
  
  // Get the UTC date components
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  
  // Create a new date using the UTC components as local components
  // This ensures the date displays correctly regardless of timezone
  const localDate = new Date(year, month, day);
  
  return localDate;
}

/**
 * Formats a date string to YYYY-MM-DD format for HTML date inputs
 */
export function formatDateForInput(dateString: string): string {
  const date = formatDateForDisplay(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date string to YYYY-MM-DDTHH:MM format for HTML datetime-local inputs
 */
export function formatDateTimeForInput(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}