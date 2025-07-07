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