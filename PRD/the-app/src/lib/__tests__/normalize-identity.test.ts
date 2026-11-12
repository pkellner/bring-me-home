import {
  normalizeEmail,
  normalizeOptionalEmail,
  normalizeUsername,
  normalizeUsernameForLookup,
} from '../normalize-identity';

describe('normalizeEmail', () => {
  it('lowercases', () => {
    expect(normalizeEmail('Joe@Example.COM')).toBe('joe@example.com');
  });

  it('trims leading and trailing spaces', () => {
    expect(normalizeEmail('  joe@example.com  ')).toBe('joe@example.com');
  });

  it('trims tabs, newlines and no-break spaces', () => {
    expect(normalizeEmail('\tjoe@example.com\r\n')).toBe('joe@example.com');
    expect(normalizeEmail(' joe@example.com ')).toBe('joe@example.com');
  });

  it('keeps inner characters as they are', () => {
    expect(normalizeEmail('Joe.Smith+Tag@Example.com')).toBe('joe.smith+tag@example.com');
  });

  it('lowercases non-ASCII letters and keeps accents', () => {
    expect(normalizeEmail('JOSÉ@Ejemplo.ES')).toBe('josé@ejemplo.es');
    expect(normalizeEmail('josé@x.com')).not.toBe(normalizeEmail('jose@x.com'));
  });

  it('is idempotent', () => {
    const once = normalizeEmail(' Joe@Example.com ');
    expect(normalizeEmail(once)).toBe(once);
  });

  it('turns empty and whitespace-only input into ""', () => {
    expect(normalizeEmail('')).toBe('');
    expect(normalizeEmail('   ')).toBe('');
  });

  it('throws on null or undefined instead of guessing', () => {
    expect(() => normalizeEmail(null as unknown as string)).toThrow('normalizeEmail expects a string, got null');
    expect(() => normalizeEmail(undefined as unknown as string)).toThrow('normalizeEmail expects a string, got undefined');
  });
});

describe('normalizeOptionalEmail', () => {
  it('returns null for null and undefined', () => {
    expect(normalizeOptionalEmail(null)).toBeNull();
    expect(normalizeOptionalEmail(undefined)).toBeNull();
  });

  it('returns null for "" and whitespace-only input, so an empty form field never stores ""', () => {
    expect(normalizeOptionalEmail('')).toBeNull();
    expect(normalizeOptionalEmail(' \t\n')).toBeNull();
  });

  it('normalises a present email', () => {
    expect(normalizeOptionalEmail(' Joe@Example.com\n')).toBe('joe@example.com');
  });
});

describe('normalizeUsername', () => {
  it('trims and lowercases', () => {
    expect(normalizeUsername('  Peter\t')).toBe('peter');
    expect(normalizeUsername('Town_Admin_1')).toBe('town_admin_1');
  });

  it('lowercases non-ASCII letters', () => {
    expect(normalizeUsername('ÉLODIE')).toBe('élodie');
  });

  it('gives a commenter the same username as their email', () => {
    // Comment submission creates users whose username is their email.
    expect(normalizeUsername(' Joe@Example.com ')).toBe(normalizeEmail(' Joe@Example.com '));
  });

  it('turns whitespace-only input into "" (validation rejects it)', () => {
    expect(normalizeUsername('   ')).toBe('');
  });

  it('throws on a non-string', () => {
    expect(() => normalizeUsername(undefined as unknown as string)).toThrow(TypeError);
  });
});

describe('normalizeUsernameForLookup', () => {
  it('lowercases', () => {
    expect(normalizeUsernameForLookup('PeTeR')).toBe('peter');
  });

  it('does not trim yet: issue #1 step 0 must first show no stored username has surrounding spaces', () => {
    expect(normalizeUsernameForLookup(' Peter ')).toBe(' peter ');
  });

  it('throws on a non-string', () => {
    expect(() => normalizeUsernameForLookup(null as unknown as string)).toThrow(TypeError);
  });
});
