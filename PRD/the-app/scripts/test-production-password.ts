#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function testProductionPassword() {
  const username = process.argv[2] || 'chema';
  const testPassword = process.argv[3] || 'Wj72n8Tz4H1';
  
  console.log('\n=== Production Password Test ===');
  console.log('Username:', username);
  console.log('Test Password:', testPassword);
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Database URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@') || 'Not set');
  
  try {
    // 1. Find the user
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
      console.log('\n❌ User not found');
      return;
    }
    
    console.log('\n✅ User found:');
    console.log('- ID:', user.id);
    console.log('- Username:', user.username);
    console.log('- Active:', user.isActive);
    console.log('- Last Updated:', user.updatedAt);
    
    // 2. Test current password
    console.log('\n--- Testing Current Password ---');
    const currentMatch = await bcrypt.compare(testPassword, user.password);
    console.log('Current password matches:', currentMatch ? '✅ YES' : '❌ NO');
    
    // 3. Create a new hash and test it
    console.log('\n--- Testing New Hash ---');
    const newHash = await bcrypt.hash(testPassword, 12);
    const newHashWorks = await bcrypt.compare(testPassword, newHash);
    console.log('New hash verification:', newHashWorks ? '✅ PASS' : '❌ FAIL');
    
    // 4. Actually reset the password
    if (!currentMatch) {
      console.log('\n--- Resetting Password ---');
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          password: newHash,
          updatedAt: new Date()
        }
      });
      
      // Verify it worked
      const updatedUser = await prisma.user.findUnique({
        where: { username },
        select: { password: true }
      });
      
      const finalCheck = await bcrypt.compare(testPassword, updatedUser!.password);
      console.log('Password reset:', finalCheck ? '✅ SUCCESS' : '❌ FAILED');
      
      if (finalCheck) {
        console.log(`\n✅ Password has been reset to: ${testPassword}`);
        console.log('You should now be able to log in with this password.');
      }
    } else {
      console.log('\n✅ Password is already set correctly');
    }
    
    // 5. Test some variations to debug encoding issues
    console.log('\n--- Testing Password Variations ---');
    const variations = [
      { desc: 'Original', pwd: testPassword },
      { desc: 'Trimmed', pwd: testPassword.trim() },
      { desc: 'With space at end', pwd: testPassword + ' ' },
      { desc: 'With space at start', pwd: ' ' + testPassword },
    ];
    
    for (const { desc, pwd } of variations) {
      const matches = await bcrypt.compare(pwd, user.password);
      console.log(`${desc} (${pwd.length} chars):`, matches ? '✅' : '❌');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testProductionPassword();