# Code Examples for Bring Me Home Application

This file contains code examples referenced in the Product Requirements Document and Implementation Plan. These examples demonstrate implementation patterns, database schemas, and configuration approaches used throughout the application.

## Table of Contents
1. [Database Schema Examples](#database-schema-examples)
2. [Image Encoding System](#image-encoding-system)
3. [Environment Variables Handler](#environment-variables-handler)
4. [Docker Configuration](#docker-configuration)
5. [Validation Schemas](#validation-schemas)
6. [Anonymous Comment Implementation](#anonymous-comment-implementation)
   - [Comment Submission Confirmation](#comment-submission-confirmation)
7. [Comment Moderation Enhancement](#comment-moderation-enhancement)
8. [Multi-Language Story Implementation](#multi-language-story-implementation)
9. [Person Visibility Management](#person-visibility-management)
10. [Public Page Visibility Filtering](#public-page-visibility-filtering)
11. [Comprehensive Story Seeding](#comprehensive-story-seeding)

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

### Comment Submission Confirmation

```typescript
// components/person/CommentConfirmationModal.tsx
'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface CommentData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  content?: string;
  wantsToHelpMore: boolean;
  displayNameOnly: boolean;
  requiresFamilyApproval: boolean;
}

export default function CommentConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
  commentData,
}: CommentConfirmationModalProps) {
  // Focus management and escape key handling
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg max-w-md w-full shadow-xl">
          <div className="p-6">
            {/* Header with icon */}
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                Review Your Support Message
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Your message is being reviewed by the family to make sure it is OK with them.
              </p>
            </div>

            {/* Summary of submission */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Your Submission:</h4>
              {/* Display submitted data and preferences */}
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Name:</span> {commentData.firstName} {commentData.lastName}
                </div>
                {/* Show selected preferences with checkmarks */}
                <ul className="mt-3 space-y-1">
                  {commentData.wantsToHelpMore && (
                    <li className="flex items-start">
                      <svg className="h-4 w-4 text-green-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      I want to help more, please contact me
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end space-x-3">
              <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                OK, Post My Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Portal to render modal at document root
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return null;
}
```

### Updated Anonymous Comment Form with Confirmation

```typescript
// components/person/AnonymousCommentForm.tsx
export default function AnonymousCommentForm({
  personId,
  onSubmit,
  isPending,
  state,
}: AnonymousCommentFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  
  // Reset form and hide when submission is successful
  useEffect(() => {
    if (state?.success) {
      setShowForm(false);
      if (formRef.current) {
        formRef.current.reset();
      }
    }
  }, [state?.success]);

  return (
    <>
      <form 
        ref={formRef}
        action={(formData) => {
          // Capture form data and show confirmation modal instead of submitting
          setPendingFormData(formData);
          setShowConfirmModal(true);
        }} 
        className="space-y-4"
      >
        {/* Form fields */}
      </form>
      
      {/* Confirmation Modal */}
      <CommentConfirmationModal
        isOpen={showConfirmModal}
        onConfirm={() => {
          if (pendingFormData) {
            onSubmit(pendingFormData);
            setShowConfirmModal(false);
            setPendingFormData(null);
          }
        }}
        onCancel={() => {
          setShowConfirmModal(false);
          setPendingFormData(null);
          // Reset the form
          if (formRef.current) {
            formRef.current.reset();
          }
        }}
        commentData={{
          firstName: pendingFormData?.get('firstName') as string || '',
          lastName: pendingFormData?.get('lastName') as string || '',
          email: pendingFormData?.get('email') as string || undefined,
          phone: pendingFormData?.get('phone') as string || undefined,
          content: pendingFormData?.get('content') as string || undefined,
          wantsToHelpMore: pendingFormData?.get('wantsToHelpMore') === 'true',
          displayNameOnly: pendingFormData?.get('displayNameOnly') === 'true',
          requiresFamilyApproval: pendingFormData?.get('requiresFamilyApproval') === 'true',
        }}
      />
    </>
  );
}
```

---

## Comment Moderation Enhancement

### Comment Status Toggle Component

```typescript
// components/admin/CommentStatusToggle.tsx
'use client';

import { useState, useTransition } from 'react';
import { toggleCommentStatus } from '@/app/actions/comments';

interface CommentStatusToggleProps {
  commentId: string;
  initialIsApproved: boolean;
  onUpdate?: (commentId: string, isApproved: boolean) => void;
}

export default function CommentStatusToggle({
  commentId,
  initialIsApproved,
  onUpdate
}: CommentStatusToggleProps) {
  const [isApproved, setIsApproved] = useState(initialIsApproved);
  const [isPending, startTransition] = useTransition();

  const handleToggle = async () => {
    const newStatus = !isApproved;
    
    // Optimistic update
    setIsApproved(newStatus);
    if (onUpdate) {
      onUpdate(commentId, newStatus);
    }

    startTransition(async () => {
      try {
        const result = await toggleCommentStatus(commentId, newStatus);
        if (!result.success) {
          // Rollback on failure
          setIsApproved(!newStatus);
          if (onUpdate) {
            onUpdate(commentId, !newStatus);
          }
        }
      } catch (error) {
        // Rollback on error
        setIsApproved(!newStatus);
        if (onUpdate) {
          onUpdate(commentId, !newStatus);
        }
      }
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`inline-flex items-center justify-center w-20 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        isApproved
          ? 'bg-green-100 text-green-800 hover:bg-green-200'
          : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
      } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isApproved ? 'Approved' : 'Pending'}
    </button>
  );
}
```

### Permission-Based Action Visibility

```typescript
// app/admin/comments/page.tsx - Permission checks
const canApprove = hasPermission(session, 'comments', 'update');
const canDelete = hasPermission(session, 'comments', 'delete');

// app/admin/comments/CommentsGrid.tsx - Conditional actions
const actions: GridAction<Comment>[] = [
  {
    type: 'edit',
    label: 'Edit',
    onClick: handleModerate,
    show: () => canApprove, // Only show edit icon if user has update permission
    className: 'text-indigo-600 hover:text-indigo-800',
  },
  {
    type: 'view',
    label: 'View on Profile',
    href: comment => `/persons/${comment.person.id}#comments`,
    // No show condition - all users can view
  },
  {
    type: 'delete',
    label: 'Delete',
    onClick: handleDeleteComment,
    show: () => canDelete, // Only show delete if user has delete permission
    className: 'text-red-600 hover:text-red-800',
  },
];
```

### Server Action for Comment Status Toggle

```typescript
// app/actions/comments.ts
export async function toggleCommentStatus(
  commentId: string,
  isApproved: boolean
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'comments', 'update')) {
    throw new Error('Unauthorized');
  }

  try {
    await prisma.comment.update({
      where: { id: commentId },
      data: { 
        isApproved,
        approvedAt: isApproved ? new Date() : null,
        approvedBy: isApproved ? session.user.id : null,
      },
    });
    
    revalidatePath('/admin/comments');
    return { success: true };
  } catch (error) {
    console.error('Failed to toggle comment status:', error);
    return { success: false, error: 'Failed to update comment status' };
  }
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

## Comprehensive Story Seeding

### Multi-Language Story Creation for Seed Data

```typescript
// prisma/seed.ts - Comprehensive story seeding with focus on Borrego Springs
async function createStoriesForPersons(persons: any[]) {
  const borregoSpringsPersons = persons.filter(p => p.townId === 'town_1');
  const otherPersons = persons.filter(p => p.townId !== 'town_1');
  
  // Create detailed stories for Borrego Springs persons
  for (const person of borregoSpringsPersons) {
    await createDetailedStoriesForPerson(person);
  }
  
  // Create basic stories for other persons (migrate from old fields)
  for (const person of otherPersons) {
    await createBasicStoriesForPerson(person);
  }
  
  const totalStories = await prisma.story.count();
  console.log(`Created ${totalStories} stories in multiple languages.`);
}

// Create comprehensive bilingual stories for featured town
async function createDetailedStoriesForPerson(person: any) {
  const isDetained = !!person.detentionCenterId;
  
  // Personal Story - English & Spanish
  await prisma.story.create({
    data: {
      personId: person.id,
      language: 'en',
      storyType: 'personal',
      content: generateDetailedPersonalStory(person, 'en'),
      isActive: true,
    }
  });
  
  await prisma.story.create({
    data: {
      personId: person.id,
      language: 'es',
      storyType: 'personal',
      content: generateDetailedPersonalStory(person, 'es'),
      isActive: true,
    }
  });
  
  if (isDetained) {
    // Detention & Family stories in both languages
    const storyTypes = ['detention', 'family'];
    const languages = ['en', 'es'];
    
    for (const storyType of storyTypes) {
      for (const language of languages) {
        await prisma.story.create({
          data: {
            personId: person.id,
            language,
            storyType,
            content: storyType === 'detention' 
              ? generateDetailedDetentionStory(person, language)
              : generateDetailedFamilyStory(person, language),
            isActive: true,
          }
        });
      }
    }
  }
}
```

### Rich Story Content Generation

```typescript
// Generate culturally authentic personal stories
function generateDetailedPersonalStory(person: any, language: string): string {
  const firstName = person.firstName;
  const detentionDate = person.detentionDate || person.lastSeenDate;
  
  if (language === 'es') {
    return `${firstName} llegó a Borrego Springs hace 15 años con la esperanza de construir una vida mejor para su familia. Trabajando en los campos de dátiles y en la construcción, ${firstName} se convirtió en un miembro valioso de nuestra comunidad.

Como padre de tres hijos nacidos aquí, ${firstName} siempre priorizó la educación de sus hijos. Cada mañana, antes del amanecer, preparaba el desayuno para su familia antes de dirigirse al trabajo. Los fines de semana, entrenaba al equipo de fútbol juvenil local y participaba activamente en la iglesia San Juan Bautista.

${firstName} es conocido en Borrego Springs por su generosidad. Durante la pandemia, organizó entregas de alimentos para familias necesitadas y ayudó a vecinos ancianos con sus compras. Su pequeño negocio de jardinería empleaba a otros miembros de la comunidad y mantenía hermosos los espacios públicos de nuestro pueblo.

La detención de ${firstName} el ${detentionDate.toLocaleDateString('es-ES')} ha dejado un vacío en nuestra comunidad. Sus hijos preguntan cada noche cuándo volverá papá a casa. Su esposa lucha por mantener a la familia unida mientras trabaja dos empleos. Necesitamos que ${firstName} regrese a casa donde pertenece.`;
  } else {
    return `${firstName} came to Borrego Springs 15 years ago with hopes of building a better life for their family. Working in the date palm fields and construction, ${firstName} became a valued member of our community.

As a parent of three US-born children, ${firstName} always prioritized their education. Every morning before dawn, they would prepare breakfast for the family before heading to work. On weekends, ${firstName} coached the local youth soccer team and was active in St. John the Baptist Church.

${firstName} is known throughout Borrego Springs for their generosity. During the pandemic, they organized food deliveries for families in need and helped elderly neighbors with their shopping. Their small landscaping business employed other community members and kept our town's public spaces beautiful.

${firstName}'s detention on ${detentionDate.toLocaleDateString('en-US')} has left a void in our community. Their children ask every night when daddy will come home. Their spouse struggles to keep the family together while working two jobs. We need ${firstName} back home where they belong.`;
  }
}

// Generate detention circumstances with local context
function generateDetailedDetentionStory(person: any, language: string): string {
  const firstName = person.firstName;
  const detentionCenter = detentionCenters.find(dc => dc.id === person.detentionCenterId);
  
  if (language === 'es') {
    return `La mañana del ${person.detentionDate.toLocaleDateString('es-ES')}, ${firstName} fue detenido mientras llevaba a sus hijos a la escuela. Los agentes de ICE esperaban afuera de su casa, traumatizando a los niños que vieron cómo se llevaban a su padre.

${firstName} ahora está detenido en ${detentionCenter?.name || 'un centro de detención'}, a más de 200 millas de su familia. Las visitas son casi imposibles debido a la distancia y los horarios restrictivos. Solo puede hablar con sus hijos por teléfono durante 10 minutos al día, si puede pagar las costosas tarifas telefónicas.

A pesar de no tener antecedentes penales y tener fuertes lazos comunitarios, se le ha negado la libertad bajo fianza. Su caso de asilo, basado en la persecución que sufrió en su país de origen, está pendiente desde hace años. Mientras tanto, su familia lucha por sobrevivir sin su principal sostén económico.

La comunidad de Borrego Springs se ha unido para apoyar a la familia de ${firstName}, pero necesitamos su ayuda para traerlo de vuelta a casa. Cada carta de apoyo, cada llamada a los funcionarios electos, marca la diferencia en los procedimientos de inmigración.`;
  } else {
    return `On the morning of ${person.detentionDate.toLocaleDateString('en-US')}, ${firstName} was detained while taking their children to school. ICE agents waited outside their home, traumatizing the children who watched their parent being taken away.

${firstName} is now held at ${detentionCenter?.name || 'a detention center'}, over 200 miles from their family. Visits are nearly impossible due to the distance and restrictive hours. They can only speak to their children by phone for 10 minutes a day, if they can afford the expensive phone charges.

Despite having no criminal record and strong community ties, they have been denied bond. Their asylum case, based on persecution suffered in their home country, has been pending for years. Meanwhile, their family struggles to survive without their primary breadwinner.

The Borrego Springs community has rallied to support ${firstName}'s family, but we need your help to bring them home. Every letter of support, every call to elected officials, makes a difference in immigration proceedings.`;
  }
}

// Generate emotional family messages
function generateDetailedFamilyStory(person: any, language: string): string {
  const firstName = person.firstName;
  const spouseName = person.id.includes('1') || person.id.includes('3') ? 'Maria' : 'Carlos';
  
  if (language === 'es') {
    return `Mi nombre es ${spouseName}, esposa de ${firstName}. Escribo esto con lágrimas en los ojos y un peso insoportable en mi corazón.

Nuestros tres hijos - Miguel de 12 años, Sofia de 9, y el pequeño Diego de 5 - preguntan por su papá todos los días. Diego dibuja tarjetas para ${firstName} que no podemos enviar. Sofia llora en las noches. Miguel trata de ser fuerte, pero veo cómo sus calificaciones han bajado desde que se llevaron a su padre.

${firstName} no es solo mi esposo; es el pilar de nuestra familia. Trabajaba duro para darnos una vida digna. Los domingos cocinaba para toda la familia, y las tardes ayudaba a los niños con sus tareas. Ahora trabajo dos empleos solo para pagar el alquiler, y apenas veo a mis hijos.

Por favor, ayúdennos. ${firstName} es un buen hombre que solo quería darle a su familia una vida mejor. No somos números o estadísticas - somos una familia que está siendo destruida. Cada día sin ${firstName} es una eternidad. Los niños necesitan a su padre, y yo necesito a mi esposo. Por favor, tráiganlo a casa.`;
  } else {
    return `My name is ${spouseName}, ${firstName}'s wife. I write this with tears in my eyes and an unbearable weight on my heart.

Our three children - Miguel, 12, Sofia, 9, and little Diego, 5 - ask for their daddy every day. Diego draws cards for ${firstName} that we can't send. Sofia cries at night. Miguel tries to be strong, but I see how his grades have dropped since they took his father away.

${firstName} is not just my husband; they're the pillar of our family. They worked hard to give us a dignified life. On Sundays, they cooked for the whole family, and in the evenings helped the children with homework. Now I work two jobs just to pay rent, and barely see my children.

Please help us. ${firstName} is a good person who only wanted to give their family a better life. We're not numbers or statistics - we're a family being destroyed. Every day without ${firstName} is an eternity. The children need their parent, and I need my spouse. Please bring them home.`;
  }
}
```

---

## Visual Customization Models

### Layout and Theme Prisma Models

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

---

## Configuration Display Page

### Server Function for Public Configuration

```typescript
// app/configs/page.tsx
import { getPublicConfig } from '@/lib/config';
import { HealthCheckSection } from '@/components/configs/HealthCheckSection';

export default async function ConfigPage() {
  const config = await getPublicConfig();
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">System Configuration</h1>
      
      <div className="grid gap-6">
        {/* Environment Information */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Environment</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="font-medium">Node Environment:</dt>
              <dd>{config.nodeEnv}</dd>
            </div>
            <div>
              <dt className="font-medium">Version:</dt>
              <dd>{config.version}</dd>
            </div>
            <div>
              <dt className="font-medium">Build Date:</dt>
              <dd>{config.buildDate}</dd>
            </div>
          </dl>
        </section>

        {/* Public Settings */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Application Settings</h2>
          <dl className="grid gap-2">
            <div>
              <dt className="font-medium">Site Title:</dt>
              <dd>{config.siteTitle}</dd>
            </div>
            <div>
              <dt className="font-medium">Support Email:</dt>
              <dd>{config.supportEmail}</dd>
            </div>
          </dl>
        </section>

        {/* Health Check */}
        <HealthCheckSection />
      </div>
    </div>
  );
}
```

### Server Function for Config Retrieval

```typescript
// lib/config.ts
export async function getPublicConfig() {
  // Get environment config
  const envConfig = {
    nodeEnv: process.env.NODE_ENV || 'development',
    version: process.env.NEXT_PUBLIC_VERSION || '0.0.0',
    buildDate: process.env.NEXT_PUBLIC_BUILD_DATE || 'Unknown',
    siteTitle: process.env.NEXT_PUBLIC_SITE_TITLE || 'Bring Me Home',
    supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@example.com',
  };

  // Override with database config if available
  const dbConfig = await prisma.systemConfig.findMany({
    where: {
      key: {
        in: ['siteTitle', 'supportEmail', 'maintenanceMode']
      }
    }
  });

  // Merge configs (DB takes precedence)
  const mergedConfig = { ...envConfig };
  dbConfig.forEach(config => {
    mergedConfig[config.key] = config.value;
  });

  return mergedConfig;
}

// For authenticated admin users
export async function getFullConfig(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: true }
  });

  if (!hasAdminRole(user)) {
    throw new Error('Unauthorized');
  }

  // Return sensitive config too
  return {
    ...await getPublicConfig(),
    database: {
      url: process.env.DATABASE_URL ? 'Configured' : 'Not configured',
      provider: 'mysql',
    },
    redis: {
      url: process.env.REDIS_URL ? 'Configured' : 'Not configured',
    },
    auth: {
      secret: process.env.NEXTAUTH_SECRET ? 'Configured' : 'Not configured',
    }
  };
}
```

---

## Redis Storage Implementation

### Redis Connection

```typescript
// lib/redis.ts
import Redis from 'ioredis';

let redis: Redis | null = null;

export function getRedisClient() {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
    });

    redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
  }

  return redis;
}

// Health check
export async function checkRedisHealth() {
  try {
    const client = getRedisClient();
    await client.ping();
    return { status: 'healthy', latency: 0 };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}
```

### Redis Key Patterns

```typescript
// Constants for Redis keys
export const REDIS_KEYS = {
  // Comment drafts
  commentDraft: (personId: string, sessionId: string) => 
    `draft:comment:${personId}:${sessionId}`,
  
  // Temporary file uploads
  tempUpload: (uploadId: string) => 
    `temp:upload:${uploadId}`,
  
  // Session data
  userSession: (sessionId: string) => 
    `session:${sessionId}`,
  
  // Cache keys
  personData: (personId: string) => 
    `cache:person:${personId}`,
  townData: (townId: string) => 
    `cache:town:${townId}`,
};

// TTL values in seconds
export const REDIS_TTL = {
  commentDraft: 3600,      // 1 hour
  tempUpload: 1800,        // 30 minutes
  sessionData: 86400,      // 24 hours
  cacheData: 300,          // 5 minutes
};
```

---

## Environment Variables Configuration

### Visual Defaults Configuration

```bash
# Visual Customization Defaults
DEFAULT_LAYOUT="standard"              # Layout for new towns/persons
DEFAULT_THEME="light"                  # Theme for new towns/persons
SYSTEM_DEFAULT_LAYOUT="standard"       # Global fallback layout
SYSTEM_DEFAULT_THEME="light"          # Global fallback theme

# Admin UI
ADMIN_GRID_PAGE_SIZE="100"            # Rows per page in admin grids
ADMIN_SHOW_HELP_TEXT="true"           # Show help text below grids

# Public Display
HOMEPAGE_RECENT_PERSONS="10"          # Number on homepage
TOWN_PAGE_PERSONS_PER_PAGE="20"       # Pagination size

# Authentication Overrides (9.5.1)
SYSTEM_USERNAME_OVERRIDE="admin"
SYSTEM_PASSWORD_OVERRIDE="[REMOVED]"

# Site Protection (9.5.2)
SITE_BLOCK_ENABLED="false"
SITE_BLOCK_USERNAME="beta"
SITE_BLOCK_PASSWORD="[REMOVED]"

# Google reCAPTCHA (future)
GOOGLE_RECAPTCHA_SITE_KEY=""
GOOGLE_RECAPTCHA_SECRET_KEY=""
```

### Redis Configuration

```bash
# Redis Configuration
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""            # Optional
REDIS_DB="0"                # Database number
REDIS_KEY_PREFIX="bmh:"     # Prefix for all keys
REDIS_ENABLE_OFFLINE_QUEUE="false"
REDIS_CONNECT_TIMEOUT="5000"
REDIS_MAX_RETRIES="3"
```

### Image Configuration

```bash
# Image Processing
IMAGE_UPLOAD_MAX_SIZE_MB="5"              # Browser enforced
IMAGE_STORAGE_MAX_SIZE_KB="500"           # After processing
IMAGE_THUMBNAIL_SIZE="200"                # Square thumbnail
IMAGE_QUALITY="85"                        # JPEG quality (1-100)
IMAGE_FORMATS_ALLOWED="jpg,jpeg,png,webp" # Allowed formats
```

---

## Image Processing Pipeline

### Effective Upload Limit Calculation

```javascript
// Frontend validation
const effectiveUploadLimit = Math.min(
  parseInt(process.env.NEXT_PUBLIC_IMAGE_UPLOAD_MAX_SIZE_MB || '5'),
  10  // Next.js body size limit
);
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
- Story content in seed data is designed to be culturally authentic and respectful while conveying the human impact of detention