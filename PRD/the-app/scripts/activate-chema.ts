#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function activateChema() {
  try {
    const user = await prisma.user.update({
      where: { username: 'chema' },
      data: { isActive: true }
    });
    
    console.log('✅ User "chema" has been activated!');
    console.log('- ID:', user.id);
    console.log('- Username:', user.username);
    console.log('- Active:', user.isActive);
    console.log('- Updated:', user.updatedAt);
    
  } catch (error) {
    console.error('❌ Error activating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

activateChema();