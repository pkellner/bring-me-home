#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { normalizeUsernameForLookup } from '../src/lib/normalize-identity';

const prisma = new PrismaClient();

async function fixUserStatus() {
  const username = process.argv[2] || 'chema';
  
  console.log('=== Fix User Status ===');
  console.log('Username:', username);
  
  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { username: normalizeUsernameForLookup(username) },
      select: { 
        id: true, 
        username: true, 
        isActive: true,
        updatedAt: true 
      }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('\nCurrent status:');
    console.log('- ID:', user.id);
    console.log('- Username:', user.username);
    console.log('- Active:', user.isActive ? '✅ YES' : '❌ NO');
    console.log('- Last Updated:', user.updatedAt);
    
    if (!user.isActive) {
      console.log('\n🔧 Activating user...');
      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: true }
      });
      console.log('✅ User activated successfully!');
    } else {
      console.log('\n✅ User is already active');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserStatus();