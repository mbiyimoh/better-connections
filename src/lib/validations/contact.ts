import { z } from 'zod';

export const contactCreateSchema = z.object({
  // Name fields (split)
  firstName: z.string().min(1, 'First name is required').max(255),
  lastName: z.string().max(255).optional().nullable(),

  // Email fields (primary/secondary)
  primaryEmail: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  secondaryEmail: z.string().email('Invalid email').optional().nullable().or(z.literal('')),

  // Phone fields (primary/secondary)
  primaryPhone: z.string().max(50).optional().nullable(),
  secondaryPhone: z.string().max(50).optional().nullable(),

  // Other fields
  title: z.string().max(255).optional().nullable(),
  company: z.string().max(255).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  linkedinUrl: z.string().url('Invalid URL').max(500).optional().nullable().or(z.literal('')),
  howWeMet: z.string().optional().nullable(),
  relationshipStrength: z.number().int().min(1).max(4).default(1),
  lastContactDate: z.string().datetime().optional().nullable(),
  relationshipHistory: z.string().optional().nullable(),
  whyNow: z.string().optional().nullable(),
  expertise: z.string().optional().nullable(),
  interests: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  source: z.enum(['MANUAL', 'CSV', 'GOOGLE', 'LINKEDIN', 'ICLOUD', 'OUTLOOK']).default('MANUAL'),
  tags: z
    .array(
      z.object({
        text: z.string().min(1).max(100),
        category: z.enum(['RELATIONSHIP', 'OPPORTUNITY', 'EXPERTISE', 'INTEREST']),
      })
    )
    .optional()
    .default([]),
});

export const contactUpdateSchema = contactCreateSchema.partial().extend({
  lastEnrichedAt: z.string().datetime().optional().nullable(),
});

export const contactQuerySchema = z.object({
  search: z.string().optional(),
  sort: z.enum(['firstName', 'lastName', 'primaryEmail', 'company', 'lastContactDate', 'enrichmentScore', 'createdAt']).default('lastName'),
  order: z.enum(['asc', 'desc']).default('asc'),
  category: z.enum(['RELATIONSHIP', 'OPPORTUNITY', 'EXPERTISE', 'INTEREST']).optional(),
  source: z.enum(['MANUAL', 'CSV', 'GOOGLE', 'LINKEDIN', 'ICLOUD', 'OUTLOOK']).optional(),
  relationship: z.coerce.number().int().min(1).max(4).optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  maxScore: z.coerce.number().int().min(0).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type ContactCreateInput = z.infer<typeof contactCreateSchema>;
export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>;
export type ContactQueryInput = z.infer<typeof contactQuerySchema>;
