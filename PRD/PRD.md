# Bring Me Home - Product Requirements Document

## Executive Summary

The "Bring Me Home" application is a web-based platform designed to help families connect with missing persons and facilitate the process of reuniting families. The application will feature town-based organization, person profiles, community engagement through comments and photo sharing, and a comprehensive admin system for managing content and users.

## Core Features

### 1. User Authentication & Authorization
- Username/password authentication
- Role-based access control (Site Admin, Town Admin, Person Admin)
- Multi-town and multi-person assignments for users
- Read-only vs. edit access permissions
- Secure session management

### 2. Town & Person Management
- Town-based organization with dedicated URLs (e.g., `/borrego-springs/fidel`)
- Person profiles with detailed information
- Image management (primary + up to 3 secondary photos)
- Story and description content
- Contact information and identification details

### 3. Community Engagement
- Public comment system with file upload capabilities
- Form submission with identity verification options
- Photo and video attachment support
- Privacy controls (public, family-only, officials-only)
- Anonymous participation options

### 4. Visual Customization
- 10 selectable layout templates
- 10 color theme options
- Town-specific and system-wide defaults
- Responsive design for all screen sizes
- Custom theme creation with color picker
- Real-time layout and theme preview
- Environment variable defaults for system-wide settings

### 5. Admin Interface
- Grid-based management for all models
- Sort, filter, edit, delete, and insert capabilities
- Image thumbnail previews with full-size viewing
- File size display in user-friendly format
- Pagination with configurable row counts (default: 100)
- Role-based section grouping

## Technical Requirements

### Platform & Framework
- **Frontend**: Next.js 15 with TypeScript
- **Component Architecture**: Client-side components only
- **Styling**: TailwindCSS for responsive design
- **Database**: MySQL with Prisma ORM
- **Validation**: Zod schemas for client and server
- **File Storage**: Image and video upload support

### Database Schema
- **Users**: Authentication and role management
- **Towns**: Geographic organization units
- **Persons**: Individual profiles to be found
- **Comments**: Community engagement records
- **Roles**: Permission-based access control
- **Layouts**: Visual theme templates
- **Themes**: Color scheme definitions

### Security & Compliance
- React Server Functions for all database operations
- Input validation on both client and server
- Proper authentication checks for all routes
- CSRF protection and secure headers
- Data privacy controls and consent management

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

### Town Admin
- Assigned to specific towns
- Full access to assigned town's persons
- Comment moderation for assigned areas
- Local settings management

### Person Admin
- Assigned to specific persons
- Profile management for assigned persons
- Comment monitoring and response
- Family communication coordination

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
- ID (string GUID)
- First name
- Middle name
- Last name
- Alien ID number
- US Address (full)
- Primary picture (image)
- Secondary pictures (up to 3)
- Story/description
- Associated town
- Admin users
- Created/updated timestamps

### Comment Model
- ID (string GUID)
- Person ID (foreign key)
- Submitter information (optional)
- Comment text
- Attached files (up to 3 images)
- Privacy level (public/family/officials)
- Identity verification attachments
- Approval status
- Created/updated timestamps

## User Experience Requirements

### Public Interface
- Clean, accessible design
- Mobile-responsive layout
- Fast loading times
- Intuitive navigation
- Clear call-to-action buttons

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

### *1 Image Encoding System
```typescript
// Image placeholder encoding for seed data
interface ImagePlaceholder {
  id: string;
  encoding: string; // Base64 or placeholder identifier
  description: string;
  type: 'primary' | 'secondary';
}

const sampleImagePlaceholders: ImagePlaceholder[] = [
  {
    id: '1',
    encoding: 'PERSON_PLACEHOLDER_001',
    description: 'Primary photo - Male, 30s, brown hair',
    type: 'primary'
  },
  {
    id: '2',
    encoding: 'PERSON_PLACEHOLDER_002',
    description: 'Secondary photo - Same person, different angle',
    type: 'secondary'
  }
];
```

### *2 Environment Variables Handler
```typescript
// Environment variables context provider
interface EnvConfig {
  RELEASEVERSION: string;
  RELEASEDATE: string;
  RELEASEDATEISO: string;
  DATABASE_URL: string;
  NEXTAUTH_URL: string;
  ADMIN_EMAIL: string;
  // Add more as needed
}

export const getServerEnvironment = (): EnvConfig => {
  return {
    RELEASEVERSION: process.env.RELEASEVERSION || '0',
    RELEASEDATE: process.env.RELEASEDATE || '',
    RELEASEDATEISO: process.env.RELEASEDATEISO || '',
    DATABASE_URL: process.env.DATABASE_URL || '',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || '',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || '',
  };
};
```

### *3 Docker Configuration
```dockerfile
# Use official node runtime as parent image
FROM node:20-alpine

# Create app directory
RUN mkdir -p /usr/src
WORKDIR /usr/src

COPY package.json /usr/src/
COPY package-lock.json /usr/src/

RUN npm install

# Bundle app source
COPY . /usr/src

# Generate version information
RUN if [ -f ./baseversion ]; then \
         RELEASEVERSION=$(($(cat ./baseversion) + 0)); \
     else \
         RELEASEVERSION=0; \
     fi \
     && RELEASEDATE=$(date "+%a %b %d %T %Y") \
     && RELEASEDATEISO=$(date -u "+%Y-%m-%dT%H:%M:%SZ") \
     && echo "RELEASEVERSION=$RELEASEVERSION" > ./.env.production \
     && echo "RELEASEDATE=$RELEASEDATE" >> ./.env.production \
     && echo "NEXT_PUBLIC_RELEASEDATE=$RELEASEDATE" >> ./.env.production \
     && echo "RELEASEDATEISO=$RELEASEDATEISO" >> ./.env.production

RUN npm run build
EXPOSE 3000

CMD ["npm", "start"]
```

### *4 Database Schema Examples
```typescript
// Prisma schema models
model User {
  id          String   @id @default(cuid())
  username    String   @unique
  email       String?
  password    String
  roles       UserRole[]
  townAccess  TownAccess[]
  personAccess PersonAccess[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Town {
  id          String   @id @default(cuid())
  name        String
  state       String
  address     String
  description String?
  persons     Person[]
  adminUsers  TownAccess[]
  layoutId    String?
  themeId     String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Person {
  id              String   @id @default(cuid())
  firstName       String
  middleName      String?
  lastName        String
  alienIdNumber   String?
  usAddress       String
  primaryPicture  String?
  secondaryPics   String[]
  story           String?
  townId          String
  town            Town     @relation(fields: [townId], references: [id])
  comments        Comment[]
  adminUsers      PersonAccess[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### *5 Zod Validation Schemas
```typescript
import { z } from 'zod';

export const PersonSchema = z.object({
  id: z.string().cuid().optional(),
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  alienIdNumber: z.string().optional(),
  usAddress: z.string().min(10, 'Valid US address required'),
  primaryPicture: z.string().url().optional(),
  secondaryPics: z.array(z.string().url()).max(3),
  story: z.string().optional(),
  townId: z.string().cuid(),
});

export const CommentSchema = z.object({
  id: z.string().cuid().optional(),
  personId: z.string().cuid(),
  submitterName: z.string().optional(),
  submitterEmail: z.string().email().optional(),
  content: z.string().min(1, 'Comment content is required'),
  attachments: z.array(z.string().url()).max(3),
  privacyLevel: z.enum(['public', 'family', 'officials']),
  verified: z.boolean().default(false),
});
```

## Layout and Theme System

### Overview
The application provides a flexible layout and theme system that allows for customization of how missing person profiles are displayed. Each town and person can have their own layout and theme, with system-wide defaults that can be overridden.

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
- **info** - Person information details
- **story** - Story/description content
- **comments** - Comment section
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
```
SYSTEM_DEFAULT_LAYOUT=grid
SYSTEM_DEFAULT_THEME=default
```

#### Admin Override Capability
- System admins can override environment defaults
- Runtime configuration without deployment
- Stored in database configuration table

#### Footer Display
- Shows current layout and theme names
- Editable inline by admins
- Displays town-specific settings when applicable
- Format: "Layout: [Name] | Theme: [Name] | Town: [Name]"

### Implementation Architecture

#### Database Schema Additions
```prisma
model Layout {
  id          String   @id @default(cuid())
  name        String
  description String?
  template    String   // JSON configuration
  previewImage String?
  isActive    Boolean  @default(true)
  isSystem    Boolean  @default(false)
  towns       Town[]
  persons     Person[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Theme {
  id          String   @id @default(cuid())
  name        String
  description String?
  colors      String   // JSON color configuration
  cssVars     String?  // Generated CSS
  previewImage String?
  isActive    Boolean  @default(true)
  isSystem    Boolean  @default(false)
  towns       Town[]
  persons     Person[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model SystemConfig {
  id    String @id @default(cuid())
  key   String @unique
  value String
  type  String // 'string', 'number', 'boolean', 'json'
}
```

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

3. **Build Process Integration**
   - Docker build process reads from `baseversion` file
   - Automatically increments version number
   - Generates timestamps at build time
   - Injects values into environment

### Implementation Details

#### Configuration Display Page
```typescript
// src/app/configs/page.tsx
export default async function ConfigsPage() {
  const config = await getPublicConfig();
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1>System Configuration</h1>
      <section>
        <h2>Build Information</h2>
        <dl>
          <dt>Version</dt>
          <dd>{config.releaseVersion}</dd>
          <dt>Build Date</dt>
          <dd>{config.releaseDate}</dd>
          <dt>Build Date ISO</dt>
          <dd>{config.releaseDateISO}</dd>
        </dl>
      </section>
      <section>
        <h2>Feature Flags</h2>
        {/* Display feature flags */}
      </section>
      <section>
        <h2>Public Configuration</h2>
        {/* Display public config values */}
      </section>
    </div>
  );
}
```

#### Server Function for Public Config
```typescript
// src/app/actions/config.ts
'use server';

export async function getPublicConfig() {
  return {
    // Build information
    releaseVersion: process.env.RELEASEVERSION || '0',
    releaseDate: process.env.RELEASEDATE || 'Not set',
    releaseDateISO: process.env.RELEASEDATEISO || 'Not set',
    publicReleaseDate: process.env.NEXT_PUBLIC_RELEASEDATE || 'Not set',
    
    // Environment info
    environment: process.env.NODE_ENV || 'development',
    
    // Feature flags
    features: {
      videoSupport: false,
      bulkOperations: true,
      advancedSearch: false,
    },
    
    // Public limits
    limits: {
      maxFileUploadSize: '5MB',
      allowedImageTypes: ['JPEG', 'PNG', 'WebP'],
      commentsPerPage: 10,
      personsPerPage: 20,
    },
    
    // System info
    nodeVersion: process.version,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}
```

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