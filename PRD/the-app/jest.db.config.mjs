// db tests (`*.db.test.ts`): real queries against the local Postgres in LOCAL_POSTGRES_URL, which
// must be `bring_me_home` on localhost (src/test-utils/local-postgres.ts). Run: `npm run test:db`.
// Separate from jest.config.js because that config mocks `@/lib/prisma` for every test
// (jest.setup.js) and runs in jsdom; these run in node, one file at a time, on the one database.
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

export default createJestConfig({
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.db.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  globalSetup: '<rootDir>/src/test-utils/local-postgres.global-setup.ts',
  setupFiles: ['<rootDir>/src/test-utils/local-postgres.setup-env.ts'],
  maxWorkers: 1,
  testTimeout: 30000,
})
