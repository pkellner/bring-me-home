import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT, DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      firstName?: string;
      lastName?: string;
      roles: Array<{
        id: string;
        name: string;
        description?: string;
        permissions: string;
      }>;
      townAccess: Array<{
        id: string;
        townId: string;
        accessLevel: string;
        town: {
          id: string;
          name: string;
          state: string;
        };
      }>;
      personAccess: Array<{
        id: string;
        personId: string;
        accessLevel: string;
        person: {
          id: string;
          firstName: string;
          lastName: string;
        };
      }>;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    roles: Array<{
      id: string;
      name: string;
      description?: string;
      permissions: string;
    }>;
    townAccess: Array<{
      id: string;
      townId: string;
      accessLevel: string;
      town: {
        id: string;
        name: string;
        state: string;
      };
    }>;
    personAccess: Array<{
      id: string;
      personId: string;
      accessLevel: string;
      person: {
        id: string;
        firstName: string;
        lastName: string;
      };
    }>;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    roles: Array<{
      id: string;
      name: string;
      description?: string;
      permissions: string;
    }>;
    townAccess: Array<{
      id: string;
      townId: string;
      accessLevel: string;
      town: {
        id: string;
        name: string;
        state: string;
      };
    }>;
    personAccess: Array<{
      id: string;
      personId: string;
      accessLevel: string;
      person: {
        id: string;
        firstName: string;
        lastName: string;
      };
    }>;
  }
}
