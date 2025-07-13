#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function verifyUserPassword(username: string, testPassword: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        password: true,
        isActive: true,
        updatedAt: true
      }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('\nUser details:');
    console.log('- ID:', user.id);
    console.log('- Username:', user.username);
    console.log('- Is Active:', user.isActive);
    console.log('- Updated At:', user.updatedAt);
    console.log('- Password hash length:', user.password.length);
    console.log('- Password hash prefix:', user.password.substring(0, 7));

    console.log('\nTesting password variations:');

    // Test exact password
    const match1 = await bcrypt.compare(testPassword, user.password);
    console.log(`1. Exact password "${testPassword}":`, match1 ? '✅ MATCH' : '❌ NO MATCH');

    // Test trimmed
    const trimmed = testPassword.trim();
    const match2 = await bcrypt.compare(trimmed, user.password);
    console.log(`2. Trimmed password "${trimmed}":`, match2 ? '✅ MATCH' : '❌ NO MATCH');

    // Test with spaces
    const withTrailingSpace = testPassword + ' ';
    const match3 = await bcrypt.compare(withTrailingSpace, user.password);
    console.log(`3. With trailing space "${withTrailingSpace}":`, match3 ? '✅ MATCH' : '❌ NO MATCH');

    // Test creating a new hash and comparing
    console.log('\nCreating new hash for comparison:');
    const newHash = await bcrypt.hash(testPassword, 12);
    const newHashMatch = await bcrypt.compare(testPassword, newHash);
    console.log('- New hash matches password:', newHashMatch ? '✅ YES' : '❌ NO');
    console.log('- New hash prefix:', newHash.substring(0, 7));

    // Compare the stored hash format
    const storedHashFormat = user.password.match(/^\$2[aby]\$\d+\$/);
    const newHashFormat = newHash.match(/^\$2[aby]\$\d+\$/);
    console.log('- Stored hash format:', storedHashFormat ? storedHashFormat[0] : 'Unknown');
    console.log('- New hash format:', newHashFormat ? newHashFormat[0] : 'Unknown');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get command line arguments
const username = process.argv[2] || 'chema';
const password = process.argv[3] || 'Wj72n8Tz4H1';

verifyUserPassword(username, password);