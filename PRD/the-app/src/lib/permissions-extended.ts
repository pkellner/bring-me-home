import { hasPermission as baseHasPermission, hasRole as baseHasRole } from './permissions';
import { getCurrentUser } from './auth-helpers';
import { Session } from 'next-auth';

// Extended permission check that includes system override
export async function hasPermissionExtended(
  resource: string,
  action: string
): Promise<boolean> {
  const user = await getCurrentUser();
  
  // System override has all permissions
  if (user && 'isSystemOverride' in user && user.isSystemOverride) {
    return true;
  }
  
  // Create a session-like object for regular permission check
  if (user && 'roles' in user) {
    const session = { user } as Session;
    return baseHasPermission(session, resource, action);
  }
  
  return false;
}

// Extended role check that includes system override
export async function hasRoleExtended(roleName: string): Promise<boolean> {
  const user = await getCurrentUser();
  
  // System override has all roles
  if (user && 'isSystemOverride' in user && user.isSystemOverride) {
    return true;
  }
  
  // Regular role check
  if (user && 'roles' in user) {
    const session = { user } as Session;
    return baseHasRole(session, roleName);
  }
  
  return false;
}