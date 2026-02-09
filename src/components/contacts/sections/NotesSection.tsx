'use client';

import { Textarea } from '@/components/ui/textarea';
import type { Contact } from '@/types/contact';
import { EditableSection } from './EditableSection';

interface NotesSectionProps {
  contact: Contact;
  isEditing: boolean;
  onEditStart: () => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  formData: Partial<Contact>;
  updateField: <K extends keyof Contact>(field: K, value: Contact[K]) => void;
}

export function NotesSection({
  contact,
  isEditing,
  onEditStart,
  onSave,
  onCancel,
  isSaving,
  formData,
  updateField,
}: NotesSectionProps) {
  return (
    <EditableSection
      title="Notes"
      sectionId="notes"
      isEditing={isEditing}
      onEditStart={onEditStart}
      onSave={onSave}
      onCancel={onCancel}
      isSaving={isSaving}
      editContent={
        <Textarea
          value={formData.notes || ''}
          onChange={(e) => updateField('notes', e.target.value)}
          placeholder="Any other notes about this contact..."
          rows={4}
          className="min-h-[100px] md:min-h-[80px]"
        />
      }
    >
      {/* View Mode */}
      {contact.notes ? (
        <p className="text-white whitespace-pre-wrap">{contact.notes}</p>
      ) : (
        <button
          onClick={onEditStart}
          className="italic text-text-tertiary hover:text-text-secondary"
        >
          Add notes...
        </button>
      )}
    </EditableSection>
  );
}
