/**
 * Centralized design system constants for Better Contacts.
 * See CLAUDE.md for full design system documentation.
 */

import type { TagCategory } from "@/types/contact";

/**
 * Brand gold color values used throughout the application.
 * Primary accent color for the 33 Strategies brand.
 */
export const BRAND_GOLD = {
  primary: "#d4a54a",
  light: "#e5c766",
  subtle: "rgba(212, 165, 74, 0.15)",
  border: "rgba(212, 165, 74, 0.30)",
  glow: "rgba(212, 165, 74, 0.3)",
} as const;

/**
 * Gold foil gradient text effect.
 * IMPORTANT: Use CSS classes .gold-foil-text / .gold-foil-text-mobile (defined in globals.css)
 * instead of inline styles. React inline styles with WebkitBackgroundClip don't reliably
 * produce the correct -webkit-background-clip vendor prefix on Chrome mobile,
 * causing gold rectangles instead of gradient text.
 */

/**
 * Gold foil style for buttons/backgrounds (not text)
 */
export const GOLD_FOIL_BUTTON = {
  background: "linear-gradient(135deg, #8B6914 0%, #cb9b51 22%, #f6e27a 45%, #f6f2c0 50%, #f6e27a 55%, #cb9b51 78%, #8B6914 100%)",
  color: "#1a1a1f",
  fontWeight: 600,
  textShadow: "none",
} as const;

/**
 * Tag category color definitions.
 * Each category has consistent styling across the entire application.
 */
export const TAG_CATEGORY_COLORS: Record<
  TagCategory,
  { bg: string; text: string; dot: string; border: string }
> = {
  RELATIONSHIP: {
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    dot: "bg-blue-400",
    border: "border-blue-500/30",
  },
  OPPORTUNITY: {
    bg: "bg-green-500/20",
    text: "text-green-400",
    dot: "bg-green-400",
    border: "border-green-500/30",
  },
  EXPERTISE: {
    bg: "bg-purple-500/20",
    text: "text-purple-400",
    dot: "bg-purple-400",
    border: "border-purple-500/30",
  },
  INTEREST: {
    bg: "bg-amber-500/20",
    text: "text-amber-400",
    dot: "bg-amber-400",
    border: "border-amber-500/30",
  },
} as const;

/**
 * Default colors for unknown tag categories.
 * Used as fallback when category doesn't match known values.
 */
export const DEFAULT_TAG_COLORS = {
  bg: "bg-blue-500/20",
  text: "text-blue-400",
  dot: "bg-blue-400",
  border: "border-blue-500/30",
} as const;

/**
 * Bubble category type (lowercase version of TagCategory).
 * Used in enrichment UI components.
 */
export type BubbleCategory = "relationship" | "opportunity" | "expertise" | "interest";

/**
 * Bubble category color definitions (lowercase keys).
 * Same colors as TAG_CATEGORY_COLORS but with lowercase keys for bubble components.
 */
export const BUBBLE_CATEGORY_COLORS: Record<
  BubbleCategory,
  { bg: string; text: string; dot: string; border: string }
> = {
  relationship: TAG_CATEGORY_COLORS.RELATIONSHIP,
  opportunity: TAG_CATEGORY_COLORS.OPPORTUNITY,
  expertise: TAG_CATEGORY_COLORS.EXPERTISE,
  interest: TAG_CATEGORY_COLORS.INTEREST,
} as const;

/**
 * Bubble category display labels.
 */
export const BUBBLE_CATEGORY_LABELS: Record<BubbleCategory, string> = {
  relationship: "Relationship",
  opportunity: "Opportunity",
  expertise: "Expertise",
  interest: "Interest",
} as const;

// ============================================
// M33T Event RSVP Status Colors
// ============================================

/**
 * RSVP status type for event attendees.
 */
export type RSVPStatus = 'confirmed' | 'maybe' | 'invited';

/**
 * RSVP status color definitions for event landing pages.
 * Used in AttendeeCard, ProfileModal, and AttendeeCarousel components.
 */
export const RSVP_STATUS_COLORS: Record<RSVPStatus, string> = {
  confirmed: 'bg-emerald-500',
  maybe: 'bg-amber-500',
  invited: 'bg-zinc-600',
} as const;

// ============================================
// Feedback System Colors
// ============================================

import type { FeedbackStatus, FeedbackType } from "@/lib/validations/feedback";

/**
 * Feedback status color definitions.
 * Used in StatusBadge and StatusSelector components.
 */
export const FEEDBACK_STATUS_COLORS: Record<FeedbackStatus, string> = {
  OPEN: "bg-bg-tertiary text-text-secondary",
  IN_REVIEW: "bg-blue-500/20 text-blue-400",
  PLANNED: "bg-purple-500/20 text-purple-400",
  IN_PROGRESS: "bg-amber-500/20 text-amber-400",
  COMPLETED: "bg-green-500/20 text-green-400",
  CLOSED: "bg-bg-tertiary text-text-tertiary",
} as const;

/**
 * Feedback type color definitions.
 * Used in FeedbackCard type badges.
 */
export const FEEDBACK_TYPE_COLORS: Record<FeedbackType, string> = {
  BUG: "bg-red-500/20 text-red-400",
  ENHANCEMENT: "bg-blue-500/20 text-blue-400",
  IDEA: "bg-amber-500/20 text-amber-400",
  QUESTION: "bg-purple-500/20 text-purple-400",
} as const;

// ============================================
// File Upload Limits
// ============================================

/**
 * File upload constraints for feedback attachments.
 * Used consistently across client validation, API validation, and storage.
 */
export const FILE_UPLOAD_LIMITS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_SIZE_MB: 10,
  ALLOWED_TYPES: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
  ],
  MAX_FILES_PER_FEEDBACK: 5,
} as const;
