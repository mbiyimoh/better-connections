'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Contact } from '@/types/contact';
import { EditableSection } from './EditableSection';

interface ExpertiseInterestsSectionProps {
  contact: Contact;
  isEditing: boolean;
  onEditStart: () => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  formData: Partial<Contact>;
  updateField: <K extends keyof Contact>(field: K, value: Contact[K]) => void;
}

export function ExpertiseInterestsSection({
  contact,
  isEditing,
  onEditStart,
  onSave,
  onCancel,
  isSaving,
  formData,
  updateField,
}: ExpertiseInterestsSectionProps) {
  const hasAnyValue = contact.expertise || contact.interests;

  return (
    <EditableSection
      title="Expertise & Interests"
      sectionId="expertiseInterests"
      isEditing={isEditing}
      onEditStart={onEditStart}
      onSave={onSave}
      onCancel={onCancel}
      isSaving={isSaving}
      editContent={
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="expertise">Expertise</Label>
            <Textarea
              id="expertise"
              value={formData.expertise || ''}
              onChange={(e) => updateField('expertise', e.target.value)}
              placeholder="SaaS growth, product-led growth..."
              rows={3}
              className="min-h-[80px] md:min-h-[60px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interests">Interests</Label>
            <Textarea
              id="interests"
              value={formData.interests || ''}
              onChange={(e) => updateField('interests', e.target.value)}
              placeholder="AI/ML, investing, hiking..."
              rows={3}
              className="min-h-[80px] md:min-h-[60px]"
            />
          </div>
        </div>
      }
    >
      {/* View Mode */}
      {hasAnyValue ? (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm text-text-tertiary">Expertise</p>
            {contact.expertise ? (
              <p className="text-white">{contact.expertise}</p>
            ) : (
              <button
                onClick={onEditStart}
                className="italic text-text-tertiary hover:text-text-secondary"
              >
                Add expertise...
              </button>
            )}
          </div>
          <div>
            <p className="mb-2 text-sm text-text-tertiary">Interests</p>
            {contact.interests ? (
              <p className="text-white">{contact.interests}</p>
            ) : (
              <button
                onClick={onEditStart}
                className="italic text-text-tertiary hover:text-text-secondary"
              >
                Add interests...
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={onEditStart}
          className="italic text-text-tertiary hover:text-text-secondary"
        >
          Add expertise and interests...
        </button>
      )}
    </EditableSection>
  );
}
