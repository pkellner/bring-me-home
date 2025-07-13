#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function manualResetPassword(username: string, newPassword: string) {
  try {
    console.log(`Manually resetting password for user: ${username}`);
    console.log(`New password: "${newPassword}"`);
    console.log(`Password length: ${newPassword.length}`);
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true }
    });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    console.log('Generated hash:', hashedPassword);
    console.log('Hash length:', hashedPassword.length);
    
    // Verify hash immediately
    const verifyHash = await bcrypt.compare(newPassword, hashedPassword);
    console.log('Hash verification:', verifyHash ? '✅ PASS' : '❌ FAIL');
    
    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });
    
    console.log('Password updated in database');
    
    // Verify by reading back
    const updatedUser = await prisma.user.findUnique({
      where: { username },
      select: { password: true }
    });
    
    const finalVerify = await bcrypt.compare(newPassword, updatedUser!.password);
    console.log('Final verification:', finalVerify ? '✅ PASS' : '❌ FAIL');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const username = process.argv[2] || 'chema';
const password = process.argv[3] || 'TestPass123';

manualResetPassword(username, password);