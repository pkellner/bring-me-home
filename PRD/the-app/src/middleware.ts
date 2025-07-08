import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Public routes that don't require authentication
    const publicRoutes = ['/', '/auth/signin', '/auth/register', '/auth/error'];

    // Allow access to public routes
    if (publicRoutes.includes(pathname)) {
      return NextResponse.next();
    }

    // Allow access to town/person public pages (format: /townname/personname)
    const townPersonRegex = /^\/[^\/]+\/[^\/]+\/?$/;
    if (townPersonRegex.test(pathname) && !pathname.startsWith('/admin')) {
      return NextResponse.next();
    }

    // Require authentication for all other routes
    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }

    // Admin routes protection
    if (pathname.startsWith('/admin')) {
      const roles = (token.roles as any[]) || [];
      const hasAdminRole = roles.some(role =>
        ['site-admin', 'town-admin', 'person-admin'].includes(role.name)
      );

      if (!hasAdminRole) {
        return NextResponse.redirect(new URL('/', req.url));
      }

      // Site admin can access everything
      const isSiteAdmin = roles.some(role => role.name === 'site-admin');
      if (isSiteAdmin) {
        return NextResponse.next();
      }

      // Town admin restrictions
      if (
        pathname.startsWith('/admin/users') ||
        pathname.startsWith('/admin/roles') ||
        pathname.startsWith('/admin/system')
      ) {
        const isSiteAdmin = roles.some(role => role.name === 'site-admin');
        if (!isSiteAdmin) {
          return NextResponse.redirect(new URL('/admin', req.url));
        }
      }

      // Person admin can only access persons and comments
      const isPersonAdmin = roles.some(role => role.name === 'person-admin');
      if (
        isPersonAdmin &&
        !pathname.startsWith('/admin/persons') &&
        !pathname.startsWith('/admin/comments') &&
        pathname !== '/admin'
      ) {
        return NextResponse.redirect(new URL('/admin/persons', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;

        // Always allow access to public routes
        const publicRoutes = [
          '/',
          '/auth/signin',
          '/auth/register',
          '/auth/error',
        ];

        if (publicRoutes.includes(pathname)) {
          return true;
        }

        // Allow access to town/person public pages without auth
        const townPersonRegex = /^\/[^\/]+\/[^\/]+\/?$/;
        if (townPersonRegex.test(pathname) && !pathname.startsWith('/admin')) {
          return true;
        }

        // Require token for all other routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
