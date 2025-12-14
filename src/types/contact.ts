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
  name: string;
  email: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  linkedinUrl: string | null;
  phone: string | null;
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

export interface ContactsResponse {
  contacts: Contact[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
