# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Bring Me Home" is a Next.js 15 application that helps families connect with missing persons in detention centers. It features multi-tenant support for different towns, role-based access control, and community engagement through comments and support messages.

## Essential Commands

Always run "npm run build" after make any changes and verify that there are no errors or warnings in the console.

### Development
```bash
npm run dev              # Start development server with Turbopack
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint
npm run typecheck        # TypeScript type checking
```

### Database Management
```bash
npm run db:generate      # Generate Prisma client after schema changes
npm run db:push          # Push schema changes to database (dev)
npm run db:migrate       # Create and apply migrations (production)
npm run db:seed          # Seed database with sample data
npm run db:reset         # Reset database and reseed
npm run db:deploy        # Deploy migrations to production
```

### Testing
```bash
npm run test             # Run all tests
npm run test:watch       # Watch mode for development
npm run test:unit        # Unit tests only
npm run test:coverage    # Generate coverage report
npm run test:persons     # Test person form components specifically
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Database**: MySQL with Prisma ORM
- **Auth**: NextAuth.js with JWT
- **Storage**: Flexible image storage (database or S3)
- **CDN**: CloudFront integration for images
- **Styling**: TailwindCSS v4

### Key Architectural Patterns

1. **Role-Based Access Control**
   - Site Admin: Full system access
   - Town Admin: Manage specific towns
   - Person Admin: Manage specific persons
   - Viewer: Basic access
   - Permissions checked in middleware and server actions

2. **Image Storage System**
   - Abstracted storage with adapters for database and S3
   - CloudFront CDN integration for performance
   - Automatic URL generation based on environment
   - Image optimization with Sharp

3. **Multi-Language Support**
   - Story model for multilingual content
   - Person profiles support multiple language versions

4. **Privacy Controls**
   - FamilyPrivacySettings model controls information visibility
   - Granular control over what information is public
   - Site-wide protection mode with password

### Critical Files and Patterns

**Authentication & Permissions**
- `/src/middleware.ts` - Route protection and auth checks
- `/src/lib/auth-config.ts` - NextAuth configuration
- `/src/lib/permissions.ts` - Permission checking utilities
- `/src/lib/auth-helpers.ts` - Session and user helpers

**Image System**
- `/src/lib/image-storage/` - Storage adapters
- `/src/lib/image-url.ts` - CDN-aware URL generation
- `/src/hooks/useImageUrl.ts` - React hook for images

**Database Schema**
- Core entities: User, Town, Person, Comment, AnonymousSupport
- Access control: Role, UserRoles, TownAccess, PersonAccess
- Customization: Layout, Theme, SystemConfig

**Server Actions**
- `/src/app/actions/` - All server-side mutations
- Always validate permissions before operations
- Return consistent success/error responses

### Environment Configuration

Critical environment variables:
```
DATABASE_URL             # MySQL connection
NEXTAUTH_SECRET          # Auth secret
NEXT_PUBLIC_CLOUDFRONT_CDN_URL  # CDN for images
AWS_S3_BUCKET_NAME       # S3 storage (optional)
REDIS_CONNECTION_STRING  # Cache (optional)
```

### Development Guidelines

1. **Component Organization**
   - Use 'use client' only when necessary
   - Prefer server components for data fetching
   - Extract business logic for testability

2. **Image Handling**
   - Always use generateImageUrlWithCdn for URLs
   - Check isAdminRoute to bypass CDN in admin
   - Handle both database and S3 storage

3. **Permission Checks**
   - Always validate in server actions
   - Use checkPermission utilities
   - Log permission failures for audit

4. **Cookie Management**
   - Use native browser cookies (/src/lib/cookies.ts)
   - No external cookie libraries needed
   - Handle SSR with typeof document checks

### Common Tasks

**Adding a New Admin Page**
1. Create route in `/src/app/admin/`
2. Add permission check in server component
3. Update navigation if needed
4. Follow existing admin component patterns

**Modifying Database Schema**
1. Update `/prisma/schema.prisma`
2. Run `npm run db:generate`
3. Run `npm run db:push` (dev) or create migration
4. Update relevant server actions

**Working with Images**
1. Use ImageUpload component for uploads
2. Storage adapter handles S3/database logic
3. Always generate URLs with CDN helper
4. Respect admin route CDN bypass

### Recent Changes

- Implemented anonymous support system with cookie tracking
- Added CloudFront CDN integration for all public images
- Created native cookie utilities to replace cookies-next
- Updated "Leave a Message" flow to skip intermediate steps