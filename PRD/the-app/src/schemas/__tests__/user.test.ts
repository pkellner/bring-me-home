import { CreateUserSchema, UpdateUserSchema } from '../user';

const valid = { username: 'peter', email: 'peter@example.com', password: 'longenough1' };

describe('CreateUserSchema normalises usernames and emails before validating', () => {
  it('stores the username trimmed and lowercased', () => {
    const result = CreateUserSchema.parse({ ...valid, username: '  Peter\t' });
    expect(result.username).toBe('peter');
  });

  it('checks the minimum length on the trimmed username, with the existing message', () => {
    const result = CreateUserSchema.safeParse({ ...valid, username: '  ab  ' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Username must be at least 3 characters');
  });

  it('accepts a space-padded, mixed-case email and stores it normalised', () => {
    const result = CreateUserSchema.parse({ ...valid, email: ' Peter@Example.COM ' });
    expect(result.email).toBe('peter@example.com');
  });

  it('keeps "" as no email', () => {
    expect(CreateUserSchema.parse({ ...valid, email: '' }).email).toBeUndefined();
  });

  it('keeps the existing message for an invalid email', () => {
    const result = CreateUserSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Invalid email format');
  });
});

describe('UpdateUserSchema', () => {
  it('normalises the same way', () => {
    const result = UpdateUserSchema.parse({ username: ' Peter ', email: 'Peter@Example.com ' });
    expect(result).toMatchObject({ username: 'peter', email: 'peter@example.com' });
  });
});
