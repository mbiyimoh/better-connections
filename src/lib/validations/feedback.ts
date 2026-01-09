import { z } from 'zod';
import { FILE_UPLOAD_LIMITS } from '@/lib/design-system';

// Enums matching Prisma schema
export const FeedbackAreaEnum = z.enum([
  'CONTACTS',
  'ENRICHMENT',
  'EXPLORE',
  'IMPORT_EXPORT',
  'MOBILE',
  'OTHER',
]);

export const FeedbackTypeEnum = z.enum([
  'BUG',
  'ENHANCEMENT',
  'IDEA',
  'QUESTION',
]);

export const FeedbackStatusEnum = z.enum([
  'OPEN',
  'IN_REVIEW',
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CLOSED',
]);

// Create feedback schema
export const feedbackCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().min(1, 'Description is required').max(5000, 'Description must be 5000 characters or less'),
  area: FeedbackAreaEnum,
  type: FeedbackTypeEnum,
  attachmentIds: z.array(z.string()).optional().default([]),
});

// Update feedback schema (admin only - status changes)
export const feedbackUpdateSchema = z.object({
  status: FeedbackStatusEnum,
});

// Query schema for filtering/sorting feedback list
export const feedbackQuerySchema = z.object({
  area: FeedbackAreaEnum.optional(),
  type: FeedbackTypeEnum.optional(),
  status: FeedbackStatusEnum.optional(),
  sort: z.enum(['upvoteCount', 'createdAt', 'updatedAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// Vote action schema
export const feedbackVoteSchema = z.object({
  feedbackId: z.string().cuid(),
});

// File upload validation
export const feedbackAttachmentSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().min(1).max(FILE_UPLOAD_LIMITS.MAX_SIZE),
  mimeType: z.string().refine(
    (type) => (FILE_UPLOAD_LIMITS.ALLOWED_TYPES as readonly string[]).includes(type),
    'Only images (JPEG, PNG, GIF, WebP) and PDFs are allowed'
  ),
});

// Type exports
export type FeedbackArea = z.infer<typeof FeedbackAreaEnum>;
export type FeedbackType = z.infer<typeof FeedbackTypeEnum>;
export type FeedbackStatus = z.infer<typeof FeedbackStatusEnum>;
export type FeedbackCreateInput = z.infer<typeof feedbackCreateSchema>;
export type FeedbackUpdateInput = z.infer<typeof feedbackUpdateSchema>;
export type FeedbackQueryInput = z.infer<typeof feedbackQuerySchema>;
export type FeedbackVoteInput = z.infer<typeof feedbackVoteSchema>;
export type FeedbackAttachmentInput = z.infer<typeof feedbackAttachmentSchema>;

// UI helper: area labels
export const FEEDBACK_AREA_LABELS: Record<FeedbackArea, string> = {
  CONTACTS: 'Contacts',
  ENRICHMENT: 'Enrichment',
  EXPLORE: 'Explore',
  IMPORT_EXPORT: 'Import/Export',
  MOBILE: 'Mobile',
  OTHER: 'Other',
};

// UI helper: type labels
export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  BUG: 'Bug',
  ENHANCEMENT: 'Enhancement',
  IDEA: 'Idea',
  QUESTION: 'Question',
};

// UI helper: status labels
export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  OPEN: 'Open',
  IN_REVIEW: 'In Review',
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
};
