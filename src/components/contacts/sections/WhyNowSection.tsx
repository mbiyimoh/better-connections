'use client';

import { Sparkles } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import type { Contact } from '@/types/contact';
import { EditableSection } from './EditableSection';

interface WhyNowSectionProps {
  contact: Contact;
  isEditing: boolean;
  onEditStart: () => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  formData: Partial<Contact>;
  updateField: <K extends keyof Contact>(field: K, value: Contact[K]) => void;
}

export function WhyNowSection({
  contact,
  isEditing,
  onEditStart,
  onSave,
  onCancel,
  isSaving,
  formData,
  updateField,
}: WhyNowSectionProps) {
  return (
    <EditableSection
      title="Why Now"
      sectionId="whyNow"
      isEditing={isEditing}
      onEditStart={onEditStart}
      onSave={onSave}
      onCancel={onCancel}
      isSaving={isSaving}
      variant="gold"
      headerIcon={<Sparkles className="h-4 w-4" />}
      editContent={
        <Textarea
          value={formData.whyNow || ''}
          onChange={(e) => updateField('whyNow', e.target.value)}
          placeholder="What makes this contact relevant right now?"
          rows={4}
          className="min-h-[100px] md:min-h-[80px]"
        />
      }
    >
      {/* View Mode */}
      {contact.whyNow ? (
        <p className="text-white">{contact.whyNow}</p>
      ) : (
        <button
          onClick={onEditStart}
          className="italic text-gold-primary/60 hover:text-gold-primary"
        >
          What makes this contact relevant right now?
        </button>
      )}
    </EditableSection>
  );
}
