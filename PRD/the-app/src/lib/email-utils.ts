/**
 * Obfuscates an email address for privacy while keeping it recognizable
 * Example: "john.doe@example.com" becomes "j***@example.com"
 */
export function obfuscateEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return email;
  }

  // Handle multiple @ symbols by only splitting on the first one
  const atIndex = email.indexOf('@');
  const localPart = email.substring(0, atIndex);
  const domain = email.substring(atIndex + 1);
  
  if (localPart.length <= 1) {
    return `${localPart}***@${domain}`;
  }

  // Show first character and replace rest with asterisks
  const obfuscatedLocal = localPart[0] + '***';
  
  return `${obfuscatedLocal}@${domain}`;
}