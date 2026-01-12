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
