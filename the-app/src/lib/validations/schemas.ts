import { z } from 'zod';

// User schemas
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

// Town schemas
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

// Person schemas
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

// Comment schemas
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
  sessionId: z.string().optional(), // For Redis storage
});

export const UpdateCommentSchema = CreateCommentSchema.partial();

export const ModerateCommentSchema = z.object({
  isApproved: z.boolean(),
  moderatorNotes: z.string().max(1000).optional(),
});

// Detention Center schemas
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

// Role schemas
export const CreateRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(50),
  description: z.string().max(200).optional(),
  permissions: z.string(), // JSON string
});

export const UpdateRoleSchema = CreateRoleSchema.partial();

// Layout schemas
export const CreateLayoutSchema = z.object({
  name: z.string().min(1, 'Layout name is required').max(100),
  description: z.string().max(500).optional(),
  cssClasses: z.string().optional(),
  template: z.string(), // JSON template
  isActive: z.boolean().default(true),
});

export const UpdateLayoutSchema = CreateLayoutSchema.partial();

// Theme schemas
export const CreateThemeSchema = z.object({
  name: z.string().min(1, 'Theme name is required').max(100),
  description: z.string().max(500).optional(),
  colors: z.string(), // JSON color configuration
  cssVars: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const UpdateThemeSchema = CreateThemeSchema.partial();

// Attachment schemas
export const CreateAttachmentSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  originalName: z.string().min(1, 'Original name is required'),
  mimeType: z.string().min(1, 'MIME type is required'),
  fileSize: z.number().int().positive('File size must be positive'),
  filePath: z.string().min(1, 'File path is required'),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(true),
  commentId: z.string().cuid().optional(),
  personId: z.string().cuid().optional(),
}).refine(
  (data) => (data.commentId && !data.personId) || (!data.commentId && data.personId),
  { message: 'Attachment must belong to either a comment or a person, not both' }
);

// Access control schemas
export const CreateTownAccessSchema = z.object({
  userId: z.string().cuid('Invalid user ID'),
  townId: z.string().cuid('Invalid town ID'),
  accessLevel: z.enum(['read', 'write', 'admin']).default('read'),
});

export const CreatePersonAccessSchema = z.object({
  userId: z.string().cuid('Invalid user ID'),
  personId: z.string().cuid('Invalid person ID'),
  accessLevel: z.enum(['read', 'write', 'admin']).default('read'),
});

// System config schemas
export const CreateSystemConfigSchema = z.object({
  key: z.string().min(1, 'Config key is required').max(100),
  value: z.string().min(1, 'Config value is required'),
  description: z.string().max(500).optional(),
  dataType: z.enum(['string', 'number', 'boolean', 'json']).default('string'),
});

export const UpdateSystemConfigSchema = CreateSystemConfigSchema.partial();

// Health check schemas
export const CreateHealthCheckSchema = z.object({
  testData: z.string().min(1, 'Test data is required'),
  testNumber: z.number().int(),
});

// Type exports
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

export type CreateTownInput = z.infer<typeof CreateTownSchema>;
export type UpdateTownInput = z.infer<typeof UpdateTownSchema>;

export type CreatePersonInput = z.infer<typeof CreatePersonSchema>;
export type UpdatePersonInput = z.infer<typeof UpdatePersonSchema>;

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>;
export type ModerateCommentInput = z.infer<typeof ModerateCommentSchema>;

export type CreateDetentionCenterInput = z.infer<typeof CreateDetentionCenterSchema>;
export type UpdateDetentionCenterInput = z.infer<typeof UpdateDetentionCenterSchema>;

export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;

export type CreateLayoutInput = z.infer<typeof CreateLayoutSchema>;
export type UpdateLayoutInput = z.infer<typeof UpdateLayoutSchema>;

export type CreateThemeInput = z.infer<typeof CreateThemeSchema>;
export type UpdateThemeInput = z.infer<typeof UpdateThemeSchema>;

export type CreateAttachmentInput = z.infer<typeof CreateAttachmentSchema>;

export type CreateTownAccessInput = z.infer<typeof CreateTownAccessSchema>;
export type CreatePersonAccessInput = z.infer<typeof CreatePersonAccessSchema>;

export type CreateSystemConfigInput = z.infer<typeof CreateSystemConfigSchema>;
export type UpdateSystemConfigInput = z.infer<typeof UpdateSystemConfigSchema>;

export type CreateHealthCheckInput = z.infer<typeof CreateHealthCheckSchema>;