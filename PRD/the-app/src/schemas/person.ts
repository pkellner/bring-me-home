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