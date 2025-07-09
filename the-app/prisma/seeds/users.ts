import { PrismaClient, User, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

export async function seedUsers(prisma: PrismaClient, roles: Role[]): Promise<User[]> {
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const siteAdminRole = roles.find(r => r.name === 'site_admin')!;
  const townAdminRole = roles.find(r => r.name === 'town_admin')!;
  const personAdminRole = roles.find(r => r.name === 'person_admin')!;
  const viewerRole = roles.find(r => r.name === 'viewer')!;

  const usersData = [
    {
      username: 'admin',
      email: 'admin@bringthemhome.org',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      imageUploadMaxSizeMB: 20,  // Admin gets higher limits
      imageStorageMaxSizeKB: 500,
      roleId: siteAdminRole.id
    },
    {
      username: 'town_admin_sd',
      email: 'townadmin.sd@bringthemhome.org',
      password: hashedPassword,
      firstName: 'San Diego',
      lastName: 'Admin',
      roleId: townAdminRole.id
    },
    {
      username: 'town_admin_la',
      email: 'townadmin.la@bringthemhome.org',
      password: hashedPassword,
      firstName: 'Los Angeles',
      lastName: 'Admin',
      roleId: townAdminRole.id
    },
    {
      username: 'person_admin1',
      email: 'personadmin1@bringthemhome.org',
      password: hashedPassword,
      firstName: 'Maria',
      lastName: 'Gonzalez',
      roleId: personAdminRole.id
    },
    {
      username: 'viewer1',
      email: 'viewer1@bringthemhome.org',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Viewer',
      imageUploadMaxSizeMB: 5,  // Viewer gets lower limits
      imageStorageMaxSizeKB: 100,
      roleId: viewerRole.id
    }
  ];

  const createdUsers: User[] = [];

  for (const userData of usersData) {
    const { roleId, ...userInfo } = userData;
    
    const user = await prisma.user.create({
      data: {
        ...userInfo,
        userRoles: {
          create: {
            roleId: roleId
          }
        }
      }
    });
    
    createdUsers.push(user);
    console.log(`  ✓ Created user: ${user.username}`);
  }

  return createdUsers;
}