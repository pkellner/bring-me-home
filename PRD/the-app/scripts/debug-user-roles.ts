#!/usr/bin/env tsx

import { prisma } from '../src/lib/prisma';

async function debugUserRoles(username: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        userRoles: {
          include: {
            role: true
          }
        },
        townAccess: {
          include: {
            town: true
          }
        },
        personAccess: {
          include: {
            person: true
          }
        }
      }
    });

    if (!user) {
      console.log(`User '${username}' not found`);
      return;
    }

    console.log(`\nUser Details:`);
    console.log(`- ID: ${user.id}`);
    console.log(`- Username: ${user.username}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Active: ${user.isActive}`);
    console.log(`- Created: ${user.createdAt}`);
    console.log(`- Last Login: ${user.lastLogin || 'Never'}`);

    console.log(`\nRoles (${user.userRoles.length}):`);
    user.userRoles.forEach(ur => {
      console.log(`- ${ur.role.name} (${ur.role.description || 'No description'})`);
      console.log(`  Permissions: ${ur.role.permissions}`);
    });

    console.log(`\nTown Access (${user.townAccess.length}):`);
    user.townAccess.forEach(ta => {
      console.log(`- ${ta.town.name}, ${ta.town.state} (${ta.accessLevel})`);
    });

    console.log(`\nPerson Access (${user.personAccess.length}):`);
    user.personAccess.forEach(pa => {
      console.log(`- ${pa.person.firstName} ${pa.person.lastName} (${pa.accessLevel})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get username from command line
const username = process.argv[2];
if (!username) {
  console.log('Usage: npx tsx scripts/debug-user-roles.ts <username>');
  process.exit(1);
}

debugUserRoles(username);