/**
 * Generates a secure random password with unambiguous characters
 * Excludes similar looking characters: 0, O, o, 1, l, I
 */
export function generateSecurePassword(length: number = 10): string {
  // Use only unambiguous characters
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  
  // Ensure at least one uppercase, one lowercase, and one number
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  
  // Add one of each required type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  
  // Fill the rest randomly
  for (let i = 3; i < length; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  
  // Shuffle the password to avoid predictable patterns
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Validates that a password meets our security requirements
 */
export function isValidPassword(password: string): boolean {
  if (password.length < 10) return false;
  
  // Must contain at least one uppercase letter
  if (!/[A-Z]/.test(password)) return false;
  
  // Must contain at least one lowercase letter
  if (!/[a-z]/.test(password)) return false;
  
  // Must contain at least one number
  if (!/[0-9]/.test(password)) return false;
  
  // Should not contain ambiguous characters
  if (/[0OoIl1]/.test(password)) return false;
  
  return true;
}