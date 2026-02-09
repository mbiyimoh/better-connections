'use client';

import { Mail, Phone, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatPhoneForDisplay } from '@/lib/phone';
import type { Contact } from '@/types/contact';
import { EditableSection } from './EditableSection';

interface ContactInfoSectionProps {
  contact: Contact;
  isEditing: boolean;
  onEditStart: () => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  formData: Partial<Contact>;
  updateField: <K extends keyof Contact>(field: K, value: Contact[K]) => void;
}

export function ContactInfoSection({
  contact,
  isEditing,
  onEditStart,
  onSave,
  onCancel,
  isSaving,
  formData,
  updateField,
}: ContactInfoSectionProps) {
  const hasAnyValue = contact.primaryEmail || contact.secondaryEmail ||
    contact.primaryPhone || contact.secondaryPhone || contact.location;

  // Handle phone blur to format
  const handlePhoneBlur = (field: 'primaryPhone' | 'secondaryPhone') => {
    const value = formData[field];
    if (value) {
      updateField(field, formatPhoneForDisplay(value));
    }
  };

  return (
    <EditableSection
      title="Contact Information"
      sectionId="contactInfo"
      isEditing={isEditing}
      onEditStart={onEditStart}
      onSave={onSave}
      onCancel={onCancel}
      isSaving={isSaving}
      editContent={
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="primaryEmail">Primary Email</Label>
            <Input
              id="primaryEmail"
              type="email"
              value={formData.primaryEmail || ''}
              onChange={(e) => updateField('primaryEmail', e.target.value)}
              placeholder="john@example.com"
              className="h-12 md:h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondaryEmail">Secondary Email</Label>
            <Input
              id="secondaryEmail"
              type="email"
              value={formData.secondaryEmail || ''}
              onChange={(e) => updateField('secondaryEmail', e.target.value)}
              placeholder="john.doe@work.com"
              className="h-12 md:h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="primaryPhone">Primary Phone</Label>
            <Input
              id="primaryPhone"
              type="tel"
              value={formData.primaryPhone || ''}
              onChange={(e) => updateField('primaryPhone', e.target.value)}
              onBlur={() => handlePhoneBlur('primaryPhone')}
              placeholder="(555) 123-4567"
              className="h-12 md:h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondaryPhone">Secondary Phone</Label>
            <Input
              id="secondaryPhone"
              type="tel"
              value={formData.secondaryPhone || ''}
              onChange={(e) => updateField('secondaryPhone', e.target.value)}
              onBlur={() => handlePhoneBlur('secondaryPhone')}
              placeholder="(555) 987-6543"
              className="h-12 md:h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location || ''}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder="City, State"
              className="h-12 md:h-10"
            />
          </div>
        </div>
      }
    >
      {/* View Mode */}
      <div className="space-y-3">
        {contact.primaryEmail ? (
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 shrink-0 text-text-tertiary" />
            <a href={`mailto:${contact.primaryEmail}`} className="text-white hover:text-gold-primary">
              {contact.primaryEmail}
            </a>
          </div>
        ) : (
          <button
            onClick={onEditStart}
            className="flex items-center gap-3 text-text-tertiary hover:text-text-secondary"
          >
            <Mail className="h-4 w-4 shrink-0" />
            <span className="italic">Add email...</span>
          </button>
        )}

        {contact.secondaryEmail && (
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 shrink-0 text-text-tertiary opacity-50" />
            <a href={`mailto:${contact.secondaryEmail}`} className="text-text-secondary hover:text-gold-primary">
              {contact.secondaryEmail}
            </a>
          </div>
        )}

        {contact.primaryPhone ? (
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 shrink-0 text-text-tertiary" />
            <a href={`tel:${contact.primaryPhone}`} className="text-white hover:text-gold-primary">
              {formatPhoneForDisplay(contact.primaryPhone)}
            </a>
          </div>
        ) : (
          <button
            onClick={onEditStart}
            className="flex items-center gap-3 text-text-tertiary hover:text-text-secondary"
          >
            <Phone className="h-4 w-4 shrink-0" />
            <span className="italic">Add phone...</span>
          </button>
        )}

        {contact.secondaryPhone && (
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 shrink-0 text-text-tertiary opacity-50" />
            <a href={`tel:${contact.secondaryPhone}`} className="text-text-secondary hover:text-gold-primary">
              {formatPhoneForDisplay(contact.secondaryPhone)}
            </a>
          </div>
        )}

        {contact.location ? (
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 shrink-0 text-text-tertiary" />
            <span className="text-text-secondary">{contact.location}</span>
          </div>
        ) : (
          <button
            onClick={onEditStart}
            className="flex items-center gap-3 text-text-tertiary hover:text-text-secondary"
          >
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="italic">Add location...</span>
          </button>
        )}
      </div>
    </EditableSection>
  );
}
