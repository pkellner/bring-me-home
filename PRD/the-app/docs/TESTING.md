# Testing Guide

This project uses a comprehensive testing strategy with Jest, React Testing Library, and Playwright.

## Test Scripts

### Basic Test Commands

- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode (great for development)
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:ci` - Run tests in CI mode with coverage and limited workers

### Targeted Test Commands

- `npm run test:unit` - Run unit tests only
- `npm run test:integration` - Run integration tests only
- `npm run test:e2e` - Run end-to-end tests with Playwright
- `npm run test:pages` - Run tests for Next.js pages only
- `npm run test:api` - Run tests for API routes only
- `npm run test:admin` - Run tests for admin sections
- `npm run test:components` - Run tests for components

### Advanced Test Commands

- `npm run test:verbose` - Run tests with detailed output
- `npm run test:debug` - Run tests with Node debugger attached
- `npm run test:changed` - Run tests related to changed files only (requires git)
- `npm run test:related <file>` - Run tests related to specific files
- `npm run test:updateSnapshot` - Update Jest snapshots
- `npm run test:clearCache` - Clear Jest cache
- `npm run test:silent` - Run tests without console output
- `npm run test:bail` - Stop after first test failure
- `npm run test:report` - Generate and open coverage report in browser

### Validation Commands

- `npm run test:validate` - Run linting and all tests (good for pre-commit)
- `npm run test:pre-commit` - Lint and test changed files
- `npm run test:pre-push` - Full validation suite

## Test Structure

```
src/
├── app/
│   ├── __tests__/          # Page component tests
│   ├── page.test.tsx       # Alternative test location
│   └── api/
│       └── route.test.ts   # API route tests
├── components/
│   └── __tests__/          # Component tests
├── lib/
│   └── __tests__/          # Utility function tests
├── test-utils/             # Test utilities and helpers
│   ├── render.tsx          # Custom render with providers
│   └── db.ts               # Database mocks
e2e/
└── tests/                  # Playwright E2E tests
```

## Writing Tests

### Page Component Test Example

```typescript
import { render, screen } from '@testing-library/react'
import HomePage from '../page'

describe('HomePage', () => {
  it('renders without crashing', () => {
    render(<HomePage />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})
```

### API Route Test Example

```typescript
import { GET } from '../route'
import { NextRequest } from 'next/server'

describe('API Route', () => {
  it('handles GET request', async () => {
    const request = new NextRequest('http://localhost/api/test')
    const response = await GET(request)
    expect(response.status).toBe(200)
  })
})
```

### Using Custom Test Utils

```typescript
import { render, createMockSession } from '@/test-utils/render'
import AdminPage from '../page'

describe('AdminPage', () => {
  it('renders for admin user', () => {
    const session = createMockSession({
      user: {
        roles: [{ id: '1', name: 'admin', permissions: '{}' }]
      }
    })
    
    render(<AdminPage />, { session })
    expect(screen.getByText(/admin dashboard/i)).toBeInTheDocument()
  })
})
```

## Coverage Requirements

The project maintains the following coverage thresholds:
- Branches: 60%
- Functions: 60%
- Lines: 60%
- Statements: 60%

## E2E Testing

E2E tests use Playwright and run against multiple browsers:
- Chromium
- Firefox
- WebKit
- Mobile Chrome
- Mobile Safari

Run E2E tests with: `npm run test:e2e`

## CI/CD Integration

Tests output in multiple formats for CI/CD:
- JUnit XML for test results
- LCOV for coverage reports
- HTML reports for human review

## Best Practices

1. **Keep tests fast** - Mock external dependencies
2. **Test behavior, not implementation** - Focus on user interactions
3. **Use descriptive test names** - Should read like documentation
4. **Follow AAA pattern** - Arrange, Act, Assert
5. **One assertion per test** - When possible
6. **Use data-testid sparingly** - Prefer accessible queries
7. **Mock at the boundary** - Mock external services, not internal modules

## Debugging Tests

1. Use `npm run test:debug` to attach debugger
2. Add `console.log` statements (removed by `test:silent`)
3. Use `screen.debug()` to see rendered output
4. Run single test file: `npm test path/to/test.tsx`
5. Run single test: `npm test -- -t "test name"`

## Performance Tips

- Run tests in parallel (default)
- Use `test:bail` for quick failure feedback
- Use `test:changed` during development
- Clear cache if tests behave unexpectedly