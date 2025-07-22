#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';

async function testPrismaLogging() {
  console.log('=== Prisma Logging Test ===\n');
  
  console.log('Current settings:');
  console.log(`PRISMA_LOG: ${process.env.PRISMA_LOG || 'false'}`);
  console.log(`PRISMA_LOG_LEVEL: ${process.env.PRISMA_LOG_LEVEL || '1'}`);
  console.log('\n');

  try {
    console.log('1. Testing simple query...');
    const towns = await prisma.town.findMany({
      take: 3,
      select: {
        id: true,
        name: true,
      },
    });
    console.log(`Found ${towns.length} towns\n`);

    console.log('2. Testing query with parameters...');
    const person = await prisma.person.findFirst({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });
    console.log(`Found person: ${person?.firstName || 'None'}\n`);

    console.log('3. Testing count query...');
    const count = await prisma.person.count({
      where: {
        isActive: true,
      },
    });
    console.log(`Active persons: ${count}\n`);

    console.log('4. Testing complex query with joins...');
    const personWithRelations = await prisma.person.findFirst({
      where: {
        isActive: true,
      },
      include: {
        town: true,
        comments: {
          take: 2,
        },
      },
    });
    console.log(`Person with relations: ${personWithRelations?.firstName || 'None'}\n`);

    console.log('5. Testing raw query...');
    const rawResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM Person WHERE isActive = 1`;
    console.log(`Raw query result: ${JSON.stringify(rawResult)}\n`);

  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n=== Test Complete ===');
  console.log('\nTo see different logging levels, run:');
  console.log('PRISMA_LOG=true PRISMA_LOG_LEVEL=1 npm run test:prisma-log  # Minimal');
  console.log('PRISMA_LOG=true PRISMA_LOG_LEVEL=2 npm run test:prisma-log  # Basic');
  console.log('PRISMA_LOG=true PRISMA_LOG_LEVEL=3 npm run test:prisma-log  # Detailed');
  console.log('PRISMA_LOG=true PRISMA_LOG_LEVEL=4 npm run test:prisma-log  # Verbose');
  console.log('PRISMA_LOG=true PRISMA_LOG_LEVEL=5 npm run test:prisma-log  # Debug');
}

testPrismaLogging();