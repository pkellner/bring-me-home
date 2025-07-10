import { withAuth } from 'next-auth/middleware';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  checkSiteProtectionFromRequest,
  checkSystemOverrideFromRequest,
} from '@/lib/auth-protection-edge';

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Always allow access to protection pages and their APIs
  const protectionRoutes = [
    '/site-protection',
    '/system-override',
    '/api/site-protection',
    '/api/system-override',
  ];
  if (protectionRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check site protection (9.5.2)
  const isSiteProtected = !checkSiteProtectionFromRequest(request);
  if (isSiteProtected) {
    return NextResponse.redirect(new URL('/site-protection', request.url));
  }

  // For admin routes, check system override (9.5.1)
  if (pathname.startsWith('/admin')) {
    const hasSystemOverride = checkSystemOverrideFromRequest(request);
    if (hasSystemOverride) {
      // User has system override, grant full admin access
      const response = NextResponse.next();
      // Set a flag that can be checked in the app
      response.headers.set('x-system-override', 'true');
      return response;
    }
  }

  // Continue to NextAuth middleware for normal authentication
  const authMiddleware = withAuth(
    function middleware(req) {
      const token = req.nextauth.token;
      const pathname = req.nextUrl.pathname;

      // Enforce HTTPS in production
      if (
        process.env.NODE_ENV === 'production' &&
        req.headers.get('x-forwarded-proto') !== 'https'
      ) {
        return NextResponse.redirect(
          `https://${req.headers.get('host')}${req.nextUrl.pathname}${
            req.nextUrl.search
          }`,
          301
        );
      }

      // Public routes that don't require authentication
      const publicRoutes = [
        '/',
        '/auth/signin',
        '/auth/register',
        '/auth/error',
        '/configs',
      ];

      // Allow access to public routes
      if (publicRoutes.includes(pathname)) {
        return NextResponse.next();
      }

      // Allow access to town pages (format: /townname) and person pages (format: /townname/personname)
      const townRegex = /^\/[^\/]+\/?$/;
      const townPersonRegex = /^\/[^\/]+\/[^\/]+\/?$/;
      if (
        (townRegex.test(pathname) || townPersonRegex.test(pathname)) &&
        !pathname.startsWith('/admin')
      ) {
        return NextResponse.next();
      }

      // Require authentication for all other routes
      if (!token) {
        return NextResponse.redirect(new URL('/auth/signin', req.url));
      }

      // Admin routes protection
      if (pathname.startsWith('/admin')) {
        const roles =
          (token.roles as Array<{
            id: string;
            name: string;
            description?: string;
            permissions: string;
          }>) || [];
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
            '/configs',
          ];

          if (publicRoutes.includes(pathname)) {
            return true;
          }

          // Allow access to town pages and person pages without auth
          const townRegex = /^\/[^\/]+\/?$/;
          const townPersonRegex = /^\/[^\/]+\/[^\/]+\/?$/;
          if (
            (townRegex.test(pathname) || townPersonRegex.test(pathname)) &&
            !pathname.startsWith('/admin')
          ) {
            return true;
          }

          // Require token for all other routes
          return !!token;
        },
      },
    }
  );
  return authMiddleware(request as never, {} as NextFetchEvent);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     * - api/images (image serving routes)
     */
    '/((?!api/auth|api/images|_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
