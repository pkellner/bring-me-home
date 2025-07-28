import { Session } from 'next-auth';

export interface Permission {
  resource: string;
  actions: string[];
}

export function hasPermission(
  session: Session | null,
  resource: string,
  action: string
): boolean {
  if (!session?.user?.roles) return false;

  return session.user.roles.some(role => {
    // Special handling for wildcard permissions (system override)
    if (role.permissions === '*') {
      return true;
    }
    
    try {
      const permissions = JSON.parse(role.permissions);
      const resourcePermissions = permissions[resource];
      return resourcePermissions && resourcePermissions.includes(action);
    } catch {
      return false;
    }
  });
}

export function hasRole(session: Session | null, roleName: string): boolean {
  if (!session?.user?.roles) return false;

  const hasMatchingRole = session.user.roles.some(role => role.name === roleName);
  return hasMatchingRole;
}

export function isSiteAdmin(session: Session | null): boolean {
  return hasRole(session, 'site-admin');
}

export function isTownAdmin(session: Session | null): boolean {
  return hasRole(session, 'town-admin');
}

export function isPersonAdmin(session: Session | null): boolean {
  return hasRole(session, 'person-admin');
}

export function hasTownAccess(
  session: Session | null,
  townId: string,
  accessLevel: 'read' | 'write' | 'admin' = 'read'
): boolean {
  if (!session?.user) return false;

  // Site admins have access to everything
  if (isSiteAdmin(session)) return true;

  // Check specific town access
  const townAccess = session.user.townAccess?.find(
    access => access.townId === townId
  );

  if (!townAccess) return false;

  // Check access level hierarchy: admin > write > read
  const levels = ['read', 'write', 'admin'];
  const userLevel = levels.indexOf(townAccess.accessLevel);
  const requiredLevel = levels.indexOf(accessLevel);

  return userLevel >= requiredLevel;
}

export function hasPersonAccess(
  session: Session | null,
  personId: string,
  accessLevel: 'read' | 'write' | 'admin' = 'read'
): boolean {
  if (!session?.user) return false;

  // Site admins have access to everything
  if (isSiteAdmin(session)) return true;

  // Check specific person access
  const personAccess = session.user.personAccess?.find(
    access => access.personId === personId
  );

  if (!personAccess) return false;

  // Check access level hierarchy: admin > write > read
  const levels = ['read', 'write', 'admin'];
  const userLevel = levels.indexOf(personAccess.accessLevel);
  const requiredLevel = levels.indexOf(accessLevel);

  return userLevel >= requiredLevel;
}

export function getUserAccessibleTowns(session: Session | null): string[] {
  if (!session?.user) return [];

  // Site admins have access to all towns
  if (isSiteAdmin(session)) return ['*']; // Special marker for all towns

  // Return specific town IDs the user has access to
  return session.user.townAccess?.map(access => access.townId) || [];
}

export function getUserAccessiblePersons(session: Session | null): string[] {
  if (!session?.user) return [];

  // Site admins have access to all persons
  if (isSiteAdmin(session)) return ['*']; // Special marker for all persons

  // Return specific person IDs the user has access to
  return session.user.personAccess?.map(access => access.personId) || [];
}

export function canModerateComments(session: Session | null): boolean {
  return hasPermission(session, 'comments', 'moderate');
}

export function canManageUsers(session: Session | null): boolean {
  return (
    hasPermission(session, 'users', 'create') ||
    hasPermission(session, 'users', 'update') ||
    hasPermission(session, 'users', 'delete')
  );
}

export function canAccessSystemConfig(session: Session | null): boolean {
  return hasPermission(session, 'system', 'config');
}
