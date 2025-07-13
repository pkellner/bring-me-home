#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function findPassword(username: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, password: true }
    });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log(`Testing passwords for user: ${username}`);
    
    // Common test passwords
    const testPasswords = [
      'Wj72n8Tz4H1',
      'Wj72n8Tz4H',
      'Wj5Bn8Tz4H',
      'password',
      'password123',
      'admin123',
      'demo123',
      'Qm3Xr7Np9K', // admin seed password
      'Wj5Bn8Tz4H', // demo seed password  
      'Pv7Kx3Nm6R', // town admin seed password
      'Zn9Hb4Vx7T', // person admin seed password
      '', // empty string
      ' ', // space
    ];
    
    for (const testPwd of testPasswords) {
      const match = await bcrypt.compare(testPwd, user.password);
      if (match) {
        console.log(`✅ FOUND MATCH: "${testPwd}"`);
        return;
      } else {
        console.log(`❌ Not: "${testPwd}"`);
      }
    }
    
    console.log('\nNo match found in common passwords');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const username = process.argv[2] || 'chema';
findPassword(username);