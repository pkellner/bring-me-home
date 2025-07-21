import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { serializePrismaObject } from './serialize-prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        // Check for system override credentials first
        const systemUsername = process.env.SYSTEM_OVERRIDE_USERNAME;
        const systemPassword = process.env.SYSTEM_OVERRIDE_PASSWORD;
        
        if (systemUsername && systemPassword && systemUsername.length > 0 && systemPassword.length > 0) {
          if (credentials.username === systemUsername && credentials.password === systemPassword) {
            // Return a special superadmin user object
            return {
              id: 'system-override',
              username: 'superadmin',
              email: 'superadmin@system.local',
              firstName: 'System',
              lastName: 'Administrator',
              roles: [{
                id: 'system-override-role',
                name: 'site-admin',
                description: 'System Override Administrator',
                permissions: '*'
              }],
              townAccess: [],
              personAccess: [],
            };
          }
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
            townAccess: {
              include: {
                town: true,
              },
            },
            personAccess: {
              include: {
                person: true,
              },
            },
          },
        });

        console.log('Auth debug:');
        console.log('- Username:', credentials.username);
        console.log('- User found:', !!user);
        console.log('- User ID:', user?.id);
        console.log('- User email:', user?.email);

        if (!user) {
          console.log('- Auth failed: User not found');
          return null;
        }
        
        if (!user.isActive) {
          console.log('- Auth failed: User inactive');
          throw new Error('Account is inactive (contact customer service)');
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );
        
        console.log('- Password hash starts with:', user.password.substring(0, 10));
        console.log('- Password match:', passwordMatch);
        
        if (!passwordMatch) {
          console.log('- Auth failed: Password mismatch');
          return null;
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          roles: user.userRoles.map(ur => ({
            ...ur.role,
            description: ur.role.description || undefined,
          })),
          townAccess: serializePrismaObject(user.townAccess),
          personAccess: serializePrismaObject(user.personAccess),
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    callbackUrl: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Secure-next-auth.callback-url'
          : 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Host-next-auth.csrf-token'
          : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  useSecureCookies: process.env.NODE_ENV === 'production',
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.roles = user.roles;
        token.townAccess = user.townAccess;
        token.personAccess = user.personAccess;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.roles = token.roles as Array<{
          id: string;
          name: string;
          description?: string;
          permissions: string;
        }>;
        session.user.townAccess = token.townAccess as Array<{
          id: string;
          townId: string;
          accessLevel: string;
          town: {
            id: string;
            name: string;
            state: string;
          };
        }>;
        session.user.personAccess = token.personAccess as Array<{
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
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Handle signout redirect - always go to home
      if (url === '/auth/signout' || url.includes('signout')) {
        return baseUrl;
      }
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
