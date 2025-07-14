import { z } from 'zod';

export const CreateCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(5000),
  submitterName: z.string().max(100).optional(),
  submitterEmail: z.string().email('Invalid email format').optional(),
  submitterPhone: z
    .string()
    .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number')
    .optional(),
  isAnonymous: z.boolean().default(false),
  privacyLevel: z.enum(['public', 'family', 'officials']).default('public'),
  personId: z.string().cuid('Invalid person ID'),
});

export const UpdateCommentSchema = CreateCommentSchema.partial();

export const ModerateCommentSchema = z.object({
  isApproved: z.boolean(),
  moderatorNotes: z.string().max(1000).optional(),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>;
export type ModerateCommentInput = z.infer<typeof ModerateCommentSchema>;
