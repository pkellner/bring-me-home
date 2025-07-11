import { hasPermission, hasRole } from '../permissions';

describe('Permissions', () => {
  const mockSession = {
    user: {
      id: '1',
      username: 'testuser',
      roles: [
        {
          id: '1',
          name: 'admin',
          permissions: JSON.stringify({
            users: ['create', 'read', 'update', 'delete'],
            towns: ['read']
          })
        }
      ]
    }
  };

  describe('hasPermission', () => {
    it('should return true for granted permission', () => {
      expect(hasPermission(mockSession, 'users', 'read')).toBe(true);
    });

    it('should return false for denied permission', () => {
      expect(hasPermission(mockSession, 'users', 'special')).toBe(false);
    });

    it('should handle null session', () => {
      expect(hasPermission(null, 'users', 'read')).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should return true for existing role', () => {
      expect(hasRole(mockSession, 'admin')).toBe(true);
    });

    it('should return false for non-existing role', () => {
      expect(hasRole(mockSession, 'superadmin')).toBe(false);
    });

    it('should handle null session', () => {
      expect(hasRole(null, 'admin')).toBe(false);
    });
  });
});