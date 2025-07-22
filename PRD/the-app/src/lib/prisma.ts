import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create PrismaClient with optimized connection pool settings
const createPrismaClient = () => {
  return new PrismaClient({
    // Add query logging in development for debugging
    log: process.env.NODE_ENV === 'development' 
      ? ['warn', 'error'] 
      : ['error'],
    
    // Database connection configuration
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
