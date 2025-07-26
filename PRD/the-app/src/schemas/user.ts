import { z } from 'zod';

export const CreateUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  email: z.union([
    z.string().email('Invalid email format'),
    z.literal(''),
  ]).optional().transform(val => val === '' ? undefined : val),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().optional().transform(val => val === '' ? undefined : val),
  lastName: z.string().optional().transform(val => val === '' ? undefined : val),
});

export const UpdateUserSchema = CreateUserSchema.partial().omit({
  password: true,
});

export const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
