# Database Schema Design

## Prisma Schema Definition

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// User Authentication and Authorization
model User {
  id          String   @id @default(cuid())
  username    String   @unique
  email       String?  @unique
  password    String
  firstName   String?
  lastName    String?
  isActive    Boolean  @default(true)
  lastLogin   DateTime?
  
  // Image upload limits (overrides system/town defaults)
  imageUploadMaxSizeMB  Int?  // Max upload size in MB
  imageStorageMaxSizeKB Int?  // Max storage size in KB
  
  // Role relationships
  userRoles   UserRole[]
  
  // Access relationships
  townAccess  TownAccess[]
  personAccess PersonAccess[]
  
  // Audit fields
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("users")
}

// Role definitions
model Role {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  permissions String   @db.Text // JSON string of permissions
  
  // Relationships
  userRoles   UserRole[]
  
  // Audit fields
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("roles")
}

// Many-to-many relationship between Users and Roles
model UserRole {
  id     String @id @default(cuid())
  userId String
  roleId String
  
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  role   Role   @relation(fields: [roleId], references: [id], onDelete: Cascade)
  
  // Audit fields
  createdAt DateTime @default(now())
  
  @@unique([userId, roleId])
  @@map("user_roles")
}

// Detention Center model
model DetentionCenter {
  id              String   @id @default(cuid())
  name            String
  address         String   @db.Text
  city            String
  state           String
  zipCode         String
  phone           String?
  imageUrl        String?
  capacity        Int?
  currentCount    Int?     // Admin only field
  facilityType    String?  // Federal, Contract, etc.
  operatedBy      String?  // ICE, Private company name
  
  // Note: Images stored in /public/images/detention-centers/
  // Format: [facility-slug].webp (max 50KB)
  // Thumbnails: [facility-slug]-thumb.webp (max 20KB)
  
  // Relationships
  detainees       Person[]
  
  // Audit fields
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([state])
  @@index([city])
  @@map("detention_centers")
}

// Town model
model Town {
  id          String   @id @default(cuid())
  name        String
  state       String
  county      String?
  zipCode     String?
  fullAddress String   @db.Text
  description String?  @db.Text
  
  // Geography
  latitude    Float?
  longitude   Float?
  
  // Image upload limits (overrides system defaults)
  imageUploadMaxSizeMB  Int?  // Max upload size in MB
  imageStorageMaxSizeKB Int?  // Max storage size in KB
  
  // Customization
  defaultLayoutId String?
  defaultThemeId  String?
  
  // Relationships
  persons     Person[]
  townAccess  TownAccess[]
  layout      Layout?  @relation(fields: [defaultLayoutId], references: [id])
  theme       Theme?   @relation(fields: [defaultThemeId], references: [id])
  
  // Audit fields
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("towns")
}

// Person model - the core entity
model Person {
  id              String   @id @default(cuid())
  firstName       String
  middleName      String?
  lastName        String
  
  // Identification
  alienIdNumber   String?
  ssn             String?  // Should be encrypted
  dateOfBirth     DateTime?
  placeOfBirth    String?
  
  // Physical characteristics
  height          String?
  weight          String?
  eyeColor        String?
  hairColor       String?
  
  // Address information
  usAddress       String   @db.Text
  homeCountryAddress String? @db.Text // e.g., address in Mexico
  
  // Contact information
  phoneNumber     String?
  emailAddress    String?
  
  // Detention information
  detentionCenterId String?
  detentionDate   DateTime?
  caseNumber      String?
  bondAmount      Decimal? @db.Decimal(10, 2)
  legalRepName    String?
  legalRepPhone   String?
  
  // Media - stored as file paths or URLs
  primaryPicture  String?
  secondaryPic1   String?
  secondaryPic2   String?
  secondaryPic3   String?
  
  // Story and description
  storyHtml       String?  @db.Text // HTML from WYSIWYG editor
  storyPlainText  String?  @db.Text // Plain text version for search
  
  // Status
  isActive        Boolean  @default(true)
  status          String   @default("detained") // detained, released, deported, in-proceedings
  releaseDate     DateTime?
  deportationDate DateTime?
  
  // Privacy settings (JSON object)
  privacySettings String?  @db.Text
  
  // Customization
  layoutId        String?
  themeId         String?
  
  // Relationships
  townId          String
  town            Town     @relation(fields: [townId], references: [id], onDelete: Cascade)
  detentionCenter DetentionCenter? @relation(fields: [detentionCenterId], references: [id])
  layout          Layout?  @relation(fields: [layoutId], references: [id])
  theme           Theme?   @relation(fields: [themeId], references: [id])
  
  // Related entities
  comments        Comment[]
  personAccess    PersonAccess[]
  attachments     Attachment[]
  
  // Audit fields
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([townId])
  @@index([firstName, lastName])
  @@index([status])
  @@index([detentionCenterId])
  @@map("persons")
}

// Comment model for community engagement
model Comment {
  id              String   @id @default(cuid())
  content         String   @db.Text
  
  // Submitter information (optional for anonymous)
  submitterName   String?
  submitterEmail  String?  // Optional for all comments
  submitterPhone  String?
  isAnonymous     Boolean  @default(false)
  
  // reCAPTCHA validation
  recaptchaToken  String?  // Token from client-side validation
  
  // Session reference for Redis storage (if available)
  sessionId       String?  // Used for Redis key generation
  
  // Privacy controls
  privacyLevel    String   @default("public") // public, family, officials
  
  // Verification and moderation
  isVerified      Boolean  @default(false)
  isApproved      Boolean  @default(false)
  moderatorNotes  String?  @db.Text
  
  // Relationships
  personId        String
  person          Person   @relation(fields: [personId], references: [id], onDelete: Cascade)
  
  // Attachments
  attachments     Attachment[]
  
  // Audit fields
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([personId])
  @@index([privacyLevel])
  @@index([isApproved])
  @@map("comments")
}

// File attachments for comments and persons
model Attachment {
  id          String   @id @default(cuid())
  fileName    String
  originalName String
  mimeType    String
  fileSize    Int
  filePath    String
  
  // Metadata
  description String?
  isPublic    Boolean  @default(true)
  
  // Relationships (either comment or person, not both)
  commentId   String?
  personId    String?
  comment     Comment? @relation(fields: [commentId], references: [id], onDelete: Cascade)
  person      Person?  @relation(fields: [personId], references: [id], onDelete: Cascade)
  
  // Audit fields
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([commentId])
  @@index([personId])
  @@map("attachments")
}

// Town access control
model TownAccess {
  id          String   @id @default(cuid())
  userId      String
  townId      String
  accessLevel String   @default("read") // read, write, admin
  
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  town        Town     @relation(fields: [townId], references: [id], onDelete: Cascade)
  
  // Audit fields
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([userId, townId])
  @@map("town_access")
}

// Person access control
model PersonAccess {
  id          String   @id @default(cuid())
  userId      String
  personId    String
  accessLevel String   @default("read") // read, write, admin
  
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  person      Person   @relation(fields: [personId], references: [id], onDelete: Cascade)
  
  // Audit fields
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([userId, personId])
  @@map("person_access")
}

// Layout templates
model Layout {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  cssClasses  String?  @db.Text
  template    String   @db.Text // JSON or HTML template
  isActive    Boolean  @default(true)
  
  // Relationships
  towns       Town[]
  persons     Person[]
  
  // Audit fields
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("layouts")
}

// Color themes
model Theme {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  colors      String   @db.Text // JSON object with color definitions
  cssVars     String?  @db.Text // CSS custom properties
  isActive    Boolean  @default(true)
  
  // Relationships
  towns       Town[]
  persons     Person[]
  
  // Audit fields
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("themes")
}

// System configuration
model SystemConfig {
  id          String   @id @default(cuid())
  key         String   @unique
  value       String   @db.Text
  description String?
  dataType    String   @default("string") // string, number, boolean, json
  
  // Audit fields
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("system_config")
}

// Audit log for sensitive operations
model AuditLog {
  id          String   @id @default(cuid())
  userId      String?
  action      String
  entityType  String
  entityId    String?
  oldValues   String?  @db.Text
  newValues   String?  @db.Text
  ipAddress   String?
  userAgent   String?  @db.Text
  
  // Audit fields
  createdAt   DateTime @default(now())
  
  @@index([userId])
  @@index([entityType, entityId])
  @@index([createdAt])
  @@map("audit_log")
}
```

## Zod Validation Schemas

```typescript
// schemas/user.ts
import { z } from 'zod';

export const CreateUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  email: z.string().email('Invalid email format').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required').max(100).optional(),
  lastName: z.string().min(1, 'Last name is required').max(100).optional(),
  imageUploadMaxSizeMB: z.number().int().positive().optional(),
  imageStorageMaxSizeKB: z.number().int().positive().optional(),
});

export const UpdateUserSchema = CreateUserSchema.partial().omit({ password: true });

export const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
```

```typescript
// schemas/town.ts
import { z } from 'zod';

export const CreateTownSchema = z.object({
  name: z.string().min(1, 'Town name is required').max(100),
  state: z.string().min(2, 'State is required').max(50),
  county: z.string().max(100).optional(),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid zip code format').optional(),
  fullAddress: z.string().min(10, 'Full address is required').max(500),
  description: z.string().max(2000).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  imageUploadMaxSizeMB: z.number().int().positive().optional(),
  imageStorageMaxSizeKB: z.number().int().positive().optional(),
  defaultLayoutId: z.string().cuid().optional(),
  defaultThemeId: z.string().cuid().optional(),
});

export const UpdateTownSchema = CreateTownSchema.partial();

export type CreateTownInput = z.infer<typeof CreateTownSchema>;
export type UpdateTownInput = z.infer<typeof UpdateTownSchema>;
```

```typescript
// schemas/person.ts
import { z } from 'zod';

export const CreatePersonSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  middleName: z.string().max(100).optional(),
  lastName: z.string().min(1, 'Last name is required').max(100),
  alienIdNumber: z.string().max(50).optional(),
  ssn: z.string().regex(/^\d{3}-\d{2}-\d{4}$/, 'Invalid SSN format').optional(),
  dateOfBirth: z.date().optional(),
  placeOfBirth: z.string().max(200).optional(),
  height: z.string().max(20).optional(),
  weight: z.string().max(20).optional(),
  eyeColor: z.string().max(20).optional(),
  hairColor: z.string().max(20).optional(),
  usAddress: z.string().min(10, 'US address is required').max(500),
  homeCountryAddress: z.string().max(500).optional(),
  phoneNumber: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number').optional(),
  emailAddress: z.string().email('Invalid email format').optional(),
  
  // Detention information
  detentionCenterId: z.string().cuid().optional(),
  detentionDate: z.date().optional(),
  caseNumber: z.string().max(50).optional(),
  bondAmount: z.number().positive().optional(),
  legalRepName: z.string().max(100).optional(),
  legalRepPhone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number').optional(),
  
  // Media
  primaryPicture: z.string().url('Invalid image URL').optional(),
  secondaryPic1: z.string().url('Invalid image URL').optional(),
  secondaryPic2: z.string().url('Invalid image URL').optional(),
  secondaryPic3: z.string().url('Invalid image URL').optional(),
  
  // Story
  storyHtml: z.string().max(50000).optional(),
  storyPlainText: z.string().max(50000).optional(),
  
  // Status
  status: z.enum(['detained', 'released', 'deported', 'in-proceedings']).default('detained'),
  releaseDate: z.date().optional(),
  deportationDate: z.date().optional(),
  
  // Privacy
  privacySettings: z.string().optional(), // JSON string
  
  // Relations
  townId: z.string().cuid('Invalid town ID'),
  layoutId: z.string().cuid().optional(),
  themeId: z.string().cuid().optional(),
});

export const UpdatePersonSchema = CreatePersonSchema.partial();

export type CreatePersonInput = z.infer<typeof CreatePersonSchema>;
export type UpdatePersonInput = z.infer<typeof UpdatePersonSchema>;
```

```typescript
// schemas/comment.ts
import { z } from 'zod';

export const CreateCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(5000),
  submitterName: z.string().max(100).optional(),
  submitterEmail: z.string().email('Invalid email format').optional(),
  submitterPhone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number').optional(),
  isAnonymous: z.boolean().default(false),
  privacyLevel: z.enum(['public', 'family', 'officials']).default('public'),
  personId: z.string().cuid('Invalid person ID'),
  attachments: z.array(z.string().url('Invalid attachment URL')).max(3).optional(),
  recaptchaToken: z.string().optional(), // Required for anonymous comments on server
  tempData: z.string().optional(), // For preserving comment during login
});

// schemas/detentionCenter.ts
import { z } from 'zod';

export const CreateDetentionCenterSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  address: z.string().min(1, 'Address is required').max(500),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(50),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid zip code'),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number').optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
  capacity: z.number().int().positive().optional(),
  currentCount: z.number().int().min(0).optional(),
  facilityType: z.string().max(50).optional(),
  operatedBy: z.string().max(100).optional(),
});

export const UpdateDetentionCenterSchema = CreateDetentionCenterSchema.partial();

export type CreateDetentionCenterInput = z.infer<typeof CreateDetentionCenterSchema>;
export type UpdateDetentionCenterInput = z.infer<typeof UpdateDetentionCenterSchema>;

export const UpdateCommentSchema = CreateCommentSchema.partial();

export const ModerateCommentSchema = z.object({
  isApproved: z.boolean(),
  moderatorNotes: z.string().max(1000).optional(),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>;
export type ModerateCommentInput = z.infer<typeof ModerateCommentSchema>;
```

## Database Indexes and Performance

```sql
-- Additional indexes for performance
CREATE INDEX idx_persons_town_status ON persons(townId, status);
CREATE INDEX idx_comments_person_privacy ON comments(personId, privacyLevel);
CREATE INDEX idx_attachments_type ON attachments(mimeType);
CREATE INDEX idx_audit_log_date ON audit_log(createdAt);
CREATE INDEX idx_users_active ON users(isActive);
CREATE INDEX idx_temp_storage_expiry ON temp_storage(expiresAt);

-- Cleanup job for expired temporary storage
CREATE EVENT IF NOT EXISTS cleanup_temp_storage
ON SCHEDULE EVERY 1 HOUR
DO DELETE FROM temp_storage WHERE expiresAt < NOW();

-- Full-text search indexes
CREATE FULLTEXT INDEX idx_persons_search ON persons(firstName, lastName, story, circumstances);
CREATE FULLTEXT INDEX idx_comments_search ON comments(content);
```

## Seed Data Structure

```typescript
// seed/towns.ts
export const seedTowns = [
  {
    id: 'town_1',
    name: 'Borrego Springs',
    state: 'California',
    county: 'San Diego',
    zipCode: '92004',
    fullAddress: 'Borrego Springs, CA 92004, USA',
    description: 'A small desert town in San Diego County',
    latitude: 33.2553,
    longitude: -116.3747,
  },
  {
    id: 'town_2',
    name: 'Mendocino',
    state: 'California',
    county: 'Mendocino',
    zipCode: '95460',
    fullAddress: 'Mendocino, CA 95460, USA',
    description: 'A historic coastal town in Northern California',
    latitude: 39.3076,
    longitude: -123.7997,
  },
  // ... 3 more towns
];

// seed/detentionCenters.ts
export const seedDetentionCenters = [
  {
    id: 'detention_1',
    name: 'Adelanto ICE Processing Center',
    address: '10250 Rancho Rd',
    city: 'Adelanto',
    state: 'California',
    zipCode: '92301',
    phone: '(760) 561-6300',
    imageUrl: '/images/detention-centers/adelanto-ice-processing-center.webp',
    capacity: 1940,
    facilityType: 'Contract',
    operatedBy: 'GEO Group',
  },
  {
    id: 'detention_2',
    name: 'Imperial Regional Detention Facility',
    address: '1572 Gateway Rd',
    city: 'Calexico',
    state: 'California',
    zipCode: '92231',
    phone: '(760) 768-2137',
    capacity: 704,
    facilityType: 'Contract',
    operatedBy: 'Management & Training Corporation',
  },
  // ... more Southern California facilities
];

// seed/persons.ts
export const seedPersons = [
  {
    id: 'person_1',
    firstName: 'Fidel',
    middleName: 'Antonio',
    lastName: 'Rodriguez',
    alienIdNumber: 'A123456789',
    usAddress: '123 Desert View Dr, Borrego Springs, CA 92004',
    homeCountryAddress: 'Calle Principal 456, Tijuana, Baja California, Mexico',
    detentionCenterId: 'detention_1',
    detentionDate: new Date('2024-01-15'),
    caseNumber: 'SD-2024-001234',
    bondAmount: 15000,
    storyHtml: '<p>Fidel was detained during a workplace raid in Borrego Springs...</p>',
    townId: 'town_1',
    primaryPicture: 'PERSON_PLACEHOLDER_001',
    status: 'detained',
  },
  // ... more persons
];

// seed/comments.ts
export const seedComments = [
  {
    id: 'comment_1',
    content: 'Fidel is a valued member of our community who has lived here for 10 years...',
    submitterName: 'Community Member',
    submitterEmail: 'supporter@example.com',
    isAnonymous: false,
    privacyLevel: 'public',
    personId: 'person_1',
    isApproved: true,
  },
  {
    id: 'comment_2',
    content: 'I support Fidel\'s release. He has always been helpful to neighbors...',
    submitterEmail: 'anonymous@example.com',
    isAnonymous: true,
    privacyLevel: 'public',
    personId: 'person_1',
    isApproved: true,
  },
  // ... more comments
];
```

## Migration Strategy

1. **Initial Migration**: Create all tables with proper relationships
2. **Detention Center Migration**: Add DetentionCenter table and relationships
3. **Person Model Update**: 
   - Add detention-specific fields
   - Migrate address fields (lastKnownAddress → usAddress)
   - Add HTML story fields
   - Update status enum values
4. **Comment Model Update**: Add anonymous comment support fields
5. **Seed Migration**: 
   - Import detention centers from ICE website
   - Update person records with detention info
   - Add support comments
6. **Index Migration**: Add performance indexes for detention queries
7. **Constraint Migration**: Add additional constraints and triggers
8. **Audit Migration**: Set up audit logging triggers

## Security Considerations

- **Password Hashing**: Use bcrypt with salt rounds >= 12
- **Data Encryption**: Encrypt sensitive fields like SSN, case numbers
- **Access Control**: 
  - Implement row-level security for detention data
  - Town-based access restrictions for detainee information
  - Admin-only fields (currentCount in detention centers)
- **Privacy Controls**:
  - Field-level privacy settings in Person model
  - Anonymous comment protection via reCAPTCHA
  - No browser localStorage for sensitive data
  - Server-side temporary storage only
- **Authentication Overrides**:
  - Secure handling of SYSTEM_USERNAME_OVERRIDE
  - Never store override credentials in database
  - Hide from all UI displays
- **Audit Logging**: 
  - Track all detention record changes
  - Log access to sensitive detainee information
  - Monitor anonymous comment submissions
- **Input Validation**: 
  - Validate all inputs on both client and server
  - Sanitize HTML from WYSIWYG editor
  - Verify detention center data during import
- **SQL Injection Prevention**: Use parameterized queries only
- **Data Scraping Security**:
  - Validate scraped detention center data
  - Rate limit scraping operations
  - Verify data integrity before import