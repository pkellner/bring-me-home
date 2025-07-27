# Next.js 15 Testing Best Practices Guide

## Executive Summary

Testing Next.js 15 App Router applications requires a different approach than traditional React testing. Server Components introduce complexities that make direct unit testing impractical. This guide provides actionable patterns for effective testing.

## Quick Reference

### ✅ What Works
- Testing extracted business logic
- Testing Client Components with React Testing Library
- Testing API routes with integration tests
- E2E testing with Playwright
- Testing pure utility functions

### ❌ What Doesn't Work
- Direct unit testing of Server Components
- Mocking deep Next.js internals
- Testing components with server actions inline
- 100% unit test coverage

## Testing Patterns by Component Type

### 1. Server Components

**Don't test directly. Instead:**

```typescript
// ❌ BAD: Server component with inline logic
// app/users/page.tsx
export default async function UsersPage() {
  const users = await prisma.user.findMany({
    where: { active: true },
    include: { roles: true }
  });
  
  const adminCount = users.filter(u => 
    u.roles.some(r => r.name === 'admin')
  ).length;
  
  return <div>Admins: {adminCount}</div>;
}

// ✅ GOOD: Extract and test the logic
// lib/user-utils.ts
export function countAdmins(users: User[]) {
  return users.filter(u => 
    u.roles.some(r => r.name === 'admin')
  ).length;
}

// lib/__tests__/user-utils.test.ts
test('counts admin users', () => {
  const users = [
    { id: '1', roles: [{ name: 'admin' }] },
    { id: '2', roles: [{ name: 'user' }] }
  ];
  expect(countAdmins(users)).toBe(1);
});
```

### 2. Client Components

**Test with React Testing Library:**

```typescript
// components/UserCard.tsx
'use client';

export default function UserCard({ user }: { user: User }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div>
      <h3>{user.name}</h3>
      <button onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Hide' : 'Show'} Details
      </button>
      {expanded && <p>{user.email}</p>}
    </div>
  );
}

// components/__tests__/UserCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import UserCard from '../UserCard';

test('toggles user details', () => {
  const user = { name: 'John', email: 'john@example.com' };
  render(<UserCard user={user} />);
  
  expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();
  
  fireEvent.click(screen.getByText('Show Details'));
  expect(screen.getByText('john@example.com')).toBeInTheDocument();
});
```

### 3. API Routes

**Test with actual HTTP requests:**

```typescript
// app/api/users/route.ts
export async function GET(request: Request) {
  const users = await prisma.user.findMany();
  return Response.json(users);
}

// app/api/users/__tests__/route.test.ts
import { GET } from '../route';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn()
    }
  }
}));

test('GET returns users', async () => {
  const mockUsers = [{ id: '1', name: 'John' }];
  prisma.user.findMany.mockResolvedValue(mockUsers);
  
  const request = new Request('http://localhost/api/users');
  const response = await GET(request);
  const data = await response.json();
  
  expect(response.status).toBe(200);
  expect(data).toEqual(mockUsers);
});
```

### 4. Server Actions

**Test the logic, not the action:**

```typescript
// app/actions/user-actions.ts
'use server';

export async function deleteUser(id: string) {
  await requireAdmin();
  await prisma.user.delete({ where: { id } });
  revalidatePath('/users');
}

// Better: Extract the logic
// lib/user-operations.ts
export async function deleteUserFromDB(id: string) {
  return prisma.user.delete({ where: { id } });
}

// lib/__tests__/user-operations.test.ts
test('deletes user from database', async () => {
  const mockDelete = jest.fn();
  prisma.user.delete = mockDelete;
  
  await deleteUserFromDB('123');
  expect(mockDelete).toHaveBeenCalledWith({ where: { id: '123' } });
});
```

## Testing Strategy by Layer

### Unit Tests (60%)
Focus on:
- Business logic functions
- Data transformations
- Validation logic
- Utility functions
- Client Components

### Integration Tests (25%)
Focus on:
- API route handlers
- Database queries
- External service integrations
- Authentication flows

### E2E Tests (15%)
Focus on:
- Critical user journeys
- Form submissions
- Multi-page workflows
- Payment flows

## Practical Examples

### Example 1: Data Fetching Logic

```typescript
// lib/data/town-queries.ts
export async function getActiveTowns() {
  return prisma.town.findMany({
    where: { active: true },
    include: { _count: { select: { persons: true } } }
  });
}

export function calculateTotalDetained(towns: TownWithCount[]) {
  return towns.reduce((sum, town) => sum + town._count.persons, 0);
}

// lib/data/__tests__/town-queries.test.ts
test('calculates total detained across towns', () => {
  const towns = [
    { _count: { persons: 10 } },
    { _count: { persons: 5 } }
  ];
  expect(calculateTotalDetained(towns)).toBe(15);
});
```

### Example 2: Form Validation

```typescript
// lib/validation/user-validation.ts
export function validateUserForm(data: unknown): UserFormData {
  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    role: z.enum(['admin', 'user'])
  });
  
  return schema.parse(data);
}

// lib/validation/__tests__/user-validation.test.ts
test('validates user form data', () => {
  const valid = { name: 'John', email: 'john@example.com', role: 'user' };
  expect(() => validateUserForm(valid)).not.toThrow();
  
  const invalid = { name: 'J', email: 'invalid', role: 'superuser' };
  expect(() => validateUserForm(invalid)).toThrow();
});
```

### Example 3: E2E Test with Playwright

```typescript
// e2e/user-journey.spec.ts
import { test, expect } from '@playwright/test';

test('user can view and filter persons', async ({ page }) => {
  await page.goto('/');
  
  // Wait for data to load
  await page.waitForSelector('[data-testid="person-card"]');
  
  // Filter by town
  await page.selectOption('select[name="town"]', 'springfield');
  
  // Verify filtered results
  const cards = page.locator('[data-testid="person-card"]');
  await expect(cards).toHaveCount(3);
  
  // Click on a person
  await cards.first().click();
  
  // Verify detail page
  await expect(page).toHaveURL(/\/person\/.+/);
  await expect(page.locator('h1')).toContainText('Person Details');
});
```

## Common Pitfalls and Solutions

### Pitfall 1: Testing Implementation Details
```typescript
// ❌ Bad: Testing state changes
test('sets loading to true', () => {
  // Tests internal state

// ✅ Good: Testing user experience
test('shows loading spinner during fetch', () => {
  // Tests what user sees
```

### Pitfall 2: Over-mocking
```typescript
// ❌ Bad: Mocking everything
jest.mock('next/navigation');
jest.mock('next/image');
jest.mock('@/lib/prisma');

// ✅ Good: Mock only what's necessary
// Use real implementations when possible
```

### Pitfall 3: Testing Framework Code
```typescript
// ❌ Bad: Testing Next.js routing
test('navigates to /users', () => {
  // Next.js handles this

// ✅ Good: Testing your business logic
test('generates correct user URL', () => {
  expect(getUserUrl('123')).toBe('/users/123');
```

## Migration Path for Existing Tests

1. **Identify failing server component tests**
   ```bash
   npm run test 2>&1 | grep -E "(FAIL|Error)"
   ```

2. **Extract testable logic**
   - Move data fetching to separate functions
   - Extract calculations and transformations
   - Separate validation logic

3. **Update test strategy**
   - Convert server component tests to logic tests
   - Add E2E tests for critical paths
   - Focus on testing outcomes, not implementation

4. **Progressive enhancement**
   - Start with critical business logic
   - Add integration tests for APIs
   - Implement E2E tests for user journeys

## Tools and Configuration

### Recommended Test Stack
```json
{
  "devDependencies": {
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.2.0",
    "@playwright/test": "^1.41.0",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0"
  }
}
```

### Jest Configuration for Next.js 15
```javascript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/e2e/'],
}

module.exports = createJestConfig(customJestConfig)
```

## Conclusion

Testing Next.js 15 applications requires adapting traditional testing approaches. Focus on:

1. **Extracting and testing business logic**
2. **Testing client components thoroughly**
3. **Using E2E tests for integration confidence**
4. **Accepting that 100% unit test coverage isn't practical**

The goal is confidence in your application's behavior, not arbitrary coverage metrics. Adapt these patterns to your specific needs and constraints.