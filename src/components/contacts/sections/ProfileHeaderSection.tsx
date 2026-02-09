'use client';

import { Pencil, MoreHorizontal, Edit, Trash2, Mail } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Contact } from '@/types/contact';
import { getDisplayName, getInitials, getAvatarColor } from '@/types/contact';
import { EditableSection } from './EditableSection';

interface ProfileHeaderSectionProps {
  contact: Contact;
  isEditing: boolean;
  onEditStart: () => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  formData: Partial<Contact>;
  updateField: <K extends keyof Contact>(field: K, value: Contact[K]) => void;
  onDelete: () => void;
  isDeleting: boolean;
}

export function ProfileHeaderSection({
  contact,
  isEditing,
  onEditStart,
  onSave,
  onCancel,
  isSaving,
  formData,
  updateField,
  onDelete,
  isDeleting,
}: ProfileHeaderSectionProps) {
  // Build subtitle from title, organizationalTitle, and company
  const buildSubtitle = (c: Partial<Contact>) => {
    const parts: string[] = [];
    if (c.organizationalTitle) parts.push(c.organizationalTitle);
    if (c.title) parts.push(c.title);
    if (c.company) {
      if (parts.length > 0) {
        return `${parts.join(', ')} at ${c.company}`;
      }
      return c.company;
    }
    return parts.join(', ');
  };

  const subtitle = buildSubtitle(contact);

  return (
    <EditableSection
      title="Profile"
      sectionId="profileHeader"
      isEditing={isEditing}
      onEditStart={onEditStart}
      onSave={onSave}
      onCancel={onCancel}
      isSaving={isSaving}
      hideTitle
      editContent={
        <div className="space-y-4">
          {/* Name row */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName || ''}
                onChange={(e) => updateField('firstName', e.target.value)}
                placeholder="First name"
                className="h-12 md:h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName || ''}
                onChange={(e) => updateField('lastName', e.target.value)}
                placeholder="Last name"
                className="h-12 md:h-10"
              />
            </div>
          </div>

          {/* Professional info row */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Job Role</Label>
              <Input
                id="title"
                value={formData.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="e.g., Software Engineer"
                className="h-12 md:h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organizationalTitle">Position</Label>
              <Input
                id="organizationalTitle"
                value={formData.organizationalTitle || ''}
                onChange={(e) => updateField('organizationalTitle', e.target.value)}
                placeholder="e.g., VP of Engineering"
                className="h-12 md:h-10"
              />
            </div>
          </div>

          {/* Company */}
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={formData.company || ''}
              onChange={(e) => updateField('company', e.target.value)}
              placeholder="Company name"
              className="h-12 md:h-10"
            />
          </div>
        </div>
      }
    >
      {/* View Mode */}
      <div className="flex items-start justify-between">
        <div className="flex gap-5">
          <Avatar className="h-20 w-20">
            <AvatarFallback
              style={{ background: getAvatarColor(contact) }}
              className="text-2xl font-semibold text-white/90"
            >
              {getInitials(contact)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">{getDisplayName(contact)}</h1>
              <button
                onClick={onEditStart}
                className="rounded-md p-1.5 text-text-tertiary opacity-100 transition-opacity hover:bg-white/5 hover:text-white md:opacity-0 md:group-hover:opacity-100"
                aria-label="Edit profile"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            {subtitle ? (
              <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
            ) : (
              <button
                onClick={onEditStart}
                className="mt-1 text-sm italic text-text-tertiary hover:text-text-secondary"
              >
                Add title and company...
              </button>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/contacts/${contact.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit All Fields
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Mail className="mr-2 h-4 w-4" />
              Draft Intro
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              disabled={isDeleting}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </EditableSection>
  );
}
