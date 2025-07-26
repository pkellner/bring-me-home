#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';

async function main() {
  try {
    const templates = await prisma.emailTemplate.findMany();
    console.log('Email templates in database:');
    templates.forEach(t => {
      console.log(`- ${t.name} (ID: ${t.id})`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();