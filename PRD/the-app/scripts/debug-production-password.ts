#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { resetUserPassword } from '../src/app/actions/users';

const prisma = new PrismaClient();

async function debugProductionPassword() {
  const username = process.argv[2] || 'chema';
  const testPassword = process.argv[3] || 'Wj72n8Tz4H1';
  
  console.log('\n=== Production Password Debug ===');
  console.log('Username:', username);
  console.log('Test Password:', testPassword);
  console.log('Password Length:', testPassword.length);
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
    console.log('- Current hash length:', user.password.length);
    
    // 2. Test current password
    console.log('\n--- Testing Current Password ---');
    const currentMatch = await bcrypt.compare(testPassword, user.password);
    console.log('Current password matches:', currentMatch ? '✅ YES' : '❌ NO');
    
    // 3. Test bcrypt functionality
    console.log('\n--- Testing Bcrypt ---');
    const testHash = await bcrypt.hash(testPassword, 12);
    const testVerify = await bcrypt.compare(testPassword, testHash);
    console.log('Bcrypt test:', testVerify ? '✅ PASS' : '❌ FAIL');
    console.log('Test hash length:', testHash.length);
    
    // 4. Test the server action directly
    console.log('\n--- Testing Server Action ---');
    console.log('Calling resetUserPassword with:', {
      userId: user.id,
      passwordLength: testPassword.length,
    });
    
    const result = await resetUserPassword(user.id, testPassword);
    console.log('Server action result:', JSON.stringify(result, null, 2));
    
    // 5. Verify the password was updated
    if (result.success) {
      const updatedUser = await prisma.user.findUnique({
        where: { username },
        select: { password: true, updatedAt: true }
      });
      
      const finalCheck = await bcrypt.compare(testPassword, updatedUser!.password);
      console.log('\n--- Verification ---');
      console.log('Password updated:', finalCheck ? '✅ YES' : '❌ NO');
      console.log('New updated time:', updatedUser!.updatedAt);
      
      // 6. Test variations to debug encoding issues
      console.log('\n--- Testing Password Variations ---');
      const variations = [
        { desc: 'Original', pwd: testPassword },
        { desc: 'Trimmed', pwd: testPassword.trim() },
        { desc: 'With space at end', pwd: testPassword + ' ' },
        { desc: 'With space at start', pwd: ' ' + testPassword },
        { desc: 'Lowercase', pwd: testPassword.toLowerCase() },
        { desc: 'Uppercase', pwd: testPassword.toUpperCase() },
      ];
      
      for (const { desc, pwd } of variations) {
        const matches = await bcrypt.compare(pwd, updatedUser!.password);
        console.log(`${desc} (${pwd.length} chars):`, matches ? '✅' : '❌');
      }
    }
    
    // 7. Test character encoding
    console.log('\n--- Character Encoding Test ---');
    for (let i = 0; i < testPassword.length; i++) {
      const char = testPassword[i];
      const code = testPassword.charCodeAt(i);
      console.log(`Position ${i}: '${char}' (code: ${code})`);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

debugProductionPassword();