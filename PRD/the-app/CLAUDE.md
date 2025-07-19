# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Bring Me Home" is a Next.js 15 application that helps families connect with missing persons in detention centers. It features multi-tenant support for different towns, role-based access control, and community engagement through comments and support messages.

## Essential Commands

Always run `npm run build` after making any changes and verify that there are no errors or warnings in the console.

### Development
```bash
npm run dev              # Start development server with Turbopack (port 3000/3001)
npm run build            # Production build - ALWAYS run before committing
npm run start            # Start production server
npm run lint             # Run ESLint
```

### Database Management
```bash
# Development workflow
npm run db:migrate       # Create new migration after schema changes
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema changes to database (dev only)
npm run db:seed          # Seed database with sample data
npm run db:reset         # Reset database and reseed

# Deployment
npm run db:deploy        # Deploy migrations to production
npm run db:deploy:prod   # Deploy to production
npm run db:deploy:staging # Deploy to staging
npm run db:status:prod   # Check migration status
```

### Testing
```bash
# Basic testing
npm run test             # Run all tests
npm run test:watch       # Watch mode for development
npm run test:coverage    # Generate coverage report
npm run test:ci          # CI mode with coverage

# Test by type
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests
npm run test:e2e         # Playwright end-to-end tests

# Test specific areas
npm run test:persons     # Person form components
npm run test:admin       # Admin components
npm run test:api         # API routes
npm run test:image-storage # Image storage system

# Advanced testing
npm run test:debug       # Debug tests with Node inspector
npm run test:changed     # Test only changed files
npm run test:bail        # Stop on first failure
npm run test:silent      # Suppress console output
```

### Debug Commands
```bash
npm run debug:no-images     # Find persons without images
npm run debug:analyze-images # Analyze person images
npm run debug:check-rendering # Check image rendering
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Database**: MySQL with Prisma ORM
- **Auth**: NextAuth.js with JWT sessions
- **Storage**: Flexible image storage (database or S3)
- **CDN**: CloudFront integration for images
- **Styling**: TailwindCSS v4
- **Testing**: Jest + React Testing Library + Playwright
- **Caching**: Redis (optional)
- **reCAPTCHA**: Google reCAPTCHA v3 for form protection

### Key Architectural Patterns

1. **Role-Based Access Control**
   - Site Admin: Full system access (can edit privacy settings)
   - Town Admin: Manage specific towns (cannot edit privacy settings)
   - Person Admin: Manage specific persons (cannot edit privacy settings)
   - Viewer: Basic access
   - Permissions checked in middleware and server actions
   - Privacy settings (`privacyRequiredDoNotShowPublicly`) only editable by site admins

2. **Image Storage System**
   - Abstracted storage with adapters for database and S3
   - CloudFront CDN integration for performance
   - Automatic URL generation based on environment
   - Image optimization with Sharp (max 10MB upload)
   - Configurable quality/size settings

3. **Multi-Language Support**
   - Story model for multilingual content
   - Person profiles support multiple language versions
   - Support for English/Spanish/other languages

4. **Privacy Controls**
   - FamilyPrivacySettings model controls information visibility
   - Granular control over what information is public
   - Site-wide protection mode with password
   - Anonymous support tracking with cookies
   - Comment privacy settings:
     - `privacyRequiredDoNotShowPublicly`: Hides commenter name completely
     - `displayNameOnly`: Shows only name, hides other details
     - `showComment`, `showOccupation`, `showBirthdate`, `showCityState`: Granular display controls
     - When privacy is required, all display options are automatically disabled
   - Private notes to family shown in admin grid with blue text

### Critical Files and Patterns

**Authentication & Permissions**
- `/src/middleware.ts` - Route protection and auth checks (excludes /api/ routes)
- `/src/lib/auth-config.ts` - NextAuth configuration
- `/src/lib/permissions.ts` - Permission checking utilities
- `/src/lib/auth-helpers.ts` - Session and user helpers
- `/src/lib/auth-protection-edge.ts` - Site protection utilities

**Comment System**
- `/src/components/admin/CommentModerationModal.tsx` - Privacy controls and moderation UI
- `/src/app/admin/comments/CommentsGrid.tsx` - Comment display with private note support
- `/src/app/actions/comments.ts` - Server actions with privacy field handling
- Privacy fields cascade: when `privacyRequiredDoNotShowPublicly` is true, all display options are false

**Image System**
- `/src/lib/image-storage/` - Storage adapters (S3/database)
- `/src/lib/image-url.ts` - CDN-aware URL generation
- `/src/hooks/useImageUrl.ts` - React hook for images
- `/src/lib/image-utils.ts` - Image validation and processing

**Database Schema**
- Core entities: User, Town, Person, Comment, AnonymousSupport
- Access control: Role, UserRoles, TownAccess, PersonAccess
- Customization: Layout, Theme, SystemConfig
- Media: ImageStorage, PersonImage, DetentionCenterImage
- Comment fields for privacy:
  - `privacyRequiredDoNotShowPublicly`: boolean (default false)
  - `displayNameOnly`: boolean (default false)
  - `privateNoteToFamily`: string (max 1500 chars)
  - `showComment`, `showOccupation`, `showBirthdate`, `showCityState`: boolean display flags

**Server Actions**
- `/src/app/actions/` - All server-side mutations
- Always validate permissions before operations
- Return consistent success/error responses
- Use Zod for input validation
- Privacy fields: `privacyRequiredDoNotShowPublicly`, `displayNameOnly`
- Comment visibility controlled by multiple boolean flags

**API Routes**
- `/src/app/api/` - RESTful API endpoints
- Dynamic params in Next.js 15 are Promises (must await)
- Protected by middleware unless in matcher exclusion

### Environment Configuration

Critical environment variables:
```
# Database
DATABASE_URL="mysql://user:pass@localhost:3306/bring_me_home"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# CDN & Storage
NEXT_PUBLIC_CLOUDFRONT_CDN_URL="https://cdn.example.com"
IMAGE_STORAGE_TYPE="database" # or "s3"
AWS_S3_BUCKET_NAME="" # if using S3
AWS_ACCESS_KEY_ID="" # if using S3
AWS_SECRET_ACCESS_KEY="" # if using S3

# Optional
REDIS_CONNECTION_STRING="" # for caching
NEXT_PUBLIC_CONSOLE_LOGGING="false" # debug logging

# User Passwords (for seeding)
SEED_ADMIN_PASSWORD="Qm3Xr7Np9K"
SEED_DEMO_PASSWORD="Wj5Bn8Tz4H"
SEED_TOWN_ADMIN_PASSWORD="Pv7Kx3Nm6R"
SEED_PERSON_ADMIN_PASSWORD="Zn9Hb4Vx7T"
```

### Development Guidelines

1. **Component Organization**
   - Use 'use client' only when necessary
   - Prefer server components for data fetching
   - Extract business logic for testability
   - Follow existing component patterns

2. **Image Handling**
   - Always use generateImageUrlWithCdn for URLs
   - Check isAdminRoute to bypass CDN in admin
   - Handle both database and S3 storage
   - Max upload size: 10MB (configured in next.config.ts)

3. **Permission Checks**
   - Always validate in server actions
   - Use hasPermission/hasPersonAccess/isSiteAdmin utilities
   - Log permission failures for audit
   - Check session validity
   - Privacy settings require site admin role:
     ```typescript
     if (!isSiteAdmin(session)) {
       // Disable privacy checkbox for non-site admins
     }
     ```

4. **Cookie Management**
   - Use native browser cookies (/src/lib/cookies.ts)
   - No external cookie libraries needed
   - Handle SSR with typeof document checks
   - Anonymous support uses `quick_supported_{personId}` cookies

5. **Form Handling**
   - Use server actions for form submissions
   - Implement dirty state tracking
   - Show pending states during submission
   - Use reCAPTCHA for public forms
   - Privacy checkbox controls cascade to disable other options
   - Visual feedback for disabled states with explanatory text

### Common Tasks

**Adding a New Admin Page**
1. Create route in `/src/app/admin/`
2. Add permission check in server component
3. Update navigation in AdminLayout if needed
4. Follow existing admin component patterns

**Modifying Database Schema**
1. Update `/prisma/schema.prisma`
2. Run `npm run db:migrate -- --name description_of_change`
3. Run `npm run db:generate`
4. Update relevant server actions and types

**Working with Images**
1. Use ImageUpload component for uploads
2. Storage adapter handles S3/database logic
3. Always generate URLs with CDN helper
4. Respect admin route CDN bypass
5. Handle primary and gallery images separately

**Running Tests**
1. Single test file: `npm run test -- path/to/file.test.tsx`
2. Watch specific test: `npm run test:watch -- --testNamePattern="test name"`
3. Debug test: `npm run test:debug -- path/to/file.test.tsx`
4. Update snapshots: `npm run test:updateSnapshot`

**Implementing Privacy Controls**
1. Privacy checkbox (`privacyRequiredDoNotShowPublicly`) only editable by site admins
2. When privacy is selected, automatically disable and uncheck all display options
3. Private notes (`privateNoteToFamily`) disable public comment display
4. Use yellow background for privacy sections in UI
5. Show explanatory text when options are disabled

### Recent Changes

- Fixed middleware to exclude all /api/ routes (was causing 404s)
- Implemented anonymous support system with cookie tracking
- Added CloudFront CDN integration for all public images
- Created native cookie utilities to replace cookies-next
- Updated "Leave a Message" flow to skip intermediate steps
- Added reCAPTCHA v3 integration for form protection
- Implemented comprehensive privacy controls in comment moderation system
- Added private note display in admin comments grid
- Enhanced role-based permissions for privacy settings
- Fixed comment submission form privacy checkbox behavior
- Hidden "Group by person" checkbox when viewing single person's comments