/**
 * Shared types for VCF import functionality.
 * Centralized to avoid duplication across components and API routes.
 */

import type { ParsedContact, FieldConflict } from './vcf-parser';

/**
 * Preview of a contact (existing or new) for duplicate review UI.
 * Lightweight version for display purposes.
 */
export interface ContactPreview {
  id?: string;  // Only present for existing contacts
  firstName: string;
  lastName: string | null;
  primaryEmail: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  vcfIndex?: number;  // Only present for new contacts from VCF
}

/**
 * Group of contacts that share the same normalized name.
 * Used for same-name duplicate detection.
 */
export interface SameNameGroup {
  normalizedName: string;
  existingContacts: ContactPreview[];
  newContacts: ContactPreview[];
}

/**
 * Full existing contact data for merge conflict resolution.
 * Includes all fields needed for field-by-field comparison.
 */
export interface ExistingContact {
  id: string;
  firstName: string;
  lastName: string | null;
  primaryEmail: string | null;
  secondaryEmail: string | null;
  primaryPhone: string | null;
  secondaryPhone: string | null;
  title: string | null;
  company: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  notes: string | null;
  enrichmentScore: number;
}

/**
 * Analysis of a duplicate contact pair with conflicts and auto-merge info.
 */
export interface DuplicateAnalysis {
  incoming: ParsedContact;
  existing: ExistingContact;
  conflicts: FieldConflict[];
  autoMergeFields: string[];
}

/**
 * User's decision for how to handle a same-name duplicate group.
 */
export type SameNameDecision =
  | { action: 'merge' }           // Merge all into one contact
  | { action: 'keep_separate' }   // Import all as separate contacts
  | { action: 'skip_new' };       // Skip new contacts, keep existing only

/**
 * User's decision for how to handle an email-based duplicate.
 */
export interface DuplicateResolution {
  existingContactId: string;
  incoming: ParsedContact;
  action: 'skip' | 'merge';
  fieldDecisions?: Array<{ field: string; choice: 'keep' | 'use_new' }>;
}

/**
 * Summary of import results after commit.
 */
export interface ImportSummary {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ tempId: string; error: string }>;
}
