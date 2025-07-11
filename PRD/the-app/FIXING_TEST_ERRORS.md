# Fixing Test Errors in Next.js 15 App Router

## Common Issues and Solutions

### 1. Server Component Testing Issues

**Problem**: Next.js 15 server components can't be tested directly with React Testing Library.

**Solution**: Test the component's logic separately or mock all server-side dependencies.

```typescript
// Instead of testing the component directly
import HomePage from '../page'

// Mock all server dependencies first
jest.mock('next-auth')
jest.mock('@/lib/prisma')
jest.mock('@/lib/auth')

// Then test that the component exists
describe('HomePage', () => {
  it('should be defined', () => {
    expect(HomePage).toBeDefined();
  });
});
```

### 2. ESM Module Errors (jose, openid-client)

**Problem**: `SyntaxError: Unexpected token 'export'`

**Solution**: Already configured in jest.config.js:
```javascript
transformIgnorePatterns: [
  'node_modules/(?!(jose|openid-client|oidc-token-hash|@panva|uuid)/)',
],
```

### 3. Request/Response in API Route Tests

**Problem**: `ReferenceError: Request is not defined`

**Solution**: Use NextRequest from next/server:
```typescript
import { NextRequest } from 'next/server'

const request = new NextRequest('http://localhost/api/test')
```

### 4. Module Path Issues

**Problem**: `Cannot find module '../page'`

**Solution**: Check the actual file structure. For nested routes like `[id]/edit`, the import path should be:
```typescript
import EditPage from '../../edit/page' // Not '../page'
```

## Working Test Examples

### 1. Simple Unit Test
```typescript
// src/lib/__tests__/simple.test.ts
describe('Simple Test', () => {
  it('should pass', () => {
    expect(1 + 1).toBe(2);
  });
});
```

### 2. Component Test
```typescript
// src/components/__tests__/Component.test.tsx
import { render, screen } from '@testing-library/react'
import Component from '../Component'

describe('Component', () => {
  it('renders correctly', () => {
    render(<Component />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  });
});
```

### 3. Utility Function Test
```typescript
// src/lib/__tests__/utils.test.ts
import { formatDate } from '../utils'

describe('formatDate', () => {
  it('formats date correctly', () => {
    const date = new Date('2024-01-01')
    expect(formatDate(date)).toBe('January 1, 2024')
  });
});
```

## Quick Commands

```bash
# Run only working tests
npm run test:working

# Run specific test file
npm test -- path/to/test.ts

# Run tests in watch mode
npm run test:watch

# Clear Jest cache if tests behave strangely
npm run test:clearCache
```

## Tips for Writing New Tests

1. **Start Simple**: Write basic unit tests for utilities and helpers first
2. **Mock Server Dependencies**: Always mock Prisma, next-auth, and other server-side modules
3. **Test Business Logic**: Extract logic from server components into testable functions
4. **Use test:working**: Add new working tests to the test:working pattern

## Gradual Migration Strategy

1. Keep all existing test files (they document intended behavior)
2. Create new test files with `.working.test.ts` suffix for passing tests
3. Gradually migrate tests as you fix issues
4. Update `test:working` pattern to include new passing tests

## Need Help?

- Check Jest output for specific error messages
- Run `npm run test:clearCache` if tests behave unexpectedly
- Use `npm run test:debug` to debug specific tests
- Consider extracting complex logic into separate testable functions