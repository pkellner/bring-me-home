#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';

async function checkAdminUsers() {
  const admins = await prisma.user.findMany({
    where: {
      userRoles: {
        some: {
          role: {
            name: {
              in: ['site-admin', 'town-admin', 'person-admin']
            }
          }
        }
      }
    },
    include: {
      userRoles: {
        include: {
          role: true
        }
      }
    }
  });
  
  console.log('Admin users:');
  admins.forEach(admin => {
    console.log(`- ${admin.username} (${admin.email}): ${admin.userRoles.map(ur => ur.role.name).join(', ')}`);
  });
  
  await prisma.$disconnect();
}

checkAdminUsers();