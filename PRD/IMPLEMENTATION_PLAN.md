# Bring Them Home - Implementation Plan

## Overview
This implementation plan outlines the step-by-step approach to building the "Bring Them Home" application for tracking and advocating for ICE detainees, prioritizing core functionality first, then adding administrative features.

## Phase 1: Project Foundation (Week 1-2)

### 1.1 Project Setup
- [x] Initialize Next.js 15 project with TypeScript
- [x] Configure TailwindCSS for styling
- [x] Set up ESLint and Prettier
- [x] Configure package.json with required dependencies
- [x] Set up git repository and initial commit

### 1.2 Database Infrastructure
- [x] Install and configure Prisma ORM
- [x] Set up MySQL database connection
- [x] Design and implement database schema*4
- [x] Create migration files
- [x] Set up database seeding infrastructure

### 1.3 Core Dependencies
```bash
npm install prisma @prisma/client mysql2
npm install zod
npm install @types/node
npm install tailwindcss @tailwindcss/forms
npm install next-auth
npm install bcryptjs @types/bcryptjs
```

## Phase 2: Authentication & Authorization (Week 2-3)

### 2.1 Authentication System
- [x] Implement NextAuth.js configuration
- [x] Create user registration/login forms
- [x] Set up password hashing with bcrypt
- [x] Configure session management
- [x] Create authentication middleware

### 2.2 Role-Based Access Control
- [x] Implement role-based permission system
- [x] Create authorization middleware
- [x] Set up route protection
- [x] Configure role-specific redirects

### 2.3 User Management
- [x] Create user CRUD operations
- [x] Implement role assignment system
- [x] Set up town/person access controls
- [x] Create user profile management

## Phase 3: Core Data Models (Week 3-4)

### 3.1 Database Models Implementation
- [x] Create User model with relationships
- [x] Implement Town model
- [x] Build Person model with image handling
- [x] Create Comment model
- [x] Set up Role and Permission models
- [x] Configure Layout and Theme models
- [x] Add layoutId and themeId to Town and Person models
- [ ] Create DetentionCenter model
- [ ] Add detention-specific fields to Person model
- [ ] Update Comment model for reCAPTCHA support
- [ ] Add image size limit fields to User and Town models

### 3.2 Zod Validation Schemas*5
- [x] Create validation schemas for all models
- [x] Implement client-side validation
- [x] Set up server-side validation
- [x] Create type-safe API endpoints

### 3.3 React Server Functions
- [P] Implement secure database operations
- [P] Create CRUD functions for all models
- [P] Set up error handling
- [P] Add input sanitization

## Phase 4: Seed Data Implementation (Week 4-5)

### 4.1 Seed Data Creation
- [x] Create California towns seed data
- [x] Generate person profiles (2-5 per town)
- [x] Create sample comments (5-15 per person)
- [x] Set up image placeholder system*1
- [x] Create admin user accounts
- [ ] Scrape Southern California detention centers from ICE website
- [ ] Create detention center seed data
- [ ] Update person profiles with detention information
- [ ] Add anonymous comment examples

### 4.2 Database Population
- [x] Implement seeding scripts
- [x] Create data validation checks
- [x] Set up development data refresh
- [x] Test data integrity

## Phase 5: Public Interface (Week 5-7)

### 5.1 Town/Person Public Pages
- [x] Create town landing pages
- [x] Implement person profile pages
- [x] Add image display components
- [x] Create story/description sections
- [x] Implement responsive design

### 5.2 Comment System
- [x] Build comment submission forms
- [x] Implement file upload functionality
- [x] Create privacy level controls
- [x] Add form validation with useActionState
- [x] Set up comment display components
- [ ] Implement Google Invisible reCAPTCHA v2
- [ ] Add reCAPTCHA validation for anonymous comments
- [ ] Create optional login prompt
- [ ] Implement React state for comment drafts (no Redis)
- [ ] Add Redis storage for drafts (when available)
- [ ] Server-side reCAPTCHA verification
- [ ] Add session ID generation for Redis keys

### 5.3 Theme and Layout System
- [x] Create 10 layout templates (Grid, Stack, Hero, Sidebar Left/Right, Magazine, Card, Minimal, Gallery, Full Width)
- [x] Implement 10 color themes with custom theme creator
- [x] Add theme switching functionality
- [x] Create responsive breakpoints
- [x] Test mobile compatibility
- [x] Build LayoutRenderer component for dynamic layout rendering
- [x] Create ThemeEditor component with color picker
- [x] Implement layout and theme preview components
- [x] Add layout/theme assignment to towns and persons
- [ ] Add live theme editor UI on main pages
- [ ] Implement town vs system theme persistence
- [ ] Add theme editing permissions by role

## Phase 6: File Upload & Media Management (Week 7-8)

### 6.1 Image Upload System
- [x] Implement secure file upload
- [x] Create thumbnail generation
- [x] Set up file size validation
- [x] Add image compression
- [x] Create file storage organization
- [ ] Add configurable upload size limits (IMAGE_UPLOAD_MAX_SIZE_MB)
- [ ] Add configurable storage size limits (IMAGE_STORAGE_MAX_SIZE_KB)
- [ ] Implement multi-level limit hierarchy (user > town > system)
- [ ] Add automatic resizing to storage limit
- [ ] Create image processing pipeline with WebP conversion

### 6.2 Media Display Components
- [x] Build image gallery components
- [x] Create thumbnail preview system
- [x] Add full-size image modals
- [x] Implement video support
- [x] Create file size indicators

## Phase 6.5: WYSIWYG Editor Integration (Week 8)

### 6.5.1 Editor Implementation
- [ ] Integrate TinyMCE editor
- [ ] Configure editor toolbar and features
- [ ] Implement HTML sanitization
- [ ] Add direct HTML input mode
- [ ] Create preview functionality

### 6.5.2 Content Storage
- [ ] Update Person model with HTML story field
- [ ] Migrate existing plain text stories
- [ ] Implement versioning system
- [ ] Add auto-save functionality

## Phase 7: Advanced Features (Week 8-9)

### 7.1 Search and Navigation
- [ ] Implement search functionality
- [x] Create navigation components
- [ ] Add breadcrumb navigation
- [x] Set up URL routing
- [ ] Create sitemap generation

### 7.2 Accessibility and Performance
- [ ] Implement WCAG compliance
- [ ] Add keyboard navigation
- [ ] Create screen reader support
- [ ] Optimize image loading
- [ ] Add performance monitoring

## Phase 8: Admin Interface (Week 10-12)

### 8.1 Admin Dashboard Framework
- [x] Create admin layout components
- [x] Implement navigation structure
- [x] Set up role-based sections
- [x] Create dashboard overview
- [x] Add quick action buttons

### 8.2 Data Management Grids
- [x] Build reusable grid components
- [x] Implement sort and filter functionality
- [x] Create edit/delete/insert operations
- [x] Add pagination with configurable rows
- [x] Set up bulk operations (delete selected)

### 8.3 User Management Interface
- [x] Create user administration panel
- [x] Implement role assignment interface
- [ ] Add user activity monitoring
- [ ] Create user approval workflows
- [x] Set up permission management

### 8.4 Layout and Theme Management
- [x] Create admin interface for layouts (CRUD operations)
- [x] Create admin interface for themes (CRUD operations)
- [x] Implement layout preview in admin grid
- [x] Implement theme preview with color display
- [x] Add layout/theme selection in town forms
- [x] Add layout/theme selection in person forms
- [ ] Add environment variables for system defaults (SYSTEM_DEFAULT_LAYOUT, SYSTEM_DEFAULT_THEME)
- [ ] Create system config override interface for admins
- [ ] Add layout/theme info to footer with admin edit capability
- [ ] Display town-specific layout/theme in footer
- [ ] Update configs page to show layout/theme environment variables

### 8.6 Detention Center Management
- [ ] Create detention center admin grid (CRUD)
- [ ] Implement web scraping interface
- [ ] Add state/all import options
- [ ] Create progress indicators for import
- [ ] Add "eye" icon to view detainees
- [ ] Implement town-based access controls
- [ ] Add facility image management with auto-resize to <50KB
- [ ] Set up /public/images/detention-centers/ directory structure
- [ ] Implement WebP conversion for images
- [ ] Create thumbnail generation (max 20KB)
- [ ] Create capacity tracking (admin only)

### 8.7 Admin Help Documentation
- [ ] Add "Notes" sections below each grid
- [ ] Create icon legend documentation
- [ ] Document clickable columns
- [ ] Add keyboard shortcuts guide
- [ ] Create tooltips for complex features

### 8.5 Content Moderation
- [x] Build comment moderation interface
- [x] Create content approval workflows (approve/reject)
- [ ] Implement spam detection
- [ ] Add reporting functionality
- [ ] Set up notification system

## Phase 9: Environment & Deployment (Week 12-13)

### 9.1 Environment Configuration*2
- [x] Set up environment variable management
- [x] Create version tracking system
- [x] Implement configuration validation
- [x] Add environment-specific settings
- [x] Create public configuration page (/configs)
- [x] Implement build information tracking
- [ ] Add SYSTEM_USERNAME_OVERRIDE and SYSTEM_PASSWORD_OVERRIDE
- [ ] Implement SITE_BLOCK_USERNAME and SITE_BLOCK_PASSWORD
- [ ] Add TOWN_DEFAULT and USER_DEFAULT
- [ ] Configure GITHUB_REPO_URL display
- [ ] Add GOOGLE_RECAPTCHA_SITE_KEY (display for admin only)
- [ ] Add GOOGLE_RECAPTCHA_SECRET_KEY (never display)
- [ ] Add REDIS_HOST and REDIS_PORT configuration
- [ ] Show Redis connection status (admin only)
- [ ] Add IMAGE_UPLOAD_MAX_SIZE_MB to configs
- [ ] Add IMAGE_STORAGE_MAX_SIZE_KB to configs
- [ ] Update configs page with admin-only sections

### 9.2 Docker Configuration*3
- [x] Create Dockerfile
- [x] Set up docker-compose for development
- [x] Configure production builds
- [ ] Add health check endpoints
- [ ] Set up container orchestration
- [ ] Create single docker-compose.yml with all configuration
- [ ] Embed all environment variables directly in compose file
- [ ] Add optional Redis service configuration
- [ ] Add volume mappings for uploads, images, and Redis data
- [ ] Implement database and Redis readiness checks
- [ ] Remove need for separate .env file

### 9.3 Production Deployment
- [ ] Configure production database
- [ ] Set up SSL certificates
- [ ] Implement security headers
- [ ] Configure backup systems
- [ ] Set up monitoring and logging

## Phase 9.5: Enhanced Authentication (Week 13)

### 9.5.1 System Override Authentication
- [ ] Implement SYSTEM_USERNAME_OVERRIDE check
- [ ] Add SYSTEM_PASSWORD_OVERRIDE validation
- [ ] Create NextAuth custom provider
- [ ] Ensure overrides bypass database
- [ ] Hide override credentials from UI

### 9.5.2 Site Protection
- [ ] Implement SITE_BLOCK_USERNAME check
- [ ] Add SITE_BLOCK_PASSWORD validation
- [ ] Create middleware for site blocking
- [ ] Design simple login UI for beta access
- [ ] Add bypass for authenticated users

### 9.5.3 Default Navigation
- [ ] Implement TOWN_DEFAULT routing
- [ ] Add USER_DEFAULT redirect
- [ ] Create fallback for invalid defaults
- [ ] Update home page navigation logic

### 9.5.4 reCAPTCHA Integration
- [ ] Install @google-recaptcha/react package
- [ ] Create reCAPTCHA component wrapper
- [ ] Implement invisible reCAPTCHA on comment forms
- [ ] Add server-side verification endpoint
- [ ] Configure site key and secret key
- [ ] Add fallback for reCAPTCHA failures
- [ ] Test with Google reCAPTCHA admin console

### 9.5.5 Temporary Storage Implementation
- [ ] Install ioredis package
- [ ] Create Redis connection helper with lazy loading
- [ ] Implement dual storage strategy (React state + Redis)
- [ ] Add session ID generation for Redis keys
- [ ] Configure 1-hour TTL for Redis entries
- [ ] Create storage abstraction service
- [ ] Implement manual deletion after data consumption
- [ ] Test Redis failover to React state

### 9.5.6 Image Configuration System
- [ ] Add IMAGE_UPLOAD_MAX_SIZE_MB environment variable
- [ ] Add IMAGE_STORAGE_MAX_SIZE_KB environment variable
- [ ] Create image limit service with hierarchy logic
- [ ] Add admin UI for town-level limits
- [ ] Add admin UI for user-level limits
- [ ] Implement most-restrictive limit calculation
- [ ] Update /configs to show image limits

### 9.5.7 Health Check System
- [ ] Create HealthCheck table in Prisma schema
- [ ] Implement Redis health check with performance metrics
- [ ] Implement Prisma health check with CRUD operations
- [ ] Add health check buttons to /configs (admin only)
- [ ] Create server actions for health tests
- [ ] Display connection status and performance metrics
- [ ] Add error handling and timeout logic
- [ ] Implement test data cleanup

## Phase 10: Testing & Quality Assurance (Week 13-14)

### 10.1 Testing Implementation
- [ ] Set up Jest testing framework
- [ ] Create unit tests for components
- [ ] Implement integration tests
- [ ] Add end-to-end testing
- [ ] Create test data fixtures

### 10.2 Performance Optimization
- [ ] Optimize database queries
- [ ] Implement caching strategies
- [ ] Add image optimization
- [ ] Configure CDN integration
- [ ] Monitor performance metrics

### 10.3 Security Hardening
- [ ] Implement security headers
- [ ] Add rate limiting
- [ ] Configure CSRF protection
- [ ] Set up input validation
- [ ] Add security monitoring

### 10.4 Monitoring & Health Checks
- [ ] Implement Redis connectivity monitoring
- [ ] Add database connectivity checks
- [ ] Create health check endpoints
- [ ] Add performance metrics collection
- [ ] Configure alerting thresholds
- [ ] Implement automatic recovery procedures

## Implementation Order Rationale

1. **Foundation First**: Setting up the project structure and database ensures a solid base for all subsequent development.

2. **Authentication Early**: User management and security should be implemented before any user-facing features.

3. **Data Models Core**: All functionality depends on the core data models being properly designed and implemented.

4. **Seed Data Before UI**: Having test data available makes UI development more efficient and realistic.

5. **Public Interface Priority**: The public-facing features are the primary user experience and should be perfected first.

6. **Admin Interface Last**: Administrative features are important but secondary to the core user experience.

## Development Best Practices

### Code Organization
- Use consistent file naming conventions
- Implement proper TypeScript types
- Follow React best practices
- Maintain clean component architecture

### Security Considerations
- Validate all inputs on client and server
- Use parameterized queries
- Implement proper authentication checks
- Follow OWASP security guidelines

### Performance Guidelines
- Optimize image loading and sizing
- Use proper caching strategies
- Implement lazy loading where appropriate
- Monitor and optimize database queries

### Testing Strategy
- Write tests for all critical functionality
- Test security and validation logic
- Verify responsive design across devices
- Test accessibility compliance

## Risk Mitigation

### Technical Risks
- **Database Performance**: Implement proper indexing and query optimization
- **File Upload Security**: Validate file types and implement virus scanning
- **Authentication Vulnerabilities**: Use established libraries and security best practices

### Project Risks
- **Scope Creep**: Maintain focus on MVP features first
- **Timeline Delays**: Build in buffer time for complex features
- **Data Privacy**: Implement proper consent and privacy controls

## Success Metrics

### Technical Metrics
- Page load times under 3 seconds
- 99.9% uptime
- Zero critical security vulnerabilities
- Mobile responsiveness score > 95%

### User Experience Metrics
- Intuitive navigation (user testing)
- Accessible to users with disabilities
- Cross-browser compatibility
- Clear and helpful error messages

### Business Metrics
- Successful advocacy campaigns for detainees
- Community support message volume
- Admin efficiency in detention center management
- Anonymous vs authenticated participation rates
- Social media sharing metrics
- Time to gather support threshold (e.g., 100 supporters)