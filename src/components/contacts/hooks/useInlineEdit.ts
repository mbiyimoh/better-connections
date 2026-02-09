'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { Contact } from '@/types/contact';
import {
  profileHeaderSchema,
  contactInfoSchema,
  socialLinksSchema,
  relationshipSchema,
  whyNowSchema,
  expertiseInterestsSchema,
  notesSchema,
  type SectionId,
} from '@/lib/validations/contact-sections';

// Map section IDs to their validation schemas
const SECTION_SCHEMAS = {
  profileHeader: profileHeaderSchema,
  contactInfo: contactInfoSchema,
  socialLinks: socialLinksSchema,
  relationship: relationshipSchema,
  whyNow: whyNowSchema,
  expertiseInterests: expertiseInterestsSchema,
  notes: notesSchema,
} as const;

interface UseInlineEditOptions {
  contact: Contact;
  onScoreImproved?: (previousScore: number, newScore: number) => void;
}

interface UseInlineEditReturn {
  editingSection: string | null;
  startEditing: (sectionId: string) => void;
  formData: Partial<Contact>;
  updateField: <K extends keyof Contact>(field: K, value: Contact[K]) => void;
  saveSection: (sectionId: string, fields: readonly (keyof Contact)[]) => Promise<boolean>;
  cancelEdit: () => void;
  isSaving: boolean;
  localContact: Contact;
}

export function useInlineEdit({ contact, onScoreImproved }: UseInlineEditOptions): UseInlineEditReturn {
  const router = useRouter();
  const { toast } = useToast();

  const [localContact, setLocalContact] = useState<Contact>(contact);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Contact>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Sync local contact with prop when it changes (e.g., after router.refresh())
  useEffect(() => {
    setLocalContact(contact);
  }, [contact]);

  const startEditing = useCallback((sectionId: string) => {
    // Initialize form data with current values
    setFormData({ ...localContact });
    setEditingSection(sectionId);
  }, [localContact]);

  const updateField = useCallback(<K extends keyof Contact>(field: K, value: Contact[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingSection(null);
    setFormData({});
  }, []);

  const saveSection = useCallback(async (sectionId: string, fields: readonly (keyof Contact)[]): Promise<boolean> => {
    setIsSaving(true);
    const previousScore = localContact.enrichmentScore;

    try {
      // Build payload with only the section's fields
      const payload: Record<string, unknown> = {};
      for (const field of fields) {
        // Convert empty strings to null for nullable fields
        const value = formData[field];
        payload[field] = value === '' ? null : value ?? null;
      }

      // Client-side validation
      const schema = SECTION_SCHEMAS[sectionId as SectionId];
      if (schema) {
        const result = schema.safeParse(payload);
        if (!result.success) {
          const errors = result.error.flatten().fieldErrors;
          const firstError = Object.values(errors)[0]?.[0];
          toast({
            title: 'Validation Error',
            description: firstError || 'Please check your input',
            variant: 'destructive',
          });
          setIsSaving(false);
          return false;
        }
      }

      const response = await fetch(`/api/contacts/${localContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to save');
      }

      const updatedContact = await response.json();
      setLocalContact(updatedContact);
      setEditingSection(null);
      setFormData({});

      // Check for score improvement
      if (updatedContact.enrichmentScore > previousScore && onScoreImproved) {
        onScoreImproved(previousScore, updatedContact.enrichmentScore);
      }

      router.refresh();
      return true;
    } catch (error) {
      // Distinguish network errors from other errors
      const isNetworkError = error instanceof TypeError ||
        (error instanceof Error && error.message.includes('fetch'));

      toast({
        title: isNetworkError ? 'Network Error' : 'Error saving',
        description: isNetworkError
          ? 'Could not save changes. Please check your connection and try again.'
          : (error instanceof Error ? error.message : 'Please try again'),
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [localContact, formData, router, toast, onScoreImproved]);

  return {
    editingSection,
    startEditing,
    formData,
    updateField,
    saveSection,
    cancelEdit,
    isSaving,
    localContact,
  };
}
