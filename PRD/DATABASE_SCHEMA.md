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
  lastKnownAddress String @db.Text
  currentAddress   String? @db.Text
  
  // Contact information
  phoneNumber     String?
  emailAddress    String?
  
  // Images - stored as file paths or URLs
  primaryPicture  String?
  secondaryPic1   String?
  secondaryPic2   String?
  secondaryPic3   String?
  
  // Story and description
  story           String?  @db.Text
  circumstances   String?  @db.Text
  lastSeenDate    DateTime?
  lastSeenLocation String?
  
  // Status
  isActive        Boolean  @default(true)
  isFound         Boolean  @default(false)
  status          String   @default("missing") // missing, found, deceased, etc.
  
  // Customization
  layoutId        String?
  themeId         String?
  
  // Relationships
  townId          String
  town            Town     @relation(fields: [townId], references: [id], onDelete: Cascade)
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
  @@map("persons")
}

// Comment model for community engagement
model Comment {
  id              String   @id @default(cuid())
  content         String   @db.Text
  
  // Submitter information (optional for anonymous)
  submitterName   String?
  submitterEmail  String?
  submitterPhone  String?
  isAnonymous     Boolean  @default(false)
  
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
  lastKnownAddress: z.string().min(10, 'Last known address is required').max(500),
  currentAddress: z.string().max(500).optional(),
  phoneNumber: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number').optional(),
  emailAddress: z.string().email('Invalid email format').optional(),
  primaryPicture: z.string().url('Invalid image URL').optional(),
  secondaryPic1: z.string().url('Invalid image URL').optional(),
  secondaryPic2: z.string().url('Invalid image URL').optional(),
  secondaryPic3: z.string().url('Invalid image URL').optional(),
  story: z.string().max(5000).optional(),
  circumstances: z.string().max(5000).optional(),
  lastSeenDate: z.date().optional(),
  lastSeenLocation: z.string().max(500).optional(),
  status: z.enum(['missing', 'found', 'deceased', 'other']).default('missing'),
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
});

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

// seed/persons.ts
export const seedPersons = [
  {
    id: 'person_1',
    firstName: 'Fidel',
    middleName: 'Antonio',
    lastName: 'Rodriguez',
    alienIdNumber: 'A123456789',
    lastKnownAddress: '123 Desert View Dr, Borrego Springs, CA 92004',
    story: 'Fidel was last seen at the local grocery store in Borrego Springs...',
    townId: 'town_1',
    primaryPicture: 'PERSON_PLACEHOLDER_001',
    status: 'missing',
  },
  // ... more persons
];

// seed/comments.ts
export const seedComments = [
  {
    id: 'comment_1',
    content: 'I saw someone matching this description at the gas station last week...',
    submitterName: 'Anonymous Helper',
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
2. **Seed Migration**: Populate with initial data
3. **Index Migration**: Add performance indexes
4. **Constraint Migration**: Add additional constraints and triggers
5. **Audit Migration**: Set up audit logging triggers

## Security Considerations

- **Password Hashing**: Use bcrypt with salt rounds >= 12
- **Data Encryption**: Encrypt sensitive fields like SSN
- **Access Control**: Implement row-level security where possible
- **Audit Logging**: Track all sensitive operations
- **Input Validation**: Validate all inputs on both client and server
- **SQL Injection Prevention**: Use parameterized queries only