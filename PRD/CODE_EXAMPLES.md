# Code Examples for Bring Me Home Application

This file contains code examples referenced in the Product Requirements Document and Implementation Plan. These examples demonstrate implementation patterns, database schemas, and configuration approaches used throughout the application.

## Table of Contents
1. [Database Schema Examples](#database-schema-examples)
2. [Image Encoding System](#image-encoding-system)
3. [Environment Variables Handler](#environment-variables-handler)
4. [Docker Configuration](#docker-configuration)
5. [Validation Schemas](#validation-schemas)
6. [Anonymous Comment Implementation](#anonymous-comment-implementation)
7. [Comment Moderation Enhancement](#comment-moderation-enhancement)
8. [Multi-Language Story Implementation](#multi-language-story-implementation)
9. [Person Visibility Management](#person-visibility-management)
10. [Public Page Visibility Filtering](#public-page-visibility-filtering)

---

## Database Schema Examples

### Complete Prisma Schema Models

```prisma
// User authentication and role management
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

// Town organization model
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
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// Detained person model with comprehensive tracking
model Person {
  id                   String         @id @default(cuid())
  firstName            String
  middleName           String?
  lastName             String
  alienIdNumber        String?
  detentionCenterId    String?
  detentionCenter      DetentionCenter? @relation(fields: [detentionCenterId], references: [id])
  dateDetained         DateTime?
  lastHeardFromDate    DateTime?
  notesFromLastContact String?        @db.Text
  bondAmount           Decimal?       @db.Decimal(10, 2)
  caseNumber           String?
  detentionStatus      String?        @default("detained")
  representedByLawyer  Boolean        @default(false)
  representedByNotes   String?        @db.Text
  usAddress            String?
  internationalAddress String?
  stories              Story[]        // Multi-language stories
  townId               String
  town                 Town           @relation(fields: [townId], references: [id])
  comments             Comment[]
  personImages         PersonImage[]
  adminUsers           PersonAccess[]
  isActive             Boolean        @default(true)
  createdAt            DateTime       @default(now())
  updatedAt            DateTime       @updatedAt
}

// Multi-language story support
model Story {
  id        String  @id @default(cuid())
  language  String  @default("en") // ISO 639-1 code
  storyType String  @default("personal") // personal, detention, family
  content   String  @db.Text
  isActive  Boolean @default(true)
  personId  String
  person    Person  @relation(fields: [personId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([personId, language, storyType])
  @@map("stories")
}

// Anonymous comment model
model Comment {
  id                     String    @id @default(cuid())
  personId               String
  person                 Person    @relation(fields: [personId], references: [id], onDelete: Cascade)
  
  // Anonymous commenter fields
  firstName              String?
  lastName               String?
  email                  String?
  phone                  String?
  
  // Support preferences
  wantsToHelpMore        Boolean   @default(false)
  displayNameOnly        Boolean   @default(false)
  requiresFamilyApproval Boolean   @default(true)
  
  content                String?   @db.Text
  type                   String    @default("support")
  visibility             String    @default("public")
  
  // Moderation fields
  isActive               Boolean   @default(true)
  isApproved             Boolean   @default(false)
  approvedAt             DateTime?
  approvedBy             String?
  moderatorNotes         String?   @db.Text
  
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt
  
  @@index([personId])
  @@index([isApproved, isActive])
  @@map("comments")
}
```

---

## Image Encoding System

### Image Placeholder Implementation for Seed Data

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

// Usage in seed data
async function seedPersonImages() {
  const placeholders = generatePlaceholderImages();
  
  for (const person of persons) {
    await prisma.personImage.create({
      data: {
        personId: person.id,
        imageUrl: placeholders.primary,
        isPrimary: true,
        isActive: true
      }
    });
  }
}
```

---

## Environment Variables Handler

### Server-side Environment Configuration

```typescript
// Environment variables context provider
interface EnvConfig {
  RELEASEVERSION: string;
  RELEASEDATE: string;
  RELEASEDATEISO: string;
  DATABASE_URL: string;
  NEXTAUTH_URL: string;
  ADMIN_EMAIL: string;
  SYSTEM_DEFAULT_LAYOUT: string;
  SYSTEM_DEFAULT_THEME: string;
  REDIS_HOST?: string;
  REDIS_PORT?: number;
  IMAGE_UPLOAD_MAX_SIZE_MB?: number;
  IMAGE_STORAGE_MAX_SIZE_KB?: number;
}

export const getServerEnvironment = (): EnvConfig => {
  return {
    RELEASEVERSION: process.env.RELEASEVERSION || '0',
    RELEASEDATE: process.env.RELEASEDATE || '',
    RELEASEDATEISO: process.env.RELEASEDATEISO || '',
    DATABASE_URL: process.env.DATABASE_URL || '',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || '',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || '',
    SYSTEM_DEFAULT_LAYOUT: process.env.SYSTEM_DEFAULT_LAYOUT || 'grid',
    SYSTEM_DEFAULT_THEME: process.env.SYSTEM_DEFAULT_THEME || 'default',
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
    IMAGE_UPLOAD_MAX_SIZE_MB: process.env.IMAGE_UPLOAD_MAX_SIZE_MB 
      ? parseInt(process.env.IMAGE_UPLOAD_MAX_SIZE_MB) : 10,
    IMAGE_STORAGE_MAX_SIZE_KB: process.env.IMAGE_STORAGE_MAX_SIZE_KB 
      ? parseInt(process.env.IMAGE_STORAGE_MAX_SIZE_KB) : 200,
  };
};
```

---

## Docker Configuration

### Production Docker Setup

```dockerfile
# Use official node runtime as parent image
FROM node:20-alpine

# Create app directory
RUN mkdir -p /usr/src
WORKDIR /usr/src

# Copy package files
COPY package.json /usr/src/
COPY package-lock.json /usr/src/

# Install dependencies
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

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
```

---

## Validation Schemas

### Zod Validation Schemas

```typescript
import { z } from 'zod';

// Person validation schema
export const PersonSchema = z.object({
  id: z.string().cuid().optional(),
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  alienIdNumber: z.string().optional(),
  dateDetained: z.date().optional(),
  lastHeardFromDate: z.date().optional(),
  notesFromLastContact: z.string().optional(),
  bondAmount: z.number().positive().optional(),
  caseNumber: z.string().optional(),
  representedByLawyer: z.boolean().default(false),
  representedByNotes: z.string().optional(),
  usAddress: z.string().min(10, 'Valid US address required'),
  internationalAddress: z.string().optional(),
  townId: z.string().cuid(),
  isActive: z.boolean().default(true),
});

// Anonymous comment validation schema
export const CommentSchema = z.object({
  id: z.string().cuid().optional(),
  personId: z.string().cuid(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  content: z.string().optional().or(z.literal('')),
  wantsToHelpMore: z.boolean().default(false),
  displayNameOnly: z.boolean().default(false),
  requiresFamilyApproval: z.boolean().default(true),
});

// Story validation schema
export const StorySchema = z.object({
  id: z.string().cuid().optional(),
  personId: z.string().cuid(),
  language: z.string().length(2, 'Language code must be 2 characters'),
  storyType: z.enum(['personal', 'detention', 'family']),
  content: z.string().min(1, 'Story content is required'),
  isActive: z.boolean().default(true),
});
```

---

## Anonymous Comment Implementation

### Comment Form Component

```typescript
// components/person/AnonymousCommentForm.tsx
'use client';

import { useFormState } from 'react-dom';
import { submitComment } from '@/app/actions/comments';

export default function AnonymousCommentForm({ personId }: { personId: string }) {
  const [state, formAction] = useFormState(submitComment, {
    success: false,
  });

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="personId" value={personId} />
      
      {/* Required Fields */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
            First Name *
          </label>
          <input 
            type="text" 
            id="firstName" 
            name="firstName" 
            required 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
            Last Name *
          </label>
          <input 
            type="text" 
            id="lastName" 
            name="lastName" 
            required 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>
      </div>

      {/* Optional Contact */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email (optional)
          </label>
          <input 
            type="email" 
            id="email" 
            name="email" 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone (optional)
          </label>
          <input 
            type="tel" 
            id="phone" 
            name="phone" 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>
      </div>

      {/* Message */}
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700">
          Your Message (optional)
        </label>
        <textarea 
          id="content" 
          name="content" 
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>
      
      {/* Support Preferences */}
      <div className="space-y-4">
        <label className="flex items-start">
          <input 
            type="checkbox" 
            name="wantsToHelpMore" 
            value="true" 
            className="mt-1 rounded border-gray-300"
          />
          <span className="ml-2 text-sm text-gray-700">
            I want to help more, please contact me
          </span>
        </label>
        <label className="flex items-start">
          <input 
            type="checkbox" 
            name="displayNameOnly" 
            value="true" 
            className="mt-1 rounded border-gray-300"
          />
          <span className="ml-2 text-sm text-gray-700">
            Display just my name as supporting
          </span>
        </label>
        <label className="flex items-start">
          <input 
            type="checkbox" 
            name="requiresFamilyApproval" 
            value="true" 
            defaultChecked
            className="mt-1 rounded border-gray-300"
          />
          <span className="ml-2 text-sm text-gray-700">
            Display my name and comment if family approves
          </span>
        </label>
      </div>

      <button 
        type="submit" 
        className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
      >
        Submit Support
      </button>

      {state.success && (
        <p className="text-green-600">Thank you for your support!</p>
      )}
      {state.error && (
        <p className="text-red-600">{state.error}</p>
      )}
    </form>
  );
}
```

---

## Comment Moderation Enhancement

### Moderation Modal Component

```typescript
// components/admin/CommentModerationModal.tsx
'use client';

import { useState } from 'react';
import { updateCommentAndApprove, rejectComment } from '@/app/actions/comments';

interface CommentModerationModalProps {
  comment: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    content: string | null;
    wantsToHelpMore: boolean;
    displayNameOnly: boolean;
    requiresFamilyApproval: boolean;
  };
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (commentId: string, isApproved: boolean) => void;
}

export default function CommentModerationModal({ 
  comment, 
  isOpen, 
  onClose,
  onUpdate 
}: CommentModerationModalProps) {
  const [content, setContent] = useState(comment.content || '');
  const [moderatorNotes, setModeratorNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await updateCommentAndApprove(
        comment.id,
        content,
        moderatorNotes
      );
      onUpdate(comment.id, true);
      onClose();
    } catch (error) {
      console.error('Failed to approve comment:', error);
    }
    setIsSubmitting(false);
  };

  const handleReject = async () => {
    if (!moderatorNotes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await rejectComment(comment.id, moderatorNotes);
      onUpdate(comment.id, false);
      onClose();
    } catch (error) {
      console.error('Failed to reject comment:', error);
    }
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Moderate Comment</h2>
        
        {/* Comment details */}
        <div className="space-y-4 mb-6">
          <div>
            <h3 className="font-semibold">Commenter Information</h3>
            <p>Name: {comment.firstName} {comment.lastName}</p>
            {comment.email && <p>Email: {comment.email}</p>}
            {comment.phone && <p>Phone: {comment.phone}</p>}
          </div>

          <div>
            <h3 className="font-semibold">Support Preferences</h3>
            <ul className="text-sm">
              {comment.wantsToHelpMore && <li>• Wants to help more</li>}
              {comment.displayNameOnly && <li>• Display name only</li>}
              {comment.requiresFamilyApproval && <li>• Requires family approval</li>}
            </ul>
          </div>
          
          <div>
            <label className="block font-semibold mb-2">Comment Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-32 p-2 border rounded-md"
              placeholder="No message provided - name only support"
            />
          </div>
          
          <div>
            <label className="block font-semibold mb-2">
              Moderator Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              value={moderatorNotes}
              onChange={(e) => setModeratorNotes(e.target.value)}
              placeholder="Required for rejection, optional for approval"
              className="w-full h-20 p-2 border rounded-md"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md hover:bg-gray-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleReject}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            disabled={isSubmitting}
          >
            Reject
          </button>
          <button
            onClick={handleApprove}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            disabled={isSubmitting}
          >
            Approve & Save
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Multi-Language Story Implementation

### Story Display Component

```typescript
// components/person/StorySection.tsx
'use client';

import { useState } from 'react';
import LanguageToggle from './LanguageToggle';

interface Story {
  id: string;
  language: string;
  storyType: string;
  content: string;
}

interface StorySectionProps {
  stories: Story[];
  storyType: 'personal' | 'detention' | 'family';
  title: string;
}

export default function StorySection({ 
  stories, 
  storyType, 
  title 
}: StorySectionProps) {
  // Filter stories by type
  const typeStories = stories.filter(s => s.storyType === storyType);
  const availableLanguages = [...new Set(typeStories.map(s => s.language))];
  
  const [selectedLanguage, setSelectedLanguage] = useState(
    availableLanguages.includes('en') ? 'en' : availableLanguages[0] || 'en'
  );
  
  const currentStory = typeStories.find(s => s.language === selectedLanguage);
  
  if (typeStories.length === 0) return null;
  
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          
          {availableLanguages.length > 1 && (
            <LanguageToggle
              languages={availableLanguages}
              selectedLanguage={selectedLanguage}
              onLanguageChange={setSelectedLanguage}
            />
          )}
        </div>
        
        {currentStory ? (
          <div className="prose max-w-none">
            {currentStory.content.split('\n').map((paragraph, index) => (
              <p key={index} className="mb-4">
                {paragraph}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">
            No {title.toLowerCase()} available in {getLanguageName(selectedLanguage)}.
          </p>
        )}
      </div>
    </div>
  );
}

function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    // Add more as needed
  };
  return languages[code] || code.toUpperCase();
}
```

### Multi-Language Story Editor

```typescript
// components/admin/MultiLanguageStoryEditor.tsx
'use client';

import { useState, useEffect } from 'react';
import { saveStory } from '@/app/actions/stories';

interface Story {
  id: string;
  language: string;
  storyType: string;
  content: string;
}

interface Props {
  personId: string;
  stories: Story[];
}

type StoryType = 'personal' | 'detention' | 'family';

export default function MultiLanguageStoryEditor({ 
  personId, 
  stories 
}: Props) {
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedType, setSelectedType] = useState<StoryType>('personal');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Load existing story when language/type changes
  useEffect(() => {
    const existingStory = stories.find(
      s => s.language === selectedLanguage && s.storyType === selectedType
    );
    setContent(existingStory?.content || '');
  }, [selectedLanguage, selectedType, stories]);
  
  const handleSave = async () => {
    setIsSaving(true);
    const formData = new FormData();
    formData.append('personId', personId);
    formData.append('language', selectedLanguage);
    formData.append('storyType', selectedType);
    formData.append('content', content);
    
    try {
      const result = await saveStory({}, formData);
      if (result.success) {
        alert('Story saved successfully');
      }
    } catch (error) {
      alert('Failed to save story');
    }
    setIsSaving(false);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <select 
          value={selectedLanguage} 
          onChange={(e) => setSelectedLanguage(e.target.value)}
          className="rounded-md border-gray-300"
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
        </select>
        
        <select 
          value={selectedType} 
          onChange={(e) => setSelectedType(e.target.value as StoryType)}
          className="rounded-md border-gray-300"
        >
          <option value="personal">Personal Story</option>
          <option value="detention">Detention Story</option>
          <option value="family">Family Story</option>
        </select>
      </div>
      
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full h-64 p-3 border rounded-md"
        placeholder={`Enter ${selectedType} story in ${getLanguageName(selectedLanguage)}...`}
      />
      
      <button 
        onClick={handleSave} 
        disabled={isSaving}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {isSaving ? 'Saving...' : 'Save Story'}
      </button>
    </div>
  );
}

function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    en: 'English',
    es: 'Spanish', 
    fr: 'French',
  };
  return languages[code] || code.toUpperCase();
}
```

---

## Person Visibility Management

### Visibility Toggle Component

```typescript
// components/admin/PersonVisibilityToggle.tsx
'use client';

import { useState, useTransition } from 'react';
import { togglePersonVisibility } from '@/app/actions/persons';

interface PersonVisibilityToggleProps {
  personId: string;
  initialIsActive: boolean;
  onUpdate?: (personId: string, isActive: boolean) => void;
}

export default function PersonVisibilityToggle({
  personId,
  initialIsActive,
  onUpdate
}: PersonVisibilityToggleProps) {
  const [isActive, setIsActive] = useState(initialIsActive);
  const [isPending, startTransition] = useTransition();

  const handleToggle = async () => {
    const newStatus = !isActive;
    
    // Optimistic update
    setIsActive(newStatus);
    if (onUpdate) {
      onUpdate(personId, newStatus);
    }

    startTransition(async () => {
      try {
        const result = await togglePersonVisibility(personId, newStatus);
        if (!result.success) {
          // Rollback on failure
          setIsActive(!newStatus);
          if (onUpdate) {
            onUpdate(personId, !newStatus);
          }
        }
      } catch (error) {
        // Rollback on error
        setIsActive(!newStatus);
        if (onUpdate) {
          onUpdate(personId, !newStatus);
        }
      }
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        isActive
          ? 'bg-green-100 text-green-800 hover:bg-green-200'
          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
      } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isActive ? 'Visible' : 'Hidden'}
    </button>
  );
}
```

### Server Actions for Visibility

```typescript
// app/actions/persons.ts
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export async function togglePersonVisibility(
  personId: string, 
  isActive: boolean
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'persons', 'update')) {
    throw new Error('Unauthorized');
  }

  try {
    await prisma.person.update({
      where: { id: personId },
      data: { isActive }
    });
    
    revalidatePath('/admin/persons');
    return { success: true };
  } catch (error) {
    console.error('Failed to update person visibility:', error);
    return { success: false, error: 'Failed to update visibility' };
  }
}

export async function updateBulkPersonVisibility(
  personIds: string[], 
  isActive: boolean
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'persons', 'update')) {
    throw new Error('Unauthorized');
  }

  try {
    await prisma.person.updateMany({
      where: { id: { in: personIds } },
      data: { isActive }
    });
    
    revalidatePath('/admin/persons');
    return { success: true };
  } catch (error) {
    console.error('Failed to update bulk visibility:', error);
    return { success: false, error: 'Failed to update visibility' };
  }
}
```

---

## Public Page Visibility Filtering

### Homepage Visibility Filtering

```typescript
// app/page.tsx
async function getPublicData() {
  const [towns, recentPersons, totalDetained] = await Promise.all([
    // Only show visible towns
    prisma.town.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        state: true,
        _count: {
          select: {
            persons: {
              where: {
                isActive: true,
                status: 'detained',
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    }),
    
    // Only show visible persons from visible towns
    prisma.person.findMany({
      where: {
        isActive: true,
        status: 'detained',
        town: {
          isActive: true,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        primaryPicture: true,
        lastSeenDate: true,
        town: {
          select: {
            name: true,
            state: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 6,
    }),
    
    // Count only visible persons from visible towns
    prisma.person.count({
      where: {
        isActive: true,
        status: 'detained',
        town: {
          isActive: true,
        },
      },
    }),
  ]);

  return { towns, recentPersons, totalDetained };
}
```

### Town Page Visibility

```typescript
// app/[townSlug]/page.tsx
async function getTownData(townSlug: string) {
  const townName = townSlug.replace(/-/g, ' ');

  const town = await prisma.town.findFirst({
    where: {
      name: townName,
      isActive: true, // Only show visible towns
    },
    include: {
      persons: {
        where: {
          isActive: true, // Only show visible persons
          status: 'detained',
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          // ... other fields
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  return town;
}
```

### Person Page Visibility

```typescript
// app/[townSlug]/[personSlug]/page.tsx
async function getPersonData(townSlug: string, personSlug: string) {
  const townName = townSlug.replace(/-/g, ' ');
  const [firstName, lastName] = personSlug
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1));

  const person = await prisma.person.findFirst({
    where: {
      firstName: firstName,
      lastName: lastName,
      town: {
        name: townName,
        isActive: true, // Only show persons from visible towns
      },
      isActive: true, // Only show visible persons
    },
    include: {
      town: true,
      detentionCenter: true,
      stories: {
        where: {
          isActive: true,
        },
      },
      comments: {
        where: {
          isActive: true,
          isApproved: true,
        },
      },
      // ... other relations
    },
  });

  return person;
}
```

---

## Notes

- All code examples are simplified for clarity and may need additional error handling and validation in production
- TypeScript types are included where relevant to demonstrate proper typing
- Server actions use Next.js 13+ conventions with 'use server' directive
- Components use React Server Components where appropriate
- Authentication and permission checks are included in server actions
- Optimistic UI updates are implemented for better user experience
- Database queries include proper filtering for visibility and active status