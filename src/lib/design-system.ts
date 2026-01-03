/**
 * Centralized design system constants for Better Connections.
 * See CLAUDE.md for full design system documentation.
 */

import type { TagCategory } from "@/types/contact";

/**
 * Brand gold color values used throughout the application.
 * Primary accent color for the 33 Strategies brand.
 */
export const BRAND_GOLD = {
  primary: "#C9A227",
  light: "#E5C766",
  subtle: "rgba(201, 162, 39, 0.15)",
  border: "rgba(201, 162, 39, 0.30)",
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
