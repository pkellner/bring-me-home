import { obfuscateEmail } from '../email-utils';

describe('obfuscateEmail', () => {
  it('should obfuscate a standard email address', () => {
    expect(obfuscateEmail('john.doe@example.com')).toBe('j***@example.com');
  });

  it('should obfuscate an email with a short local part', () => {
    expect(obfuscateEmail('a@example.com')).toBe('a***@example.com');
  });

  it('should obfuscate an email with numbers', () => {
    expect(obfuscateEmail('user123@test.org')).toBe('u***@test.org');
  });

  it('should handle email with special characters', () => {
    expect(obfuscateEmail('test.user+tag@domain.co.uk')).toBe('t***@domain.co.uk');
  });

  it('should return the original string if it is not a valid email', () => {
    expect(obfuscateEmail('notanemail')).toBe('notanemail');
  });

  it('should return the original string if email is empty', () => {
    expect(obfuscateEmail('')).toBe('');
  });

  it('should return the original string if email is null/undefined', () => {
    expect(obfuscateEmail(null as unknown as string)).toBe(null);
    expect(obfuscateEmail(undefined as unknown as string)).toBe(undefined);
  });

  it('should handle email with multiple @ symbols (invalid but possible input)', () => {
    // Should split on first @ symbol
    expect(obfuscateEmail('user@host@example.com')).toBe('u***@host@example.com');
  });

  it('should handle very long email addresses', () => {
    expect(obfuscateEmail('verylongemailaddress@example.com')).toBe('v***@example.com');
  });

  it('should handle international domains', () => {
    expect(obfuscateEmail('user@例え.jp')).toBe('u***@例え.jp');
  });
});