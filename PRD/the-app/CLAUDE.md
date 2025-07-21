# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**⚠️ GOLDEN RULE: Run `npm run build` after EVERY code change and ensure ZERO warnings/errors ⚠️**

## Quick Reference

### Most Common Commands
```bash
npm run dev          # Start development (port 3000/3001)
npm run build        # ⚠️ MUST RUN BEFORE COMMITTING - Zero warnings/errors required
npm run test         # Run tests
npm run db:migrate   # Create migration after schema changes
npm run db:seed      # Seed database with test data
```

### Critical Warnings to Fix Immediately
- Unused imports/variables
- Missing React hook dependencies  
- TypeScript 'any' types
- Unhandled promises
- Circular reference errors (see Critical Issues section)

## Project Overview

"Bring Me Home" is a Next.js 15 application that helps families connect with missing persons in detention centers. It features multi-tenant support for different towns, role-based access control, and community engagement through comments and support messages.

## Performance & Caching

**⚠️ HIGH TRAFFIC WARNING: Without caching, the site cannot handle high traffic! ⚠️**

The application includes a comprehensive Redis caching layer to handle hundreds of requests per second. Key features:

- **Redis Integration**: Uses existing lazy-loading Redis setup from `/src/lib/redis/`
- **Configurable Cache TTLs**: All cache durations set via environment variables
- **Graceful Fallback**: Works without Redis (direct DB queries)
- **Smart Invalidation**: Automatic cache clearing when data changes

### Cache Configuration
```env
# Cache TTL settings (in seconds)
CACHE_TTL_PERSON_DETAIL=600         # Person page data (10 minutes)
CACHE_TTL_PERSON_METADATA=600       # OG tags metadata (10 minutes)
CACHE_TTL_COMMENTS=300              # Comments (5 minutes - updates frequently)
CACHE_TTL_SUPPORT_STATS=60          # Support statistics (1 minute)
CACHE_TTL_SYSTEM_CONFIG=86400       # System configuration (24 hours)
CACHE_TTL_USER_PERMISSIONS=300      # User permissions (5 minutes)

# Cache limits
CACHE_COMMENTS_LIMIT=999            # Max comments to load per page

# Debug cache hits/misses
CACHE_DEBUG=true
```

### Using the Cache
```typescript
import { withCache, CACHE_TTL, CACHE_KEYS } from '@/lib/cache';

// Cache any async operation
const data = await withCache(
  CACHE_KEYS.personDetail(townSlug, personSlug),
  async () => {
    // Expensive database query here
    return prisma.person.findFirst({...});
  },
  CACHE_TTL.PERSON_DETAIL
);

// Invalidate cache after updates
import { cacheInvalidation } from '@/lib/cache';
await cacheInvalidation.person(townSlug, personSlug, personId);
```

### Performance Impact
- **Without cache**: 5-6 DB queries per page hit, crashes at 100+ requests/second
- **With cache**: 0-1 DB queries, handles 1000+ requests/second

### Enabling Cache Mode
```env
# Set this to true to enable caching (defaults to false)
PERSON_PAGE_USE_CACHE=true
```

### Monitoring Redis Health
- **Admin users** see Redis health stats in the support section of person pages
- **Detailed stats** available at `/configs` page for admins
- Stats update every 2 seconds for first minute with auto-stop

See `PERFORMANCE_OPTIMIZATION_GUIDE.md` for complete implementation details.

## Essential Commands

**🚨 CRITICAL REQUIREMENT: Always run `npm run build` after making ANY code changes! 🚨**

The build MUST complete with:
- ✅ NO errors
- ✅ NO warnings (not even ESLint warnings)
- ✅ All pages generating successfully

**NEVER commit or consider your work complete if the build has ANY warnings or errors.**

Common warnings to fix immediately:
- Unused imports or variables
- Missing React hook dependencies
- TypeScript 'any' types
- Unhandled promises

If you see warnings, FIX THEM before proceeding with any other work.

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

# Utility scripts
npx tsx scripts/generate-email-env-example.ts  # Generate email config for .env.example

# Quick debugging scripts (create in scripts/ folder)
npx tsx scripts/your-script.ts  # Run any TypeScript script with database access
```

**Common Script Pattern:**
```typescript
#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';

async function main() {
  try {
    // Your debugging logic here
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
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
- `/src/lib/email.ts` - Email service with nodemailer for password resets
- `/src/app/api/auth/reset-password/` - Password reset API endpoints

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
- `/api/images/learn-more/[filename]` - Serves learn-more page images with Sharp optimization

**Email Configuration**
- `/src/config/emails.ts` - Centralized email configuration with TypeScript types
- `/src/lib/email-config.ts` - Client-side email helpers
- All email addresses managed through `EMAIL_TYPES` enum
- Use `getEmail(EMAIL_TYPES.SUPPORT)` instead of hardcoding
- Script to generate .env examples: `npx tsx scripts/generate-email-env-example.ts`

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

# Email Configuration (centralized in /src/config/emails.ts)
ADMIN_EMAIL="admin@example.com"          # General support email
HELP_EMAIL="help@example.com"            # Families requesting listings
PRIVACY_EMAIL="privacy@example.com"      # Privacy inquiries
CONDUCT_EMAIL="conduct@example.com"      # Code of conduct violations

# Optional
REDIS_CONNECTION_STRING="" # for caching
NEXT_PUBLIC_CONSOLE_LOGGING="false" # debug logging
IPINFO_TOKEN="" # For geolocation services

# User Passwords (for seeding)
SEED_ADMIN_PASSWORD="Qm3Xr7Np9K"
SEED_DEMO_PASSWORD="Wj5Bn8Tz4H"
SEED_TOWN_ADMIN_PASSWORD="Pv7Kx3Nm6R"
SEED_PERSON_ADMIN_PASSWORD="Zn9Hb4Vx7T"
```

### Key Pages and Routes

**Public Pages**
- `/` - Homepage with towns and recent persons
- `/[townSlug]` - Town page showing detained persons
- `/[townSlug]/[personSlug]` - Individual person profile
- `/learn-more` - Guide for families on how to participate
- `/show-your-support` - Information on supporting detainees
- `/configs` - System configuration and environment info
- `/privacy-policy` - Privacy policy with configurable email
- `/code-of-conduct` - Community guidelines with report email

**Admin Pages** (require authentication)
- `/admin` - Main admin dashboard
- `/admin/persons` - Manage detained persons
- `/admin/towns` - Manage town profiles
- `/admin/users` - User management
- `/admin/comments` - Comment moderation
- `/admin/detention-centers` - Detention center management
- `/admin/layouts` - Layout customization
- `/admin/themes` - Theme management

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

### Critical Issues to Avoid

**⚠️ CIRCULAR REFERENCE ERROR - "Maximum call stack size exceeded" ⚠️**

This is a critical issue that has been encountered multiple times when passing Prisma objects with relations to client components.

**The Problem:**
Prisma models contain bidirectional relations that create circular references:
- `Person → Town → Persons[]` (town.persons includes the original person)
- `Person → Stories[] → Person` (story.person references back)
- `Person → DetentionCenter → Detainees[]` (detentionCenter.detainees may include the person)

When Next.js tries to serialize these objects for client components during SSR, it encounters infinite recursion and throws "Maximum call stack size exceeded".

**⚠️ CRITICAL: Hidden Circular References in Base Types ⚠️**
Even using `Omit<PrismaType, 'field'>` or extending Prisma types can cause circular references because:
1. Prisma types may contain hidden internal properties or methods
2. The base type itself might have circular references through Prisma's internal structure
3. TypeScript utility types like `Omit` don't remove these hidden properties

**Example of Hidden Circular Reference:**
```typescript
// ❌ WRONG - Still contains circular references!
type SerializedPerson = Omit<Person, 'bondAmount'> & {
  bondAmount: string | null;
  town: Town;  // Town type from Prisma still has circular refs
};

// ✅ CORRECT - Completely separate type
type SerializedPerson = {
  id: string;
  firstName: string;
  // ... list all fields explicitly
  town: SanitizedTown;  // Use sanitized type
};
```

**How to Avoid:**
1. **NEVER import from '@prisma/client' in client components** ('use client' files)
2. **NEVER use Prisma types as base types** (avoid `Omit<PrismaType>`, `Pick<PrismaType>`, `extends PrismaType`)
3. **ALWAYS create completely separate types** for client components
4. **ALWAYS sanitize data in server components** before passing to client components
5. **Extract only the fields you need** - see `/src/types/sanitized.ts` for examples
6. **Use the sanitized types** (`SanitizedTown`, `SanitizedDetentionCenter`, etc.)

**Files Currently Violating This Rule (Need Fixing):**
These client components import directly from '@prisma/client':
- `/src/components/layouts/LayoutRenderer.tsx` - Uses `Omit<Person, 'bondAmount'>`
- `/src/app/admin/detention-centers/DetentionCenterForm.tsx` - Imports `DetentionCenter`
- `/src/app/admin/persons/PersonForm.tsx` - Imports multiple Prisma types
- `/src/app/admin/towns/TownForm.tsx` - Imports `Town, Layout, Theme`
- `/src/app/admin/layouts/LayoutForm.tsx` - Imports Prisma types
- `/src/app/admin/themes/ThemeForm.tsx` - Imports Prisma types
- `/src/app/admin/persons/components/PersonBasicInfo.tsx` - Uses `Town[]`
- `/src/app/admin/persons/components/PersonDetentionInfo.tsx` - Uses `DetentionCenter`

**Example of the Problem:**
```typescript
// ❌ WRONG - This will cause circular reference error
<MultiLanguageStoryEditor stories={person?.stories} />

// ✅ CORRECT - Extract only needed fields
const stories = person?.stories?.map(story => ({
  language: story.language,
  storyType: story.storyType,
  content: story.content
})) || [];
<MultiLanguageStoryEditor stories={stories} />
```

**Proper Serialization Pattern:**
```typescript
// In server component (page.tsx)
const serializedPerson: SerializedPerson = {
  // List every field explicitly - no spread operator!
  id: person.id,
  firstName: person.firstName,
  // ... all other fields
  
  // Sanitize relations
  town: {
    id: person.town.id,
    name: person.town.name,
    // ... only needed fields, no relations
  },
  
  // Handle nullable relations
  detentionCenter: person.detentionCenter ? {
    id: person.detentionCenter.id,
    // ... only needed fields
  } : null,
  
  // Map arrays to remove circular refs
  stories: person.stories?.map(story => ({
    id: story.id,
    content: story.content,
    // Exclude: person relation
  })) || []
};
```

**Key Files with Protections:**
- `/src/app/admin/persons/PersonFormWithState.tsx` - Has extensive warnings
- `/src/app/admin/persons/[id]/edit/page.tsx` - Sanitizes all data before passing to client
- `/src/types/sanitized.ts` - Defines safe types without circular references

**⚠️ IMPORTANT MAINTENANCE NOTE ⚠️**
When modifying Prisma schema (`/prisma/schema.prisma`), you MUST also update:
1. **Sanitized types** in `/src/types/sanitized.ts` - Add/remove fields to match
2. **Serialization logic** in server components - Update the field extraction
3. **Any client components** using the modified types

**Example:** If you add a new field `phoneNumber` to the `Town` model:
```typescript
// 1. Update schema.prisma
model Town {
  // ... existing fields
  phoneNumber String?
}

// 2. Update SanitizedTown in /src/types/sanitized.ts
type SanitizedTown = {
  // ... existing fields
  phoneNumber: string | null;
}

// 3. Update serialization in page.tsx
const towns = townsFromDb.map(town => ({
  // ... existing fields
  phoneNumber: town.phoneNumber,
}));
```

**Testing for Circular References:**
1. **Build Test**: Run `npm run build` - it should complete with ZERO errors
2. **Runtime Test**: Navigate to pages that pass complex data to client components:
   - `/admin/persons/[id]/edit` - Person edit page
   - `/[townSlug]/[personSlug]` - Public person page
   - `/admin/towns/[id]/edit` - Town edit page
3. **Console Check**: Open browser console and look for:
   - "Maximum call stack size exceeded" errors
   - Serialization errors
   - Hydration mismatches
4. **Development Check**: In development, Next.js will show errors in the terminal
5. **Quick Test**: If you see the error when a component is rendered but not when it's commented out, the props passed to that component contain circular references

**⚠️ DATE SERIALIZATION IN SSR ⚠️**
When passing data from server to client components that will be hydrated during SSR (like public pages), Date objects must be serialized to strings to prevent hydration mismatches. However, admin components that are all client-side can handle Date objects directly.

**Example:**
```typescript
// For public pages (SSR) - serialize dates
const serializedComment = {
  ...comment,
  createdAt: comment.createdAt.toISOString(),
  updatedAt: comment.updatedAt.toISOString(),
};

// For admin pages (client components) - no serialization needed
<AdminGrid comments={comments} />
```

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
5. Update sanitized types if adding/removing fields

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

**Managing Email Configuration**
1. All emails centralized in `/src/config/emails.ts`
2. View current configuration at `/configs` page
3. Email types are TypeScript-safe using `EMAIL_TYPES` enum
4. Generate .env example: `npx tsx scripts/generate-email-env-example.ts`

**Implementing Privacy Controls**
1. Privacy checkbox (`privacyRequiredDoNotShowPublicly`) only editable by site admins
2. When privacy is selected, automatically disable and uncheck all display options
3. Private notes (`privateNoteToFamily`) disable public comment display
4. Use yellow background for privacy sections in UI
5. Show explanatory text when options are disabled

**Password Reset System**
1. Request reset at `/auth/forgot-password` - sends email with reset link
2. Reset tokens stored in `PasswordResetToken` table with 1-hour expiration
3. Email service configured in `/src/lib/email.ts` with multiple provider support
4. Token validation prevents reuse and checks expiration
5. Rate limiting: If requested within 5 minutes, resends email with existing token
6. Always sends email on valid requests (even with existing tokens)
7. See EMAIL.md for detailed email configuration

**Email System**
1. Multiple provider support: SMTP, SendGrid, AWS SES, Console (for dev)
2. Provider selection via `EMAIL_PROVIDER` environment variable
3. Automatic fallback to console logging if provider fails
4. Detailed logging via `EMAIL_PROVIDER_LOG_SMTP=true`
5. Comprehensive documentation in `/EMAIL.md`
6. Example configuration:
   ```env
   EMAIL_PROVIDER="sendgrid"  # Options: smtp, sendgrid, ses, console
   SENDGRID_API_KEY="your-api-key"
   EMAIL_PROVIDER_LOG_SMTP="true"  # Enable detailed logging
   ```

### Comment System Display Controls

**Understanding Comment Privacy Options:**
- **`privacyRequiredDoNotShowPublicly`**: Completely hides the comment from public view (site admin only)
- **`displayNameOnly`**: Shows name but hides occupation, age, and location
- **`showComment`**: Controls whether comment text is shown or replaced with "Showing support"
- **`requiresFamilyApproval`**: All comments require approval (always true, not a user choice)
- **Display flags** (`showOccupation`, `showBirthdate`, `showCityState`): Individual field visibility

**Privacy Cascading Rules:**
1. When `privacyRequiredDoNotShowPublicly` is true, all other display options are disabled
2. When `displayNameOnly` is true, occupation/age/location are hidden regardless of individual flags
3. Comments always start with `isApproved: false` and need admin approval

**Comment Flow:**
1. User submits comment via `/src/components/person/AnonymousCommentForm.tsx`
2. Server action `/src/app/actions/comments.ts` validates with reCAPTCHA and saves
3. Admin moderates via `/src/components/admin/CommentModerationModal.tsx`
4. Approved comments display on public page via `/src/components/person/CommentSection.tsx`

### User Profile Management

**Profile Page (`/profile`)**
- Accessible to ALL authenticated users (not just admins)
- "My Profile" link appears in main site navigation for all logged-in users
- Displays account information: creation date, last login, username
- Email update functionality with validation (all users)
- Password change with current password verification (all users)
- Password visibility toggles for all password fields
- Roles section only shows if user has roles assigned
- Town/Person access sections only show for users with special permissions
- Modern UI with gradient header and organized sections
- Proper navigation with Back button, Home link, and Sign Out

**Profile API Endpoints**
- `/api/profile/email` - Update user email address (all authenticated users)
- `/api/profile/password` - Change password (requires current password)

### Testing Strategy

**Test Coverage Requirements**: 60% minimum for branches, functions, lines, and statements

**Test Organization**:
- Unit tests: Co-located with components (`Component.test.tsx`)
- Integration tests: In `__tests__` directories
- E2E tests: In `/e2e` directory using Playwright
- API tests: Named `route.test.ts` for API endpoints

**Writing Tests**:
```typescript
// Use existing test utilities
import { renderWithProviders } from '@/test-utils';
import { mockSession } from '@/test-utils/auth';

// Mock Prisma in tests
jest.mock('@/lib/prisma');

// Always clean up after tests
afterEach(() => {
  jest.clearAllMocks();
});
```

### Performance Optimization

1. **Image Loading**
   - Use Next.js Image component with proper sizes
   - CDN URLs for public pages
   - Sharp optimization for uploaded images
   - Max 10MB uploads (configured in next.config.ts)

2. **Database Queries**
   - Use Prisma `include` carefully to avoid N+1 queries
   - Consider Redis caching for frequently accessed data
   - Index critical fields in schema

3. **Client Bundle Size**
   - Avoid importing Prisma types in client components
   - Use dynamic imports for large components
   - Keep sanitized types minimal

### Deployment Notes

**Production Checklist**:
1. Run `npm run build` - must succeed with zero warnings
2. Set all required environment variables
3. Run database migrations: `npm run db:deploy:prod`
4. Configure CDN for image delivery
5. Set up email provider (SendGrid recommended)
6. Enable reCAPTCHA for form protection
7. Configure Redis for caching (optional but recommended)

**Docker Deployment**:
```bash
docker build -t bring-me-home .
docker run -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e NEXTAUTH_SECRET="..." \
  bring-me-home
```