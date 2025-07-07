# Code Examples and Implementation Snippets

## React Server Functions

### User Authentication Server Function
```typescript
// app/actions/auth.ts
'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { LoginSchema } from '@/schemas/user';
import { signIn } from '@/lib/auth';

export async function loginUser(formData: FormData) {
  const rawData = {
    username: formData.get('username'),
    password: formData.get('password'),
  };

  const validation = LoginSchema.safeParse(rawData);
  if (!validation.success) {
    return { error: 'Invalid input data' };
  }

  const { username, password } = validation.data;

  try {
    const user = await prisma.user.findUnique({
      where: { username },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user || !user.isActive) {
      return { error: 'Invalid credentials' };
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return { error: 'Invalid credentials' };
    }

    await signIn(user);
    return { success: true, user: { id: user.id, username: user.username } };
  } catch (error) {
    console.error('Login error:', error);
    return { error: 'Login failed' };
  }
}
```

### Person Management Server Function
```typescript
// app/actions/person.ts
'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { CreatePersonSchema, UpdatePersonSchema } from '@/schemas/person';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function createPerson(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }

  const rawData = {
    firstName: formData.get('firstName'),
    middleName: formData.get('middleName'),
    lastName: formData.get('lastName'),
    alienIdNumber: formData.get('alienIdNumber'),
    lastKnownAddress: formData.get('lastKnownAddress'),
    story: formData.get('story'),
    townId: formData.get('townId'),
    // ... other fields
  };

  const validation = CreatePersonSchema.safeParse(rawData);
  if (!validation.success) {
    return { error: 'Invalid input data', details: validation.error.errors };
  }

  try {
    // Check if user has permission to create person in this town
    const hasAccess = await prisma.townAccess.findFirst({
      where: {
        userId: user.id,
        townId: validation.data.townId,
        accessLevel: { in: ['write', 'admin'] },
      },
    });

    if (!hasAccess) {
      return { error: 'Insufficient permissions' };
    }

    const person = await prisma.person.create({
      data: validation.data,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE_PERSON',
        entityType: 'Person',
        entityId: person.id,
        newValues: JSON.stringify(validation.data),
      },
    });

    revalidatePath(`/towns/${validation.data.townId}`);
    return { success: true, person };
  } catch (error) {
    console.error('Create person error:', error);
    return { error: 'Failed to create person' };
  }
}
```

### Comment Submission Server Function
```typescript
// app/actions/comment.ts
'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { CreateCommentSchema } from '@/schemas/comment';
import { uploadFiles } from '@/lib/upload';

export async function submitComment(formData: FormData) {
  const rawData = {
    content: formData.get('content'),
    submitterName: formData.get('submitterName'),
    submitterEmail: formData.get('submitterEmail'),
    isAnonymous: formData.get('isAnonymous') === 'true',
    privacyLevel: formData.get('privacyLevel'),
    personId: formData.get('personId'),
  };

  const validation = CreateCommentSchema.safeParse(rawData);
  if (!validation.success) {
    return { error: 'Invalid input data', details: validation.error.errors };
  }

  try {
    // Handle file uploads
    const files = formData.getAll('attachments') as File[];
    const uploadedFiles = await uploadFiles(files);

    const comment = await prisma.comment.create({
      data: {
        ...validation.data,
        isApproved: false, // Requires moderation
      },
    });

    // Create attachments
    if (uploadedFiles.length > 0) {
      await prisma.attachment.createMany({
        data: uploadedFiles.map(file => ({
          ...file,
          commentId: comment.id,
        })),
      });
    }

    return { success: true, comment };
  } catch (error) {
    console.error('Submit comment error:', error);
    return { error: 'Failed to submit comment' };
  }
}
```

## React Components

### Person Profile Component
```typescript
// app/components/PersonProfile.tsx
import { Person, Town, Comment, Attachment } from '@prisma/client';
import { ImageGallery } from './ImageGallery';
import { CommentList } from './CommentList';
import { CommentForm } from './CommentForm';

interface PersonProfileProps {
  person: Person & {
    town: Town;
    comments: (Comment & { attachments: Attachment[] })[];
  };
}

export default function PersonProfile({ person }: PersonProfileProps) {
  const images = [
    person.primaryPicture,
    person.secondaryPic1,
    person.secondaryPic2,
    person.secondaryPic3,
  ].filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Person Info */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {person.firstName} {person.middleName} {person.lastName}
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            {person.town.name}, {person.town.state}
          </p>
          
          {person.story && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">Story</h2>
              <p className="text-gray-700 whitespace-pre-line">
                {person.story}
              </p>
            </div>
          )}

          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Last Known Address:</strong> {person.lastKnownAddress}</p>
            {person.lastSeenDate && (
              <p><strong>Last Seen:</strong> {person.lastSeenDate.toLocaleDateString()}</p>
            )}
            {person.lastSeenLocation && (
              <p><strong>Last Seen Location:</strong> {person.lastSeenLocation}</p>
            )}
          </div>
        </div>

        {/* Images */}
        <div>
          <ImageGallery images={images} alt={`${person.firstName} ${person.lastName}`} />
        </div>
      </div>

      {/* Comments Section */}
      <div className="mt-12 border-t pt-8">
        <h2 className="text-2xl font-bold mb-6">Community Comments</h2>
        <CommentList comments={person.comments} />
        <CommentForm personId={person.id} />
      </div>
    </div>
  );
}
```

### Comment Form with useActionState
```typescript
// app/components/CommentForm.tsx
'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { submitComment } from '@/app/actions/comment';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { FileUpload } from './ui/FileUpload';

interface CommentFormProps {
  personId: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Submitting...' : 'Submit Comment'}
    </Button>
  );
}

export default function CommentForm({ personId }: CommentFormProps) {
  const [state, action] = useActionState(submitComment, null);

  return (
    <form action={action} className="space-y-6 bg-gray-50 p-6 rounded-lg">
      <input type="hidden" name="personId" value={personId} />
      
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
          Your Comment *
        </label>
        <Textarea
          id="content"
          name="content"
          rows={4}
          required
          placeholder="Share any information that might be helpful..."
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="submitterName" className="block text-sm font-medium text-gray-700 mb-2">
            Your Name (Optional)
          </label>
          <Input
            id="submitterName"
            name="submitterName"
            type="text"
            placeholder="Enter your name"
          />
        </div>

        <div>
          <label htmlFor="submitterEmail" className="block text-sm font-medium text-gray-700 mb-2">
            Your Email (Optional)
          </label>
          <Input
            id="submitterEmail"
            name="submitterEmail"
            type="email"
            placeholder="Enter your email"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Privacy Level
        </label>
        <select
          name="privacyLevel"
          className="w-full p-2 border border-gray-300 rounded-md"
        >
          <option value="public">Public - Anyone can see</option>
          <option value="family">Family Only</option>
          <option value="officials">Officials Only</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Attachments (Optional)
        </label>
        <FileUpload
          name="attachments"
          multiple
          accept="image/*,video/*"
          maxFiles={3}
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isAnonymous"
          name="isAnonymous"
          value="true"
          className="rounded"
        />
        <label htmlFor="isAnonymous" className="text-sm text-gray-700">
          Submit anonymously
        </label>
      </div>

      {state?.error && (
        <div className="text-red-600 text-sm">{state.error}</div>
      )}

      {state?.success && (
        <div className="text-green-600 text-sm">
          Comment submitted successfully and is pending approval.
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
```

### Admin Grid Component
```typescript
// app/components/admin/DataGrid.tsx
'use client';

import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataGridProps {
  data: any[];
  columns: Column[];
  title: string;
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  onCreate?: () => void;
  pageSize?: number;
}

export default function DataGrid({
  data,
  columns,
  title,
  onEdit,
  onDelete,
  onCreate,
  pageSize = 100,
}: DataGridProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState('');

  // Filter data
  const filteredData = data.filter(row =>
    Object.values(row).some(value =>
      String(value).toLowerCase().includes(filter.toLowerCase())
    )
  );

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortField) return 0;
    
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">{title}</h2>
          {onCreate && (
            <Button onClick={onCreate} className="bg-blue-600 hover:bg-blue-700">
              Create New
            </Button>
          )}
        </div>
        
        <div className="mt-4">
          <Input
            placeholder="Filter records..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-md"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(column.key)}
                      className="flex items-center space-x-1 hover:text-gray-700"
                    >
                      <span>{column.label}</span>
                      {sortField === column.key && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((row, index) => (
              <tr key={row.id || index} className="hover:bg-gray-50">
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    {onEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEdit(row)}
                      >
                        Edit
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDelete(row)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Showing {startIndex + 1} to {Math.min(startIndex + pageSize, sortedData.length)} of {sortedData.length} results
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Previous
          </Button>
          
          <span className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### Environment Variables Context
```typescript
// app/context/EnvironmentContext.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';

interface EnvironmentConfig {
  RELEASEVERSION: string;
  RELEASEDATE: string;
  RELEASEDATEISO: string;
  NEXTAUTH_URL: string;
  GA_TRACKING_ID: string;
  ADMIN_EMAIL: string;
  DEBUG_FLAG: string;
}

const EnvironmentContext = createContext<EnvironmentConfig | null>(null);

export function useEnvironment() {
  const context = useContext(EnvironmentContext);
  if (!context) {
    throw new Error('useEnvironment must be used within an EnvironmentProvider');
  }
  return context;
}

interface EnvironmentProviderProps {
  children: ReactNode;
  config: EnvironmentConfig;
}

export function EnvironmentProvider({ children, config }: EnvironmentProviderProps) {
  return (
    <EnvironmentContext.Provider value={config}>
      {children}
    </EnvironmentContext.Provider>
  );
}
```

### File Upload Component
```typescript
// app/components/ui/FileUpload.tsx
'use client';

import { useState, useRef } from 'react';
import { CloudArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface FileUploadProps {
  name: string;
  multiple?: boolean;
  accept?: string;
  maxFiles?: number;
  maxSize?: number; // in MB
  onFilesChange?: (files: File[]) => void;
}

export default function FileUpload({
  name,
  multiple = false,
  accept,
  maxFiles = 3,
  maxSize = 5,
  onFilesChange,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList) => {
    const newFiles = Array.from(fileList);
    const validFiles = newFiles.filter(file => {
      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is ${maxSize}MB.`);
        return false;
      }
      return true;
    });

    const updatedFiles = multiple ? [...files, ...validFiles].slice(0, maxFiles) : validFiles.slice(0, 1);
    setFiles(updatedFiles);
    onFilesChange?.(updatedFiles);
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesChange?.(updatedFiles);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          Click to upload or drag and drop
        </p>
        <p className="text-xs text-gray-500">
          {accept && `Accepted formats: ${accept}`}
          {maxSize && ` (Max ${maxSize}MB per file)`}
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        name={name}
        multiple={multiple}
        accept={accept}
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
      />

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="ml-2 p-1 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Utility Functions

### Image Processing
```typescript
// lib/image.ts
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

export async function processImage(file: File, options: {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}) {
  const buffer = Buffer.from(await file.arrayBuffer());
  
  let pipeline = sharp(buffer);
  
  if (options.width || options.height) {
    pipeline = pipeline.resize(options.width, options.height, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }
  
  if (options.format) {
    pipeline = pipeline.toFormat(options.format, {
      quality: options.quality || 80,
    });
  }
  
  return pipeline.toBuffer();
}

export async function generateThumbnail(imagePath: string, thumbnailPath: string) {
  await sharp(imagePath)
    .resize(300, 300, { fit: 'inside' })
    .jpeg({ quality: 80 })
    .toFile(thumbnailPath);
}
```

### Database Connection
```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### Authentication Helpers
```typescript
// lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
          include: { userRoles: { include: { role: true } } },
        });

        if (!user || !user.isActive) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(credentials.password, user.password);
        if (!passwordMatch) {
          return null;
        }

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          roles: user.userRoles.map(ur => ur.role),
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.roles = user.roles;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub;
        session.user.roles = token.roles;
      }
      return session;
    },
  },
};
```

This completes the comprehensive PRD, implementation plan, database schema, and code examples for your "Bring Me Home" application. The documentation provides everything needed to begin development following your specific requirements.