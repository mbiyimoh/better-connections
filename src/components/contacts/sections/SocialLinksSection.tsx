'use client';

import { Linkedin, Twitter, Github, Instagram, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Contact } from '@/types/contact';
import { EditableSection } from './EditableSection';

interface SocialLinksSectionProps {
  contact: Contact;
  isEditing: boolean;
  onEditStart: () => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  formData: Partial<Contact>;
  updateField: <K extends keyof Contact>(field: K, value: Contact[K]) => void;
}

const socialLinks = [
  { field: 'linkedinUrl' as const, icon: Linkedin, label: 'LinkedIn', placeholder: 'https://linkedin.com/in/...', displayName: 'LinkedIn Profile' },
  { field: 'twitterUrl' as const, icon: Twitter, label: 'Twitter/X', placeholder: 'https://twitter.com/...', displayName: 'Twitter/X Profile' },
  { field: 'githubUrl' as const, icon: Github, label: 'GitHub', placeholder: 'https://github.com/...', displayName: 'GitHub Profile' },
  { field: 'instagramUrl' as const, icon: Instagram, label: 'Instagram', placeholder: 'https://instagram.com/...', displayName: 'Instagram Profile' },
  { field: 'websiteUrl' as const, icon: Globe, label: 'Website', placeholder: 'https://example.com', displayName: 'Website' },
];

export function SocialLinksSection({
  contact,
  isEditing,
  onEditStart,
  onSave,
  onCancel,
  isSaving,
  formData,
  updateField,
}: SocialLinksSectionProps) {
  const hasAnyLink = socialLinks.some((link) => contact[link.field]);

  return (
    <EditableSection
      title="Social & Web"
      sectionId="socialLinks"
      isEditing={isEditing}
      onEditStart={onEditStart}
      onSave={onSave}
      onCancel={onCancel}
      isSaving={isSaving}
      editContent={
        <div className="space-y-4">
          {socialLinks.map(({ field, label, placeholder }) => (
            <div key={field} className="space-y-2">
              <Label htmlFor={field}>{label}</Label>
              <Input
                id={field}
                type="url"
                value={formData[field] || ''}
                onChange={(e) => updateField(field, e.target.value)}
                placeholder={placeholder}
                className="h-12 md:h-10"
              />
            </div>
          ))}
        </div>
      }
    >
      {/* View Mode */}
      <div className="space-y-3">
        {socialLinks.map(({ field, icon: Icon, displayName }) => {
          const value = contact[field];
          return value ? (
            <div key={field} className="flex items-center gap-3">
              <Icon className="h-4 w-4 shrink-0 text-text-tertiary" />
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-gold-primary"
              >
                {displayName}
              </a>
            </div>
          ) : null;
        })}

        {/* If no links, show placeholder */}
        {!hasAnyLink && (
          <button
            onClick={onEditStart}
            className="flex items-center gap-3 text-text-tertiary hover:text-text-secondary"
          >
            <Globe className="h-4 w-4 shrink-0" />
            <span className="italic">Add social links...</span>
          </button>
        )}
      </div>
    </EditableSection>
  );
}
