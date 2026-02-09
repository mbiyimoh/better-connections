import { z } from 'zod';

// Profile Header Section Schema
export const profileHeaderSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(255),
  lastName: z.string().max(255).optional().nullable().or(z.literal('')),
  title: z.string().max(255).optional().nullable().or(z.literal('')),
  organizationalTitle: z.string().max(255).optional().nullable().or(z.literal('')),
  company: z.string().max(255).optional().nullable().or(z.literal('')),
});

// Contact Information Section Schema
export const contactInfoSchema = z.object({
  primaryEmail: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  secondaryEmail: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  primaryPhone: z.string().max(50).optional().nullable().or(z.literal('')),
  secondaryPhone: z.string().max(50).optional().nullable().or(z.literal('')),
  location: z.string().max(255).optional().nullable().or(z.literal('')),
});

// Social Links Section Schema
export const socialLinksSchema = z.object({
  linkedinUrl: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
  twitterUrl: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
  githubUrl: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
  instagramUrl: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
  websiteUrl: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
});

// Relationship Section Schema
export const relationshipSchema = z.object({
  relationshipStrength: z.number().int().min(1).max(4),
  howWeMet: z.string().optional().nullable().or(z.literal('')),
  lastContactDate: z.string().optional().nullable().or(z.literal('')),
  referredBy: z.string().max(255).optional().nullable().or(z.literal('')),
  relationshipHistory: z.string().optional().nullable().or(z.literal('')),
});

// Why Now Section Schema
export const whyNowSchema = z.object({
  whyNow: z.string().optional().nullable().or(z.literal('')),
});

// Expertise & Interests Section Schema
export const expertiseInterestsSchema = z.object({
  expertise: z.string().optional().nullable().or(z.literal('')),
  interests: z.string().optional().nullable().or(z.literal('')),
});

// Notes Section Schema
export const notesSchema = z.object({
  notes: z.string().optional().nullable().or(z.literal('')),
});

// Section field mappings for save operations
export const SECTION_FIELDS = {
  profileHeader: ['firstName', 'lastName', 'title', 'organizationalTitle', 'company'] as const,
  contactInfo: ['primaryEmail', 'secondaryEmail', 'primaryPhone', 'secondaryPhone', 'location'] as const,
  socialLinks: ['linkedinUrl', 'twitterUrl', 'githubUrl', 'instagramUrl', 'websiteUrl'] as const,
  relationship: ['relationshipStrength', 'howWeMet', 'lastContactDate', 'referredBy', 'relationshipHistory'] as const,
  whyNow: ['whyNow'] as const,
  expertiseInterests: ['expertise', 'interests'] as const,
  notes: ['notes'] as const,
} as const;

// Section ID to field mapping type
export type SectionId = keyof typeof SECTION_FIELDS;
export type SectionFields<T extends SectionId> = typeof SECTION_FIELDS[T][number];

// Field to section ID mapping (for EnrichmentScoreCard suggestions)
export const FIELD_TO_SECTION: Record<string, SectionId> = {
  firstName: 'profileHeader',
  lastName: 'profileHeader',
  title: 'profileHeader',
  organizationalTitle: 'profileHeader',
  company: 'profileHeader',
  primaryEmail: 'contactInfo',
  secondaryEmail: 'contactInfo',
  primaryPhone: 'contactInfo',
  secondaryPhone: 'contactInfo',
  location: 'contactInfo',
  linkedinUrl: 'socialLinks',
  twitterUrl: 'socialLinks',
  githubUrl: 'socialLinks',
  instagramUrl: 'socialLinks',
  websiteUrl: 'socialLinks',
  relationshipStrength: 'relationship',
  howWeMet: 'relationship',
  lastContactDate: 'relationship',
  referredBy: 'relationship',
  relationshipHistory: 'relationship',
  whyNow: 'whyNow',
  expertise: 'expertiseInterests',
  interests: 'expertiseInterests',
  notes: 'notes',
};
