import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Connection tracking
let activeQueries = 0;
let totalQueries = 0;
const queryStack: { query: string; timestamp: number; duration?: number }[] = [];

// Define logging levels
type LogLevel = '1' | '2' | '3' | '4' | '5';

// Get Prisma log configuration based on environment variables
function getPrismaLogConfig(): (Prisma.LogLevel | Prisma.LogDefinition)[] {
  // Disable all logging during build process
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return ['error'];
  }

  const isPrismaLogEnabled = process.env.PRISMA_LOG === 'true';
  const logLevel = (process.env.PRISMA_LOG_LEVEL || '1') as LogLevel;

  if (!isPrismaLogEnabled) {
    return process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'];
  }

  // Level 1: Basic timing info only
  if (logLevel === '1') {
    return [
      {
        level: 'query',
        emit: 'event',
      } as Prisma.LogDefinition,
      'warn',
      'error',
    ];
  }

  // Level 2: Query count and basic info
  if (logLevel === '2') {
    return [
      {
        level: 'query',
        emit: 'event',
      } as Prisma.LogDefinition,
      {
        level: 'info',
        emit: 'stdout',
      } as Prisma.LogDefinition,
      'warn',
      'error',
    ];
  }

  // Level 3: Include query parameters
  if (logLevel === '3') {
    return ['query', 'info', 'warn', 'error'];
  }

  // Level 4: Full query details
  if (logLevel === '4') {
    return ['query', 'info', 'warn', 'error'];
  }

  // Level 5: Everything including internal Prisma info
  return ['query', 'info', 'warn', 'error'];
}

// Format log output based on level
function formatQueryLog(e: Prisma.QueryEvent, level: LogLevel) {
  const timestamp = new Date().toISOString();
  const duration = `${e.duration}ms`;

  // Level 1: Just timestamp and duration
  if (level === '1') {
    console.log(`[${timestamp}] Query executed in ${duration}`);
    return;
  }

  // Level 2: Add query type
  if (level === '2') {
    const queryType = e.query.split(' ')[0];
    console.log(`[${timestamp}] ${queryType} - ${duration}`);
    return;
  }

  // Level 3: Add target (table)
  if (level === '3') {
    const queryParts = e.query.split(' ');
    const queryType = queryParts[0];
    const target = e.target || 'unknown';
    console.log(`[${timestamp}] ${queryType} on ${target} - ${duration}`);
    if (e.params && e.params !== '[]') {
      console.log(`  Params: ${e.params}`);
    }
    return;
  }

  // Level 4: Show sanitized query
  if (level === '4') {
    console.log(`[${timestamp}] Query - ${duration}`);
    console.log(`  Target: ${e.target || 'unknown'}`);
    console.log(`  Query: ${e.query.substring(0, 200)}${e.query.length > 200 ? '...' : ''}`);
    if (e.params && e.params !== '[]') {
      console.log(`  Params: ${e.params}`);
    }
    return;
  }

  // Level 5: Full details
  console.log(`[${timestamp}] Database Query - ${duration}`);
  console.log(`  Target: ${e.target || 'unknown'}`);
  console.log(`  Full Query: ${e.query}`);
  console.log(`  Parameters: ${e.params}`);
  console.log('---');
}

// Connection monitoring utilities
export function getConnectionStats() {
  return {
    activeQueries,
    totalQueries,
    recentQueries: queryStack.slice(-20), // Last 20 queries
  };
}

// Create PrismaClient with optimized connection pool settings
const createPrismaClient = () => {
  const logConfig = getPrismaLogConfig();
  const isPrismaLogEnabled = process.env.PRISMA_LOG === 'true';
  const logLevel = (process.env.PRISMA_LOG_LEVEL || '1') as LogLevel;

  const client = new PrismaClient({
    log: logConfig,
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Set up event-based logging for levels 1-5 (but not during build)
  if (isPrismaLogEnabled &&
      process.env.NEXT_PHASE !== 'phase-production-build' &&
      logConfig.some(config => typeof config === 'object' && config.emit === 'event')
  ) {
    client.$on('query' as never, (e: Prisma.QueryEvent) => {
      formatQueryLog(e, logLevel);
    });
  }

  // For level 5, also enable additional debugging (but not during build)
  if (isPrismaLogEnabled &&
      logLevel === '5' &&
      process.env.NEXT_PHASE !== 'phase-production-build'
  ) {
    // Additional detailed logging for level 5
    console.log('[PRISMA] Level 5 debugging enabled');
  }

  return client;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
