#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function checkProductionEnvironment() {
  console.log('\n=== Production Environment Check ===');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL || 'Not set');
  console.log('NEXTAUTH_SECRET exists:', !!process.env.NEXTAUTH_SECRET);
  
  // Test database connection
  try {
    const userCount = await prisma.user.count();
    console.log(`\n✅ Database connection successful. Found ${userCount} users.`);
  } catch (error) {
    console.error('\n❌ Database connection failed:', error);
    return;
  }
  
  // Test bcrypt with known values
  console.log('\n--- Testing Bcrypt ---');
  const knownPasswords = [
    { plain: 'password123', hash: '$2a$12$vIKJVqkRM7w8hNxd6kF5XeGQm3LFqWTYmWyG0QlNFB8YQ5TjXGSs.' },
    { plain: 'admin123', hash: '$2a$12$g/PNhzJgX7YJKLsZJCqW/uL7xxAO7OxpQIvwIqJT.xOcZWNXqg9Hy' },
  ];
  
  for (const { plain, hash } of knownPasswords) {
    try {
      const matches = await bcrypt.compare(plain, hash);
      console.log(`Test "${plain}":`, matches ? '✅ PASS' : '❌ FAIL');
    } catch (error) {
      console.error(`Test "${plain}" error:`, error);
    }
  }
  
  // Test creating and verifying a new hash
  console.log('\n--- Testing New Hash Creation ---');
  const testPassword = 'Wj72n8Tz4H1';
  const rounds = 12;
  
  try {
    const hash1 = await bcrypt.hash(testPassword, rounds);
    const hash2 = await bcrypt.hash(testPassword, rounds);
    const verify1 = await bcrypt.compare(testPassword, hash1);
    const verify2 = await bcrypt.compare(testPassword, hash2);
    
    console.log('Hash 1 length:', hash1.length);
    console.log('Hash 2 length:', hash2.length);
    console.log('Verify hash 1:', verify1 ? '✅ PASS' : '❌ FAIL');
    console.log('Verify hash 2:', verify2 ? '✅ PASS' : '❌ FAIL');
    console.log('Hashes are different:', hash1 !== hash2 ? '✅ CORRECT' : '❌ ERROR');
  } catch (error) {
    console.error('Hash creation error:', error);
  }
  
  // Check for common production issues
  console.log('\n--- Common Production Issues ---');
  
  // Check if running behind a proxy
  console.log('HTTP_X_FORWARDED_PROTO:', process.env.HTTP_X_FORWARDED_PROTO || 'Not set');
  console.log('HTTP_X_FORWARDED_HOST:', process.env.HTTP_X_FORWARDED_HOST || 'Not set');
  
  // Check memory limits
  const memoryUsage = process.memoryUsage();
  console.log('\nMemory Usage:');
  console.log('- RSS:', (memoryUsage.rss / 1024 / 1024).toFixed(2), 'MB');
  console.log('- Heap Used:', (memoryUsage.heapUsed / 1024 / 1024).toFixed(2), 'MB');
  console.log('- Heap Total:', (memoryUsage.heapTotal / 1024 / 1024).toFixed(2), 'MB');
  
  await prisma.$disconnect();
}

checkProductionEnvironment();