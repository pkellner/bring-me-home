import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { checkSystemOverride } from './auth-protection';
import { headers } from 'next/headers';

export interface SystemOverrideUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isSystemOverride: true;
  roles: Array<{
    id: string;
    name: string;
    permissions: string;
  }>;
}

// Check if current request has system override
export async function hasSystemOverrideAccess(): Promise<boolean> {
  const headersList = await headers();
  return (
    headersList.get('x-system-override') === 'true' ||
    (await checkSystemOverride())
  );
}

// Get current user with system override check
export async function getCurrentUser() {
  // Check for system override first
  if (await hasSystemOverrideAccess()) {
    // Return a system override user with full admin permissions
    const systemOverrideUser: SystemOverrideUser = {
      id: 'system-override',
      username: 'System Override',
      email: 'system@override.local',
      firstName: 'System',
      lastName: 'Override',
      isSystemOverride: true,
      roles: [
        {
          id: 'system-override-role',
          name: 'site-admin',
          permissions: JSON.stringify({
            users: ['create', 'read', 'update', 'delete'],
            roles: ['create', 'read', 'update', 'delete'],
            towns: ['create', 'read', 'update', 'delete'],
            persons: ['create', 'read', 'update', 'delete'],
            detentionCenters: ['create', 'read', 'update', 'delete'],
            comments: ['create', 'read', 'update', 'delete', 'moderate'],
            system: ['config', 'audit', 'backup'],
          }),
        },
      ],
    };
    return systemOverrideUser;
  }

  // Otherwise, get normal session
  const session = await getServerSession(authOptions);
  return session?.user || null;
}
