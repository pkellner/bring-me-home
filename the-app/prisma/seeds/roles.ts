import { PrismaClient, Role } from '@prisma/client';

export async function seedRoles(prisma: PrismaClient): Promise<Role[]> {
  const roles = [
    {
      name: 'site_admin',
      description: 'Full system access',
      permissions: JSON.stringify({
        all: true,
        system: ['*'],
        town: ['*'],
        person: ['*'],
        user: ['*'],
        comment: ['*'],
        theme: ['*'],
        layout: ['*'],
        detentionCenter: ['*']
      })
    },
    {
      name: 'town_admin',
      description: 'Full access to assigned towns',
      permissions: JSON.stringify({
        town: ['read', 'write', 'delete'],
        person: ['read', 'write', 'delete'],
        comment: ['read', 'write', 'delete', 'approve'],
        theme: ['read', 'write'],
        layout: ['read'],
        detentionCenter: ['read']
      })
    },
    {
      name: 'person_admin',
      description: 'Full access to assigned persons',
      permissions: JSON.stringify({
        person: ['read', 'write'],
        comment: ['read', 'write', 'approve'],
        theme: ['read'],
        layout: ['read'],
        detentionCenter: ['read']
      })
    },
    {
      name: 'viewer',
      description: 'Read-only access',
      permissions: JSON.stringify({
        town: ['read'],
        person: ['read'],
        comment: ['read'],
        theme: ['read'],
        layout: ['read'],
        detentionCenter: ['read']
      })
    }
  ];

  const createdRoles: Role[] = [];
  
  for (const role of roles) {
    const created = await prisma.role.create({
      data: role
    });
    createdRoles.push(created);
    console.log(`  ✓ Created role: ${created.name}`);
  }

  return createdRoles;
}