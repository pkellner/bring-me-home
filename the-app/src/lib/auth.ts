import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';
import { LoginSchema } from '@/lib/validations/schemas';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        // Check for system override credentials first
        if (
          process.env.SYSTEM_USERNAME_OVERRIDE &&
          process.env.SYSTEM_PASSWORD_OVERRIDE &&
          credentials?.username === process.env.SYSTEM_USERNAME_OVERRIDE &&
          credentials?.password === process.env.SYSTEM_PASSWORD_OVERRIDE
        ) {
          return {
            id: 'system-override',
            username: 'System Administrator',
            email: 'admin@system',
            role: 'site_admin'
          };
        }

        // Validate input
        const validatedFields = LoginSchema.safeParse(credentials);
        if (!validatedFields.success) {
          return null;
        }

        const { username, password } = validatedFields.data;

        // Find user in database
        const user = await prisma.user.findUnique({
          where: { username },
          include: {
            userRoles: {
              include: {
                role: true
              }
            }
          }
        });

        if (!user || !user.isActive) {
          return null;
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
          return null;
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() }
        });

        // Get primary role (first role)
        const primaryRole = user.userRoles[0]?.role.name || 'viewer';

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          role: primaryRole
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  }
};

// Extend the default session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      email?: string | null;
      role: string;
    }
  }
  
  interface User {
    id: string;
    username: string;
    email?: string | null;
    role: string;
  }
}