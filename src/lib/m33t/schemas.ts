import { z } from 'zod';

// ========== PROFILE SCHEMA ==========
export const ProfileSchema = z.object({
  // Identity
  name: z.string(),
  photoUrl: z.string().nullable().optional(),
  location: z.string().nullable().optional(),

  // Professional
  role: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  seniority: z.enum(['early', 'mid', 'senior', 'executive', 'founder']).nullable().optional(),
  expertise: z.array(z.string()).default([]),

  // Goals (for matching)
  seekingSummary: z.string().nullable().optional(),
  seekingKeywords: z.array(z.string()).default([]),

  // Offerings (for matching)
  offeringSummary: z.string().nullable().optional(),
  offeringKeywords: z.array(z.string()).default([]),

  // For display
  currentFocus: z.string().nullable().optional(),
  idealMatch: z.string().nullable().optional(),

  // Conversation hooks
  conversationHooks: z.array(z.string()).default([]),

  // Quality
  completeness: z.number().min(0).max(1).default(0),
});

export type Profile = z.infer<typeof ProfileSchema>;

// ========== QUESTION SCHEMA ==========
export const QuestionConfigSchema = z.object({
  placeholder: z.string().optional(),
  hint: z.string().optional(),
  leftLabel: z.string().optional(),  // For slider
  rightLabel: z.string().optional(), // For slider
  options: z.array(z.object({
    value: z.string(),
    label: z.string(),
    description: z.string().optional(),
  })).optional(),
  maxSelections: z.number().optional(), // For multi_select
});

export const QuestionSchema = z.object({
  id: z.string(),
  type: z.enum(['open_text', 'slider', 'single_select', 'multi_select']),
  category: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  required: z.boolean().default(false),
  locked: z.boolean().default(false),
  order: z.number(),
  config: QuestionConfigSchema.optional(),
});

export type Question = z.infer<typeof QuestionSchema>;
export type QuestionConfig = z.infer<typeof QuestionConfigSchema>;

// ========== DEFAULT QUESTIONS ==========
// Re-exported from questions.ts to avoid duplication
// Use REQUIRED_QUESTIONS as the single source of truth
export { REQUIRED_QUESTIONS as DEFAULT_QUESTIONS } from './questions';

// ========== EVENT SCHEMAS ==========

// Event type and dress code options - single source of truth
export const EVENT_TYPES = ['networking', 'conference', 'workshop', 'social', 'other'] as const;
export const EVENT_GOALS = ['fundraising', 'hiring', 'partnerships', 'learning', 'community'] as const;

// Dress code options with labels for UI display
export const DRESS_CODE_OPTIONS = [
  { value: 'casual', label: 'Casual' },
  { value: 'business-casual', label: 'Business Casual' },
  { value: 'formal', label: 'Formal' },
  { value: 'creative', label: 'Creative' },
  { value: 'other', label: 'Other' },
] as const;

// Preset dress code values (excluding "other" which triggers custom input)
export const PRESET_DRESS_CODES = ['casual', 'business-casual', 'formal', 'creative'] as const;

// Helper to get label for a dress code value
export const getDressCodeLabel = (value: string): string => {
  const preset = DRESS_CODE_OPTIONS.find(dc => dc.value === value);
  return preset ? preset.label : value; // Custom codes display as-is
};

// Helper to check if a value is a custom dress code
export const isCustomDressCode = (value: string): boolean => {
  return !!value && !PRESET_DRESS_CODES.includes(value as typeof PRESET_DRESS_CODES[number]) && value !== 'other';
};

// ========== LANDING PAGE SCHEMAS ==========

// What to Expect item schema - for event landing page cards
export const WhatToExpectItemSchema = z.object({
  id: z.string(),
  icon: z.string().min(1, "Icon is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
});

export type WhatToExpectItem = z.infer<typeof WhatToExpectItemSchema>;

// Landing page section visibility settings
export const LandingPageSettingsSchema = z.object({
  showVenue: z.boolean().default(true),
  showSchedule: z.boolean().default(true),
  showHost: z.boolean().default(true),
  showWhatToExpect: z.boolean().default(true),
  showAttendees: z.boolean().default(true),
});

export type LandingPageSettings = z.infer<typeof LandingPageSettingsSchema>;

// Default landing page settings (all sections visible)
export const DEFAULT_LANDING_PAGE_SETTINGS: LandingPageSettings = {
  showVenue: true,
  showSchedule: true,
  showHost: true,
  showWhatToExpect: true,
  showAttendees: true,
};

// Form input schema - for react-hook-form (date as string from HTML input)
// No defaults here - defaults are provided in useForm defaultValues
export const EventFormSchema = z.object({
  name: z.string().min(1, "Event name is required"),
  tagline: z.string().optional(),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required").regex(/^\d{2}:\d{2}$/, "Time must be HH:MM format"),
  endTime: z.string().min(1, "End time is required").regex(/^\d{2}:\d{2}$/, "Time must be HH:MM format"),
  timezone: z.string().min(1, "Timezone is required"),
  venueName: z.string().min(1, "Venue name is required"),
  venueAddress: z.string().min(1, "Venue address is required"),
  capacity: z.number().int().min(2).max(200),
  rsvpDeadline: z.string().optional(),
  matchesPerAttendee: z.number().int().min(1).max(20),
  revealTiming: z.enum(['IMMEDIATE', 'TWENTY_FOUR_HOURS_BEFORE', 'FORTY_EIGHT_HOURS_BEFORE']),
});

export type EventFormInput = z.infer<typeof EventFormSchema>;

// Extended form schema for wizard - includes new fields
export const EventWizardFormSchema = EventFormSchema.extend({
  eventType: z.string().optional(),
  eventGoals: z.array(z.string()).optional(),
  parkingNotes: z.string().optional(),
  dressCode: z.string().optional(),
  questions: z.array(QuestionSchema).optional(),
  cardSettings: z.record(z.string(), z.boolean()).optional(),
  // Landing page configuration
  whatToExpect: z.array(WhatToExpectItemSchema).optional(),
  landingPageSettings: LandingPageSettingsSchema.optional(),
});

export type EventWizardFormInput = z.infer<typeof EventWizardFormSchema>;

// API schema - for server-side validation (date coerced to Date)
export const EventCreateSchema = z.object({
  name: z.string().min(1, "Event name is required"),
  tagline: z.string().optional(),
  description: z.string().optional(),
  date: z.coerce.date(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM format"),
  timezone: z.string().default("America/Chicago"),
  venueName: z.string().min(1, "Venue name is required"),
  venueAddress: z.string().min(1, "Venue address is required"),
  googlePlaceId: z.string().nullable().optional(),
  capacity: z.number().int().min(2).max(200).default(50),
  rsvpDeadline: z.coerce.date().optional(),
  matchesPerAttendee: z.number().int().min(1).max(20).default(5),
  revealTiming: z.enum(['IMMEDIATE', 'TWENTY_FOUR_HOURS_BEFORE', 'FORTY_EIGHT_HOURS_BEFORE']).default('TWENTY_FOUR_HOURS_BEFORE'),
});

// Extended API schema for wizard - includes new fields
export const EventWizardCreateSchema = EventCreateSchema.extend({
  eventType: z.string().optional(),
  eventGoals: z.array(z.string()).default([]),
  parkingNotes: z.string().optional(),
  dressCode: z.string().optional(),
  questions: z.array(QuestionSchema).optional(),
  cardSettings: z.record(z.string(), z.boolean()).optional(),
  // Landing page configuration
  whatToExpect: z.array(WhatToExpectItemSchema).optional(),
  landingPageSettings: LandingPageSettingsSchema.optional(),
});

export const EventUpdateSchema = EventWizardCreateSchema.partial();

export type EventCreate = z.infer<typeof EventCreateSchema>;
export type EventWizardCreate = z.infer<typeof EventWizardCreateSchema>;
export type EventUpdate = z.infer<typeof EventUpdateSchema>;

// ========== ATTENDEE SCHEMAS ==========
export const AttendeeCreateSchema = z.object({
  email: z.string().email("Valid email is required"),
  phone: z.string().regex(/^\+1\d{10}$/, "Phone must be E.164 format (+1XXXXXXXXXX)").optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  contactId: z.string().optional(), // Link to Better Contacts
});

export const RSVPResponseSchema = z.object({
  status: z.enum(['CONFIRMED', 'MAYBE', 'DECLINED']),
  phone: z.string().regex(/^\+1\d{10}$/, "Phone must be E.164 format").optional(),
});

export const QuestionnaireResponseSchema = z.object({
  questionId: z.string(),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
  context: z.string().optional(),
  answeredAt: z.coerce.date().default(() => new Date()),
});

export type AttendeeCreate = z.infer<typeof AttendeeCreateSchema>;
export type RSVPResponse = z.infer<typeof RSVPResponseSchema>;
export type QuestionnaireResponse = z.infer<typeof QuestionnaireResponseSchema>;

// ========== MATCH SCHEMAS ==========
export const MatchUpdateSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']).optional(),
  position: z.number().int().min(1).optional(),
  curatorNotes: z.string().optional(),
});

export type MatchUpdate = z.infer<typeof MatchUpdateSchema>;

// ========== TRADING CARD SCHEMA ==========
export const TradingCardL1Schema = z.object({
  name: z.string(),
  photoUrl: z.string().nullable().optional(),
  headline: z.string().nullable().optional(), // "Founder @ Company" or "Role @ Company"
});

export const TradingCardL2Schema = TradingCardL1Schema.extend({
  expertise: z.array(z.string()).default([]),
  currentFocus: z.string().nullable().optional(),
});

export const TradingCardL3Schema = TradingCardL2Schema.extend({
  seekingSummary: z.string().nullable().optional(),
  offeringSummary: z.string().nullable().optional(),
  whyMatch: z.array(z.string()).default([]),
  conversationStarters: z.array(z.string()).default([]),
});

export type TradingCardL1 = z.infer<typeof TradingCardL1Schema>;
export type TradingCardL2 = z.infer<typeof TradingCardL2Schema>;
export type TradingCardL3 = z.infer<typeof TradingCardL3Schema>;

// ========== PROFILE OVERRIDES SCHEMA ==========

/**
 * Expertise override schema - supports multiple modes:
 * - null: Hide expertise section completely
 * - string[]: Complete replacement of expertise array
 * - { remove: string[], add: string[] }: Surgical modifications
 */
export const ExpertiseOverrideSchema = z.union([
  z.null(), // Hide completely
  z.array(z.string()), // Complete replacement
  z.object({
    remove: z.array(z.string()).default([]), // Tags to remove from base
    add: z.array(z.string()).default([]),    // Tags to add
  }),
]);

/**
 * Profile overrides schema - sparse object containing only overridden fields.
 *
 * Semantics:
 * - Field absent: Use base profile value (inherited)
 * - Field = null: Hide this field completely
 * - Field = value: Display this value instead of base
 */
export const ProfileOverridesSchema = z.object({
  role: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  expertise: ExpertiseOverrideSchema.optional(),
  currentFocus: z.string().nullable().optional(),
}).strict();

export type ProfileOverrides = z.infer<typeof ProfileOverridesSchema>;
export type ExpertiseOverride = z.infer<typeof ExpertiseOverrideSchema>;

// ========== ERROR SCHEMA ==========
export const APIErrorSchema = z.object({
  error: z.string(),
  code: z.string(),
  retryable: z.boolean(),
  details: z.unknown().optional(),
});

export type APIError = z.infer<typeof APIErrorSchema>;
