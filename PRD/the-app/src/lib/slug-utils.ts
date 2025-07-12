import { customAlphabet } from 'nanoid';

// Create a custom nanoid with only lowercase alphanumeric characters
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 4);

/**
 * Converts a string to a clean slug with underscores
 * @param source - The source string to convert
 * @returns A cleaned slug with underscores instead of spaces
 */
export function createBaseSlug(source: string): string {
  if (!source || typeof source !== 'string') {
    return '';
  }

  return source
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove accent marks
    .trim() // Remove leading/trailing whitespace
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, '') // Remove non-alphanumeric except spaces
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/^_+|_+$/g, ''); // Trim underscores from start/end
}

/**
 * Creates a unique slug, checking against existing slugs
 * @param source - The source string to convert to a slug
 * @param existingSlugs - Array of existing slugs to check against
 * @returns A unique slug
 */
export function createUniqueSlug(
  source: string,
  existingSlugs: string[] = []
): string {
  const baseSlug = createBaseSlug(source);
  
  // If the base slug is empty, generate a random one
  if (!baseSlug) {
    return `person_${nanoid()}`;
  }

  // Check if the base slug already exists
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  // Generate a unique slug by appending a random suffix
  let uniqueSlug: string;
  do {
    uniqueSlug = `${baseSlug}_${nanoid()}`;
  } while (existingSlugs.includes(uniqueSlug));

  return uniqueSlug;
}

/**
 * Creates a person slug from name components
 * @param firstName - First name
 * @param middleName - Middle name (optional)
 * @param lastName - Last name
 * @param existingSlugs - Array of existing slugs to check against
 * @returns A unique person slug
 */
export function createPersonSlug(
  firstName: string,
  middleName: string | null | undefined,
  lastName: string,
  existingSlugs: string[] = []
): string {
  // Combine name parts, filtering out empty values
  const nameParts = [firstName, middleName, lastName]
    .filter(part => part && part.trim())
    .join(' ');

  return createUniqueSlug(nameParts, existingSlugs);
}

/**
 * Creates a town slug from the town name
 * @param townName - The town name
 * @param existingSlugs - Array of existing slugs to check against
 * @returns A unique town slug
 */
export function createTownSlug(
  townName: string,
  existingSlugs: string[] = []
): string {
  return createUniqueSlug(townName, existingSlugs);
}