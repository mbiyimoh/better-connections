export type TagCategory = 'RELATIONSHIP' | 'OPPORTUNITY' | 'EXPERTISE' | 'INTEREST';
export type ContactSource = 'MANUAL' | 'CSV' | 'GOOGLE' | 'LINKEDIN' | 'ICLOUD' | 'OUTLOOK';

export interface Tag {
  id: string;
  text: string;
  category: TagCategory;
  contactId: string;
}

export interface Contact {
  id: string;
  userId: string;

  // Name fields (split)
  firstName: string;
  lastName: string | null;

  // Email fields (primary/secondary)
  primaryEmail: string | null;
  secondaryEmail: string | null;

  // Phone fields (primary/secondary)
  primaryPhone: string | null;
  secondaryPhone: string | null;

  // Other fields
  title: string | null; // Job role (e.g., "Venture Capitalist", "Software Engineer")
  organizationalTitle: string | null; // Position within organization (e.g., "President", "VP of Engineering")
  company: string | null;
  location: string | null;
  linkedinUrl: string | null;
  howWeMet: string | null;
  relationshipStrength: number;
  lastContactDate: string | null;
  relationshipHistory: string | null;
  whyNow: string | null;
  expertise: string | null;
  interests: string | null;
  notes: string | null;
  enrichmentScore: number;
  source: ContactSource;
  createdAt: string;
  updatedAt: string;
  lastEnrichedAt: string | null;
  tags: Tag[];
}

// Helper function for display name
export function getDisplayName(contact: { firstName: string; lastName?: string | null }): string {
  return contact.lastName
    ? `${contact.firstName} ${contact.lastName}`
    : contact.firstName;
}

// Helper for sorting (lastName first)
export function getSortableName(contact: { firstName: string; lastName?: string | null }): string {
  return contact.lastName
    ? `${contact.lastName}, ${contact.firstName}`
    : contact.firstName;
}

// Helper for initials
export function getInitials(contact: { firstName: string; lastName?: string | null }): string {
  const first = contact.firstName.charAt(0).toUpperCase();
  const last = contact.lastName?.charAt(0).toUpperCase() || '';
  return first + last;
}

// Helper for avatar gradient color based on name
export function getAvatarColor(contact: { firstName: string; lastName?: string | null }): string {
  const name = `${contact.firstName}${contact.lastName || ''}`;
  const hue = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
  return `linear-gradient(135deg, hsl(${hue}, 60%, 40%), hsl(${(hue + 60) % 360}, 60%, 30%))`;
}

export interface ContactsResponse {
  contacts: Contact[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
