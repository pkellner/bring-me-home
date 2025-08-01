# Bring Them Home - Product Requirements Document

## Implementation Status

### ✅ Implemented Features
- User Authentication & Authorization (NextAuth, bcrypt, roles)
- Town & Person Management with full CRUD operations
- **Multi-Language Story Support** - Stories can be created and displayed in multiple languages with language toggle
- **Anonymous Comment System** - Comments with required name fields, optional contact info, and support preferences
- **Comment Moderation System** - Admin interface for approving/rejecting comments with editing capability
- **Permission-Based Access Control** - Users only see and manage persons/comments they have access to
- **Role-Based Comment Editing** - Site admins can edit content, others can only approve/reject
- Theme and Layout System (10 layouts, 10 themes, admin interfaces)
- Admin Interface with comprehensive data grids
- Build Information & Configuration Page (/configs)
- Health Check System (Redis and database connectivity tests)
- Core Database Models (User, Town, Person, Story, Comment, Role, Theme, Layout)
- Multi-language Seed Data (English, Spanish, French examples)

### ❌ Not Yet Implemented
- **Detention Center Management** - No DetentionCenter model or ICE facility features
- **WYSIWYG Editor** - Story content is plain text, not HTML
- **Google reCAPTCHA** - No spam protection on comment forms
- **Enhanced Authentication** - No environment override credentials (SYSTEM_USERNAME_OVERRIDE, etc.)
- **Site Protection** - No beta access control (SITE_BLOCK_USERNAME/PASSWORD)
- **Configurable Image Limits** - No IMAGE_UPLOAD_MAX_SIZE_MB or IMAGE_STORAGE_MAX_SIZE_KB
- **Live Theme Editor** - No on-page theme editing for admins
- **Search Functionality** - No search implementation
- **Comprehensive Docker Setup** - Basic Dockerfile exists but no full docker-compose

### ⚠️ Partially Implemented
- **Redis Infrastructure** - Connection exists but not used for drafts/temporary storage
- **Environment Variables** - Layout/theme defaults work but no auth overrides
- **Image Processing** - Pipeline exists but no configurable size limits
- **User Dependencies** - Comments no longer require user accounts but authentication system still exists

## Executive Summary

The "Bring Them Home" application is a web-based platform designed to bring attention to individuals detained by ICE (Immigration and Customs Enforcement), typically due to undocumented immigration status. The platform enables families and friends to create profiles for detained individuals, share their stories, gather community support through comments and testimonials, and organize advocacy efforts. The application features town-based organization, detention center management, person profiles with rich media, community engagement tools, and a comprehensive admin system for managing content and users.

## Core Features

### 1. User Authentication & Authorization
- Username/password authentication
- Role-based access control (Site Admin, Town Admin, Person Admin)
- Multi-town and multi-person assignments for users
- Read-only vs. edit access permissions
- Secure session management

### 2. Town & Person Management
- Town-based organization with dedicated URLs (e.g., `/borrego-springs/fidel`)
- Person profiles with detailed information including detention status
- Detention center assignment and tracking *(not implemented)*
- Image and video management (primary + up to 3 secondary photos/videos)
- Rich story content with WYSIWYG editor (HTML storage) *(plain text only, no WYSIWYG)*
- Contact information and identification details (including Alien ID#)
- Privacy controls for sensitive information (family vs. public view)
- **Person Profile Display Requirements**:
  - Top section shows only: Full name (including middle name if present) and Home Town
  - Detention information: Detention date and Last heard from date
  - Notes from last contact (if available)
  - Legal representation status: "Represented by Lawyer: Yes/No"
  - Clean, detainee-focused presentation (not missing person style)

### 3. Community Engagement
- **Anonymous comment system with no authentication required**
- Required fields: First name, Last name
- Optional fields: Email, Phone, Occupation, Birthdate, Support message
- Three support options:
  - "I want to help more, please contact me"
  - "Display just my name as supporting"
  - "Display my name and comment if family approves"
- Privacy options for optional fields:
  - "Show my occupation publicly" (checkbox)
  - "Show my birthdate publicly" (checkbox)
- Comment moderation system with admin approval workflow
- Admin can edit comments before approval
- Admin can toggle occupation/birthdate visibility before approval
- Moderator notes for tracking decisions
- Only approved comments shown publicly
- File upload capabilities *(implemented but not in anonymous form)*
- Privacy controls *(basic implementation)*

### 4. Multi-Language Support
- **Story Model** - Separate database model for stories with language support
- Language codes using ISO 639-1 standard (en, es, fr, etc.)
- Story types: personal, detention, family
- Language toggle UI that only appears when multiple languages exist
- Seamless language switching without page reload
- Support for unlimited languages per person
- Multi-language story editor in admin interface
- Sample data in English, Spanish, and French

### 5. Visual Customization

#### Layout System (10 Templates)
1. **Custom Person Layout**: Default responsive layout with organized sections
2. **Grid Layout**: 2-4 column flexible grid system
3. **Stack Layout**: Simple vertical stacking
4. **Sidebar Left/Right**: Main content with sidebar navigation
5. **Magazine Layout**: Editorial style with featured images
6. **Hero Layout**: Large banner image focus
7. **Minimal Layout**: Centered, constrained width
8. **Gallery Layout**: Optimized for photo galleries
9. **Full Width Layout**: No container constraints
10. **Card Layout**: Card-based component display

#### Theme System (Preset Options)
- Ocean Blue, Forest Green, Sunset Orange, Purple Dream
- Custom theme creation with color picker
- CSS variable-based implementation
- Per-town and per-person theme overrides
- Real-time preview in admin interface

#### Customization Features
- System-wide defaults via environment variables
- Town-level overrides
- Person-level overrides (highest priority)
- Live theme editing UI on main page (admin only) *(not implemented)*
- Responsive design for all screen sizes
- Theme persistence across sessions

### 6. Admin Interface
- Grid-based management for all models including detention centers
- Sort, filter, edit, delete, and insert capabilities
- Image thumbnail previews with full-size viewing
- File size display in user-friendly format
- Pagination with configurable row counts (default: 100)
- Role-based section grouping
- Detention center management with web scraping integration
- "Eye" icon to view detainees at specific centers (town-admin restricted)
- Help/notes sections below each admin grid explaining functionality
- Config screen with public/private info based on admin level
- **Person Visibility Management**:
  - Individual visibility toggle for each person (isActive field)
  - Live status toggle buttons (similar to boolean toggles in other admin grids)
  - Instant visual feedback with optimistic updates
  - "Group By Town" checkbox for organized person listing
  - Bulk actions per town: "Set All Visible" and "Set All Invisible"
  - Global bulk actions: "Set All Visible" and "Set All Invisible" for entire grid
  - Optimistic UI updates with rollback on failure
  - Real-time visibility status display in grid
  - Search functionality remains outside grouping and filters all persons regardless of grouping state
- **Town Visibility Management**:
  - Individual visibility toggle for each town (using existing isActive field)
  - "Group By State" checkbox (defaulted to ON)
  - Bulk actions per state: "Set All Visible" and "Set All Invisible"
  - Global bulk actions: "Set All Visible" and "Set All Invisible" for entire grid
  - Live status toggle buttons with instant visual feedback
  - Optimistic UI updates with rollback on failure
  - Search functionality remains outside grouping
- **Comment Management Enhancement**:
  - "Group By Person" checkbox for organizing comments (default ON)
  - Town selection dropdown to filter comments by town
  - Bulk actions per person: "Approve All" and "Reject All"
  - Global bulk actions for all filtered comments
  - Maintains existing comment moderation features
  - Search functionality remains outside grouping
  - **Comment Status Toggle**: Live toggle between "Approved" and "Pending" states
  - Visual feedback with green badge for approved, yellow for pending
  - Optimistic UI updates with rollback on failure
  - Edit functionality to modify comment content before approval
  - Consistent with person/town visibility toggle patterns
  - **Edit Icon Visibility**: Show edit icon only for users with comment update permissions
  - Hide edit icon for users without permissions to prevent non-functional UI elements
  - Permission-based UI elements follow role-based access control
  - **Enhanced Comment Fields**: 
    - Occupation field (optional) with public display toggle
    - Birthdate field (optional) with public display toggle
    - Moderators can edit these fields and toggle their visibility before approval
    - Public display respects commenter's privacy preferences
  - **Role-Based Comment Editing**:
    - Site admins: Can edit all comment fields (content, occupation, birthdate, display settings)
    - Town/Person admins: Can only approve/reject and add moderator notes
    - Edit form UI adapts based on user role (disabled fields, different button text)
    - Backend enforces permissions on all comment update operations
- **Visibility Filtering on Public Pages**:
  - Main site homepage only shows towns where isActive is true
  - "Recently Added" section only shows persons from visible towns who are also visible (isActive)
  - Detained person count only includes visible persons from visible towns
  - Town pages only show visible persons
  - Ensures consistent visibility control throughout the public interface

### 7. Detention Center Management *(NOT IMPLEMENTED)*
- Comprehensive detention center database
- Web scraping integration from ICE facility locator
- Admin interface to import facilities by state or all
- Detention center profiles with:
  - Name, address, contact information
  - Facility photos and capacity information
  - Current detainee count (admin only)
  - Link to view all detainees at facility
- Seeding script for Southern California facilities
- Town-based access restrictions for viewing detainees

### 8. Story Editor & Content Management *(PARTIALLY IMPLEMENTED)*
- **Multi-Language Story Editor** - Create and edit stories in multiple languages
- Language selection dropdown in admin forms
- Story type selection (personal, detention, family)
- Plain text editor *(WYSIWYG not implemented)*
- Stories stored as separate entities with language codes
- Automatic handling of story uniqueness per person/language/type
- TinyMCE WYSIWYG editor for person stories
- HTML content storage in database
- Direct HTML input option for advanced users
- Rich media embedding support
- Auto-save functionality
- Content versioning for stories

### 9. Enhanced Authentication & Security *(NOT IMPLEMENTED)*
- System-level override credentials (SYSTEM_USERNAME_OVERRIDE, SYSTEM_PASSWORD_OVERRIDE)
- Site-wide access control for beta testing (SITE_BLOCK_USERNAME, SITE_BLOCK_PASSWORD)
- Environment-based authentication bypass for development
- Secure credential storage separate from database
- No display of override credentials in config screens

### 10. Anonymous Participation *(IMPLEMENTED)*
- **Full anonymous comment system - no authentication required**
- Required commenter information: First name, Last name
- Optional contact fields: Email, Phone
- Optional demographic fields: Occupation, Birthdate
- Support preference checkboxes
- Privacy controls for showing occupation and birthdate publicly
- No user account creation or login required
- Comments stored with commenter information
- Admin moderation workflow for all comments
- No reCAPTCHA protection *(not implemented)*
- No email verification *(not implemented)*

### 10.1. Comment Submission Confirmation Flow
- **Post-submission confirmation modal** (not just an alert)
- Display message: "Your message is being reviewed by the family to make sure it is OK with them"
- Show user's selected support preferences:
  - "I want to help more, please contact me" (if selected)
  - "Display just my name as supporting" (if selected)
  - "Display my name and comment if family approves" (if selected)
- Provide clear options:
  - "Cancel" button - removes the comment entirely
  - "OK, Post My Support" button - confirms submission
- No comment is saved until user confirms with OK button
- Professional, empathetic design matching site theme
- Modal should be accessible and mobile-friendly

### 11. Docker & Deployment
- Production-ready docker-compose configuration
- Environment variable management through .env files
- Default values for all non-sensitive configurations
- Health checks and monitoring endpoints
- Container orchestration support

### 12. Person Image Management

#### Overview
The application supports simple image management for detained persons with a primary picture and up to 5 additional images.

#### Primary Picture
- Single main image stored directly on Person model
- No caption support (identification only)
- Displayed prominently in all layouts
- Managed separately from additional images
- Supports all common image formats

#### Additional Images (PersonImage Model)
- Up to 5 additional images per person
- Each image includes:
  - Optional caption/description field
  - Automatic thumbnail generation
  - Upload tracking with user attribution
- All images are publicly displayed

#### Image Manager Component
- Clean, simple interface with two sections:
  1. Primary Picture: Upload/change main photo
  2. Additional Pictures: Grid of up to 5 images
- Features:
  - Simple file selection (single or multiple)
  - Real-time image preview
  - Caption field beneath each additional image
  - Easy removal with trash icon
  - Image count indicator (e.g., "3/5")
  - Alert when trying to exceed 5 image limit

#### Gallery Display
- Primary image shown in layouts as main photo
- Additional images displayed in simple grid
- Captions shown below images when provided
- Responsive grid layout (1-5 columns based on screen size)
- Supports legacy secondaryPic1/2 fields for backward compatibility

## Technical Requirements

### Platform & Framework
- **Frontend**: Next.js 15 with TypeScript
- **Component Architecture**: Client-side components only
- **Styling**: TailwindCSS for responsive design
- **Database**: MySQL with Prisma ORM
- **Validation**: Zod schemas for client and server
- **File Storage**: Image and video upload support

### Database Schema
- **Users**: Authentication and role management ✅
- **Towns**: Geographic organization units ✅
- **Persons**: Detained individual profiles ✅ *(detention fields partially implemented)*
- **Stories**: Multi-language story content with language and type support ✅
- **DetentionCenters**: ICE facility information and management ❌ *(not implemented)*
- **Comments**: Anonymous support records with commenter info ✅
- **Roles**: Permission-based access control ✅
- **Layouts**: Visual theme templates ✅
- **Themes**: Color scheme definitions ✅
- **SystemConfig**: Environment variable overrides and settings *(partial - layout/theme only)*
- **HealthCheck**: Connectivity testing table ✅

### Security & Compliance

### Authentication Security
- **Password Requirements**:
  - Minimum length: 8 characters
  - No complexity requirements enforced (uppercase, lowercase, numbers not required)
  - Password generator creates 10+ character passwords with complexity
  - Bcrypt hashing with 12 rounds
  - No password history or expiration
  - No account lockout mechanism
- **Session Management**:
  - JWT-based sessions with 30-day expiration
  - Secure, HttpOnly cookies
  - Different cookie names in production (prefixed with `__Secure-`)
  - CSRF token protection via NextAuth

### Site Protection Features
- **Two-Level Protection System**:
  - Site-wide password protection (optional via SITE_PROTECTION_ENABLED)
  - System override authentication for emergency admin access
  - Both use 7-day cookie duration
  - Simple hash-based token generation
- **HTTPS Enforcement**: Automatic redirect from HTTP to HTTPS in production
- **Cookie Security**: SameSite=lax, Secure flag in production, HttpOnly

### Input Validation & Sanitization
- Zod schemas for all user inputs
- File upload validation (5MB client, 10MB server limit)
- Image type validation (JPEG, PNG, WebP only)
- React Server Functions for all database operations
- Proper authentication checks for all routes
- CSRF protection and secure headers
- Data privacy controls and consent management

### Security Gaps (Documented for Future Implementation)
- No XSS sanitization for HTML content (dangerouslySetInnerHTML used)
- No rate limiting on authentication endpoints
- No two-factor authentication
- No security headers (CSP, X-Frame-Options, etc.)
- Basic password policy (only length requirement)

### Performance & Scalability
- Optimized image handling with thumbnails
- Efficient database queries with proper indexing
- Responsive design for mobile and desktop
- Docker containerization for deployment

## User Roles & Permissions

### Site Admin
- Full system access
- User and role management
- Global settings configuration
- All town and person management
- **Full comment editing capabilities** including content, occupation, birthdate, and display settings
- Can modify any comment before approval

### Town Admin
- Assigned to specific towns
- Full access to assigned town's persons
- Comment moderation for assigned areas (approve/reject only)
- Local settings management
- **Limited comment editing**: Can only update moderator notes, not comment content
- Cannot edit commenter information or display settings

### Person Admin
- Assigned to specific persons
- Profile management for assigned persons
- Comment monitoring and response
- Family communication coordination
- **Limited comment editing**: Can only update moderator notes, not comment content
- Cannot edit commenter information or display settings

### Permission System Implementation
- **Person Access Filtering**: Users only see persons they have explicit access to
  - Site admins see all persons
  - Town admins see all persons in their assigned towns
  - Person admins see only their assigned persons
- **Comment Access Filtering**: Comments are filtered based on person access
  - Users only see comments for persons they have access to
  - Access level inheritance from person permissions
- **Backend Permission Enforcement**: All actions verify user permissions
  - Comment approval/rejection checks person access
  - Person updates check write access
  - Bulk operations verify access to all affected records
- **UI Permission Controls**:
  - Comment edit form shows "Update" button for non-site admins
  - Comment edit form shows "Approve & Publish" for site admins
  - Form fields are disabled based on role (only site admins can edit content)
  - Edit icons only visible to users with appropriate permissions

## Data Models

### User Model
- ID (string GUID)
- Username (unique)
- Password (hashed)
- Email
- Roles (many-to-many relationship)
- Assigned towns
- Assigned persons
- Created/updated timestamps

### Town Model
- ID (string GUID)
- Name
- State
- Full address
- Description
- Default layout
- Default theme
- Admin users
- Created/updated timestamps

### Person Model
- ID (string GUID) ✅
- First name ✅
- Middle name ✅
- Last name ✅
- Alien ID number ✅
- Detention center (foreign key) ✅
- Detention date ✅
- Last heard from date ✅
- Notes from last contact (text) ✅
- Case number ✅
- Bond amount (Decimal type) ✅
- Legal representation:
  - representedByLawyer (boolean) ✅
  - representedByNotes (text) ✅
- US Address (full) ✅
- International address (e.g., Mexico) ✅
- Primary picture/video ✅
- Secondary media (up to 3) ✅
- Stories (separate Story model with multi-language support) ✅
- Detention status ✅
- Privacy settings per field ❌ *(not implemented)*
- Associated town ✅
- Admin users ✅
- Created/updated timestamps ✅

### Story Model *(NEW)*
- ID (string GUID)
- Person ID (foreign key)
- Language (ISO 639-1 code, default: "en")
- Story type (personal, detention, family)
- Content (text)
- Active status
- Unique constraint on person + language + type
- Created/updated timestamps

### Comment Model
- ID (string GUID)
- Person ID (foreign key)
- **No user/author relationship - fully anonymous**
- First name (required)
- Last name (required)
- Email (optional)
- Phone (optional)
- Occupation (optional)
- Birthdate (optional)
- Comment content (optional)
- Support preferences:
  - wantsToHelpMore (boolean)
  - displayNameOnly (boolean)
  - requiresFamilyApproval (boolean)
- Display preferences:
  - showOccupation (boolean) - whether to display occupation publicly
  - showBirthdate (boolean) - whether to display birthdate publicly
- Comment type (support, etc.)
- Visibility level
- Approval status with approval tracking:
  - isApproved (boolean)
  - approvedAt (timestamp)
  - approvedBy (user ID)
- Moderator notes
- Active status
- Created/updated timestamps

### Additional Data Models (Implemented)

#### AuditLog Model
- Comprehensive audit trail for sensitive operations
- Tracks: userId, action, entityType, entityId, oldValues, newValues
- Captures IP address and user agent
- Used for: user registration, updates, deletions, comment approvals

#### ImageStorage Model  
- Binary image storage in database
- Stores: image data, mimeType, size, width, height
- Automatic thumbnail generation
- Image processing with Sharp library

#### PersonImage Model
- Up to 5 additional images per person
- Fields: imageUrl, thumbnailUrl, caption, isPrimary, displayPublicly
- Upload tracking with user attribution
- Display order management

#### SystemConfig Model
- Key-value store for runtime configuration
- Overrides environment variables
- Permission-controlled updates
- Used for default layout/theme settings

#### PersonAccess & TownAccess Models
- Granular permission control
- Access levels: read, write, admin (hierarchical)
- Links users to specific persons/towns
- Enables fine-grained access control

#### FamilyPrivacySettings Model
- Per-person privacy preferences
- Notification settings
- Authorized email list
- Default comment visibility

### Slug System
- Automatic URL-friendly slug generation
- Uses nanoid for uniqueness (4-char suffix)
- Format: firstname_middlename_lastname_xxxx
- Handles special characters and accents
- Ensures uniqueness across persons/towns

### Image Processing Configuration
- Configurable via environment variables:
  - IMAGE_FULL_MAX_SIZE (default: 1200px)
  - IMAGE_FULL_QUALITY (default: 85)
  - IMAGE_THUMBNAIL_SIZE (default: 300px)
  - IMAGE_THUMBNAIL_QUALITY (default: 80)
- Automatic EXIF orientation correction
- JPEG output format for all images

### GDPR Compliance Features
- Cookie consent banner (optional via NEXT_PUBLIC_ENABLE_COOKIE_BANNER)
- Three-button design: Accept All, Reject All, Manage Preferences
- Cookie categories: Necessary, Analytics, Marketing
- Preferences stored in localStorage
- No cookies loaded before consent
- Privacy Policy page with legal compliance language

### Code of Conduct
- Comprehensive community guidelines
- Zero tolerance for hate speech and personal attacks
- Clear reporting procedures
- Enforcement framework with graduated responses
- Appeals process
- Accessible from all pages via footer

## User Experience Requirements

### Public Interface
- Clean, accessible design focused on advocacy
- Mobile-responsive layout
- Fast loading times
- Intuitive navigation
- Clear call-to-action for support
- Anonymous participation options
- Multi-language support considerations
- Share buttons for social media advocacy

### Admin Interface
- Professional dashboard design
- Efficient data management grids
- Quick search and filter capabilities
- Bulk operations support
- User-friendly image handling

### Form Interactions
- Real-time validation feedback
- Progress indicators for uploads
- Clear error messages
- Auto-save capabilities
- Accessibility compliance

## Development Phases

### Phase 1: Core Infrastructure
- Database setup and models
- Authentication system
- Basic town and person management
- Seed data implementation

### Phase 2: Public Interface
- Town/person public pages
- Comment submission system
- File upload functionality
- Theme and layout system

### Phase 3: Admin Interface
- Comprehensive admin dashboard
- User management system
- Content moderation tools
- Reporting capabilities

### Phase 4: Enhancement & Optimization
- Performance optimization
- Advanced search features
- Analytics integration
- Mobile app considerations

## Seed Data Requirements

### Towns
- 5 real California towns with complete information
- Geographic diversity representation
- Sample addresses and descriptions

### Persons
- 2-5 persons per town (10-25 total)
- Diverse demographic representation
- Complete profile information
- Encoded image placeholders*1

### Stories
- Comprehensive multi-language stories for each person
- All three story types (personal, detention, family) where applicable
- Primary support for English and Spanish
- Rich, authentic narratives that reflect real experiences
- Stories should be culturally appropriate and respectful
- Borrego Springs persons should have particularly detailed stories as the featured town

### Comments
- 5-15 comments per person (50-375 total)
- Varied privacy levels
- Sample attachments and verification docs
- Realistic engagement patterns

### Users
- Admin users for each role type
- Town-specific administrators
- Person-specific coordinators
- Test accounts for development

## Technical Implementation Notes

### Environment Variables*2
- Version tracking integration
- Configuration management
- Security key storage
- Database connection strings
- Authentication overrides:
  - SYSTEM_USERNAME_OVERRIDE
  - SYSTEM_PASSWORD_OVERRIDE
- Site access control:
  - SITE_BLOCK_USERNAME
  - SITE_BLOCK_PASSWORD
- Default navigation:
  - TOWN_DEFAULT
  - USER_DEFAULT
- System defaults:
  - SYSTEM_DEFAULT_LAYOUT
  - SYSTEM_DEFAULT_THEME
- External integrations:
  - GITHUB_REPO_URL

### Docker Configuration*3
- Version-aware builds
- Environment variable injection
- Production-ready setup
- Health check implementation

### Image Handling
- Thumbnail generation
- File size optimization
- Secure upload processing
- Storage path management

### Database Relationships
- Proper foreign key constraints
- Cascade delete/update rules
- Referential integrity enforcement
- Performance indexing

---

## Implementation Code Examples

*Note: All code examples have been moved to the CODE_EXAMPLES.md file for better organization and maintainability.*

## Layout and Theme System

### Overview
The application provides a flexible layout and theme system that allows for customization of how detained person profiles are displayed. Each town and person can have their own layout and theme, with system-wide defaults that can be overridden. System and town administrators can modify themes in real-time through an on-page UI, with changes persisting at the appropriate level (system-wide or town-specific).

### Layout System Requirements

#### Available Layout Templates
1. **Grid Layout** - Two or three column responsive grid
2. **Stack Layout** - Vertical stacked sections
3. **Hero Layout** - Large hero image with content below
4. **Sidebar Left** - Main content with left sidebar
5. **Sidebar Right** - Main content with right sidebar
6. **Magazine Layout** - Magazine-style multi-column
7. **Card Layout** - Card-based component layout
8. **Minimal Layout** - Clean, minimal design
9. **Gallery Layout** - Photo gallery focused
10. **Full Width Layout** - Edge-to-edge content

#### Layout Components
- **hero-image** - Full-width hero image section
- **image** - Standard image display
- **info** - Detained person information details
- **detention-info** - Detention center and case details
- **story** - Story/description content (HTML from WYSIWYG)
- **comments** - Support messages and testimonials section
- **advocacy-actions** - Call-to-action buttons for support
- **basic-info** - Name and location
- **sidebar-info** - Condensed info for sidebars
- **main-content** - Primary content area
- **gallery-grid** - Multi-image gallery

#### Layout Features
- JSON-based template configuration
- Drag-and-drop section ordering (future)
- Responsive breakpoints for all layouts
- Live preview in admin interface
- Per-town and per-person assignment

### Theme System Requirements

#### Theme Components
1. **Color Palette**
   - Primary color
   - Secondary color
   - Accent color
   - Background color
   - Text color
   - Additional custom colors

2. **CSS Custom Properties**
   - Generated CSS variables
   - Real-time preview
   - Theme inheritance system

3. **Preset Themes**
   - Default Blue
   - Ocean
   - Forest
   - Sunset
   - Night
   - Warm
   - Cool
   - Earth
   - Sky
   - Custom themes

#### Theme Features
- Color picker interface
- Live theme preview
- CSS variable generation
- Theme active/inactive states
- Per-town and per-person assignment

### System Configuration

#### Environment Variables
Configuration includes visual defaults, authentication overrides, site protection settings, and external service keys. See CODE_EXAMPLES.md for the complete environment variable configuration.

#### Admin Override Capability
- System admins can override environment defaults
- Runtime configuration without deployment
- Stored in database configuration table

#### Footer Display
- Shows current layout and theme names
- Editable inline by admins
- Displays town-specific settings when applicable
- Format: "Layout: [Name] | Theme: [Name] | Town: [Name]"

#### Live Theme Editor
- Accessible directly on main pages for admins
- Real-time color updates without page refresh
- Town admins can modify town-specific themes
- System admins can modify default themes
- Changes persist immediately to database
- Non-admins see themes but cannot edit

### Implementation Architecture

#### Database Schema Additions
The Layout, Theme, and SystemConfig models have been added to support visual customization. See CODE_EXAMPLES.md for the complete Prisma schema definitions.

#### Layout Renderer Component
- Dynamic component rendering based on template
- Theme CSS injection
- Responsive design support
- Section-based architecture

#### Admin Management
- CRUD operations for layouts and themes
- Grid-based listing with preview
- Drag-and-drop template builder (future)
- Import/export functionality (future)

### User Experience

#### Public Interface
- Seamless theme application
- Fast layout switching
- Mobile-optimized rendering
- Accessibility maintained across all layouts

#### Admin Interface
- Visual layout builder
- Real-time preview
- Theme color picker
- Usage statistics per layout/theme

### Security Considerations
- Sanitize CSS input to prevent injection
- Validate JSON template structure
- Restrict file uploads for preview images
- Audit trail for configuration changes

## Build Information and Configuration Management

### Overview
The application maintains build information and environment configuration that needs to be accessible for debugging, monitoring, and operational purposes. This includes version numbers, build dates, and other configuration values that should be transparently available.

### Build Information Requirements

1. **Version Tracking**
   - Maintain a build version number that increments with each Docker build
   - Store the build date in both human-readable and ISO formats
   - Make version information available throughout the application

2. **Public Configuration Page**
   - Accessible at `/configs` without authentication
   - Displays non-sensitive configuration values
   - Shows current build version and date
   - Lists feature flags and public configuration
   - Shows GitHub repository URL
   - Admin-only health check features:
     - Redis connectivity and performance test
     - Prisma database connectivity test

3. **Build Process Integration**
   - Docker build process reads from `baseversion` file
   - Automatically increments version number
   - Generates timestamps at build time
   - Injects values into environment

### Implementation Details

#### Configuration Display Page
The configuration page displays build information, feature flags, and health checks. Admin users see additional system information including Redis and database status. See CODE_EXAMPLES.md for the complete implementation including the ConfigsPage component and getPublicConfig server function.

### Security Considerations

1. **No Sensitive Data**: The configs page must never display:
   - Database connection strings
   - API keys or secrets
   - Authentication tokens
   - Internal system paths

2. **Public Access**: The page is publicly accessible but should:
   - Not allow any modifications
   - Rate limit requests to prevent abuse
   - Cache responses for performance

3. **Version Control**: The `baseversion` file should be:
   - Committed to version control
   - Updated manually for major releases
   - Auto-incremented for builds

### Operational Benefits

1. **Debugging**: Quickly verify which version is deployed
2. **Support**: Users can report issues with specific version numbers
3. **Monitoring**: External monitoring can check version endpoints
4. **Compliance**: Transparent display of system configuration
5. **Health Monitoring**: Admin-only connectivity tests for Redis and database

## System Health Checks

### Overview
The application includes built-in health check functionality accessible through the `/configs` page for administrators, providing real-time connectivity and performance testing.

### Redis Health Check
**Purpose**: Verify Redis connectivity and measure performance

**Test Operations**:
1. Establish connection using lazy loading pattern
2. Write 5 test keys with unique IDs and 60-second TTL
3. Read all 5 keys back
4. Delete all test keys
5. Measure each operation's duration

**Key Pattern**: `health:test:{timestamp}:{index}`

**Metrics Displayed**:
- Connection status (success/failure)
- Write operation time (ms)
- Read operation time (ms)
- Delete operation time (ms)
- Total operation time (ms)
- Error details if connection fails

### Database Health Check
**Purpose**: Verify Prisma/MySQL connectivity and performance

**Test Operations**:
1. Create a record in HealthCheck table
2. Read the record by ID
3. Update the record with new timestamp
4. Delete the record
5. Measure each operation's duration

**HealthCheck Table Structure**:
- Minimal table used only for connectivity testing
- Contains id, testData, and timestamps
- Records are immediately deleted after testing

**Metrics Displayed**:
- Connection status (success/failure)
- Create operation time (ms)
- Read operation time (ms)
- Update operation time (ms)
- Delete operation time (ms)
- Total operation time (ms)
- Database type and version

## Additional Features and Requirements

### Admin Interface Documentation
Each admin section must include:
- **Help Section**: A clearly marked "Notes" box below each grid
- **Icon Legend**: 
  - 👁️ Eye icon: View details or related items
  - 🗑️ Trash icon: Delete with confirmation
  - ✏️ Edit icon: Navigate to edit form
  - ➕ Plus icon: Add new item
- **Interactive Elements**: Document which columns are clickable
- **Tooltips**: Hover information for complex features

### Anonymous Comment Flow *(IMPLEMENTED)*
1. **Initial Submission**:
   - No authentication required
   - Required fields: First name, Last name
   - Optional fields: Email, Phone, Comment message
   - Three support preference checkboxes
   - Form validation with clear error messages
   - No reCAPTCHA *(not implemented)*

2. **Admin Moderation**:
   - All comments start as unapproved
   - Admin sees pending comments in moderation interface
   - Can edit comment content before approval
   - Must provide moderator notes for rejection
   - Approval updates timestamp and approver ID

3. **Public Display**:
   - Only approved comments shown on person's page
   - Comments display commenter's name
   - Support preferences respected
   - Comment count includes only approved comments

4. **Data Storage**:
   - All commenter information stored in Comment model
   - No user account association
   - Complete audit trail with moderator actions

### WYSIWYG Editor Requirements
- **Editor**: TinyMCE
- **Features**:
  - Bold, italic, underline, strikethrough
  - Headers (H1-H3)
  - Lists (ordered/unordered)
  - Links with target options
  - Image embedding
  - Video embedding (YouTube/Vimeo)
  - Tables
  - Code blocks
- **HTML Mode**: Toggle to edit raw HTML
- **Sanitization**: Clean HTML before storage
- **Preview**: Side-by-side or toggle preview

### Detention Center Web Scraping
- **Source**: ICE Detention Facility Locator
- **Admin Interface**:
  - "Import Detention Centers" button
  - State selection dropdown
  - "Import All" option
  - Progress bar during import
  - Results summary (added/updated/skipped)
- **Data Captured**:
  - Facility name and type
  - Complete address
  - Phone numbers
  - Operated by (ICE/Private)
  - Facility images if available

### Theme Editor UI
- **Access**: Button on main page (admin only)
- **Interface**:
  - Color pickers for each theme color
  - Live preview panel
  - Save/Cancel buttons
  - Reset to defaults option
- **Scope Management**:
  - Town admins edit town themes
  - System admins edit default themes
  - Clear indication of current scope

### Environment Variable Priority
1. **System Overrides** (highest priority):
   - SYSTEM_USERNAME_OVERRIDE
   - SYSTEM_PASSWORD_OVERRIDE
2. **Site Protection**:
   - SITE_BLOCK_USERNAME
   - SITE_BLOCK_PASSWORD
3. **Navigation Defaults**:
   - TOWN_DEFAULT
   - USER_DEFAULT
4. **Visual Defaults**:
   - SYSTEM_DEFAULT_LAYOUT
   - SYSTEM_DEFAULT_THEME
5. **Database Config** (lowest priority)

### Security Implementation Notes
- Override credentials never shown in UI
- Site block presents before any other auth
- All auth checks server-side
- Environment variables take precedence over database

### Temporary Storage Implementation

#### Storage Strategy
The application uses a dual approach for temporary data:

1. **Default: React State**
   - Used when Redis not configured
   - In-memory storage during user session
   - No persistence across page refreshes
   - Suitable for draft comments and temporary forms

2. **Preferred: Redis** (when available)
   - Enabled when REDIS_HOST is provided
   - Session ID-based keys for isolation
   - 1-hour TTL (3600 seconds) for all temporary data
   - Manual deletion when data is consumed
   - No cleanup jobs needed - Redis handles expiration automatically

#### Redis Connection Implementation
Redis connection is established using ioredis with lazy connection, retry strategies, and error handling. See CODE_EXAMPLES.md for the complete implementation.

#### Environment Variables
Redis and image upload configuration is managed through environment variables. See CODE_EXAMPLES.md for the complete configuration.

### Image Upload Configuration

#### Overview
The application supports configurable image upload and storage limits at multiple levels, with environment variables providing system-wide defaults.

#### Configuration Levels

1. **System Level** (Environment Variables):
   - `IMAGE_UPLOAD_MAX_SIZE_MB`: Maximum file size for uploads (default: 10MB)
   - `IMAGE_STORAGE_MAX_SIZE_KB`: Maximum file size for storage (default: 200KB)
   - Applied globally unless overridden

2. **Town Level** (Database):
   - Town-specific upload and storage limits
   - Configured by system admins
   - Overrides system defaults for users in that town

3. **User Level** (Database):
   - Individual user upload and storage limits
   - Configured by system admins
   - Can be more or less restrictive than town/system limits

#### Limit Application
When multiple limits exist, the **most restrictive** limit applies. See CODE_EXAMPLES.md for the implementation details.

#### Image Processing Pipeline
1. **Upload Validation**: 
   - Check file size against effective upload limit
   - Validate file type (JPEG, PNG, WebP)
   - Reject if over limit

2. **Temporary Storage**: 
   - Save original to `/uploads/temp/`
   - Generate unique filename

3. **Processing**:
   - If image exceeds storage limit, resize proportionally
   - Convert to WebP for optimal compression
   - Maintain aspect ratio
   - Generate thumbnail (max 50KB)

4. **Final Storage**:
   - Move processed image to final location
   - Update database with file paths

5. **Cleanup**:
   - Delete temporary files
   - Log processing metrics

#### Special Cases
- **Detention Center Images**: Fixed 50KB limit (not configurable)
- **Thumbnails**: Always max 50KB regardless of storage limit
- **Profile Pictures**: Subject to configured limits

#### Environment Variables
Image upload and storage limits are configured through environment variables. See CODE_EXAMPLES.md for the complete configuration.

#### Security Considerations
- No browser localStorage usage
- Session-scoped access only
- Redis: Automatic expiration (1 hour)
- React state: Cleared on navigation/refresh

#### Redis Key Patterns
Redis uses structured key patterns for comment drafts and login flows with 1-hour TTL. See CODE_EXAMPLES.md for the complete implementation.

#### React State Example
When Redis is unavailable, the system falls back to React state. See CODE_EXAMPLES.md for the implementation.