# Task Breakdown: Smart CSV Import with Schema Modernization

**Generated:** 2025-12-25
**Source:** specs/smart-csv-import-mapping/02-specification.md
**Feature Slug:** smart-csv-import-mapping
**Last Decompose:** 2025-12-25

---

## Overview

This task breakdown covers the implementation of schema modernization (firstName/lastName, primary/secondary email and phone) combined with smart CSV import functionality that hides empty columns and offers to merge unmapped data into notes.

**Total Tasks:** 25
**Phases:** 5
**Critical Path:** Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

---

## Phase 1: Schema Migration (5 tasks)

### Task 1.1: Update Prisma Schema with New Fields
**Description:** Add new split fields to Contact model while keeping old fields temporarily
**Size:** Medium
**Priority:** Critical
**Dependencies:** None
**Can run parallel with:** None (foundational)

**Technical Requirements:**
- Add `firstName` (String, required)
- Add `lastName` (String?, optional)
- Add `primaryEmail` (String?, optional)
- Add `secondaryEmail` (String?, optional)
- Add `primaryPhone` (String?, optional)
- Add `secondaryPhone` (String?, optional)
- Keep old `name`, `email`, `phone` fields temporarily
- Update indexes for new fields

**Implementation:**
```prisma
model Contact {
  id                    String    @id @default(uuid())
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // NEW: Split name fields
  firstName             String
  lastName              String?

  // NEW: Split email fields
  primaryEmail          String?
  secondaryEmail        String?

  // NEW: Split phone fields
  primaryPhone          String?
  secondaryPhone        String?

  // DEPRECATED: Keep temporarily for migration
  name                  String?   // Was required, now optional during migration
  email                 String?
  phone                 String?

  // Rest unchanged...
  title                 String?
  company               String?
  location              String?
  linkedinUrl           String?
  howWeMet              String?   @db.Text
  relationshipStrength  Int       @default(1)
  lastContactDate       DateTime?
  relationshipHistory   String?   @db.Text
  whyNow                String?   @db.Text
  expertise             String?   @db.Text
  interests             String?   @db.Text
  notes                 String?   @db.Text
  enrichmentScore       Int       @default(0)
  source                ContactSource @default(MANUAL)
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  lastEnrichedAt        DateTime?
  tags                  Tag[]

  @@index([userId])
  @@index([firstName])
  @@index([lastName])
  @@index([primaryEmail])
  @@index([enrichmentScore])
}
```

**Acceptance Criteria:**
- [ ] Schema compiles without errors
- [ ] New fields added with correct types
- [ ] Old fields made optional (for migration period)
- [ ] Indexes added on firstName, lastName, primaryEmail

---

### Task 1.2: Create Data Migration Script
**Description:** Migrate existing data from old fields to new fields
**Size:** Medium
**Priority:** Critical
**Dependencies:** Task 1.1
**Can run parallel with:** None

**Technical Requirements:**
- Split `name` into `firstName` and `lastName` (split on first space)
- Copy `email` to `primaryEmail`
- Copy `phone` to `primaryPhone`
- Handle edge cases (single-word names, empty values)

**Implementation:**
```sql
-- Migration script for existing data
-- Step 1: Populate firstName from name (first word)
UPDATE "Contact" SET
  "firstName" = SPLIT_PART("name", ' ', 1)
WHERE "name" IS NOT NULL AND "firstName" IS NULL;

-- Step 2: Populate lastName from name (everything after first space)
UPDATE "Contact" SET
  "lastName" = CASE
    WHEN POSITION(' ' IN "name") > 0
    THEN SUBSTRING("name" FROM POSITION(' ' IN "name") + 1)
    ELSE NULL
  END
WHERE "name" IS NOT NULL AND "lastName" IS NULL;

-- Step 3: Copy email to primaryEmail
UPDATE "Contact" SET "primaryEmail" = "email"
WHERE "email" IS NOT NULL AND "primaryEmail" IS NULL;

-- Step 4: Copy phone to primaryPhone
UPDATE "Contact" SET "primaryPhone" = "phone"
WHERE "phone" IS NOT NULL AND "primaryPhone" IS NULL;
```

**Acceptance Criteria:**
- [ ] All existing contacts have firstName populated
- [ ] lastName populated for multi-word names
- [ ] primaryEmail contains previous email values
- [ ] primaryPhone contains previous phone values
- [ ] No data loss during migration

---

### Task 1.3: Update TypeScript Contact Interface
**Description:** Update Contact type definition to reflect new schema
**Size:** Small
**Priority:** Critical
**Dependencies:** Task 1.1
**Can run parallel with:** Task 1.2

**File:** `src/types/contact.ts`

**Implementation:**
```typescript
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

  // Other fields unchanged
  title: string | null;
  company: string | null;
  location: string | null;
  linkedinUrl: string | null;
  howWeMet: string | null;
  relationshipStrength: number;
  lastContactDate: Date | null;
  relationshipHistory: string | null;
  whyNow: string | null;
  expertise: string | null;
  interests: string | null;
  notes: string | null;
  enrichmentScore: number;
  source: 'MANUAL' | 'CSV' | 'GOOGLE' | 'LINKEDIN' | 'ICLOUD' | 'OUTLOOK';
  createdAt: Date;
  updatedAt: Date;
  lastEnrichedAt: Date | null;
  tags: Tag[];
}

// Helper function for display
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
```

**Acceptance Criteria:**
- [ ] Contact interface updated with new fields
- [ ] Old fields removed from interface
- [ ] Helper functions added for name display
- [ ] TypeScript compiles without errors

---

### Task 1.4: Update Zod Validation Schemas
**Description:** Update all Zod schemas for contact validation
**Size:** Medium
**Priority:** Critical
**Dependencies:** Task 1.3
**Can run parallel with:** None

**File:** `src/lib/validations/contact.ts`

**Implementation:**
```typescript
import { z } from 'zod';

// Base contact schema for creation
export const contactCreateSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional().nullable(),
  primaryEmail: z.string().email().optional().nullable().or(z.literal('')),
  secondaryEmail: z.string().email().optional().nullable().or(z.literal('')),
  primaryPhone: z.string().optional().nullable(),
  secondaryPhone: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  linkedinUrl: z.string().url().optional().nullable().or(z.literal('')),
  howWeMet: z.string().optional().nullable(),
  whyNow: z.string().optional().nullable(),
  expertise: z.string().optional().nullable(),
  interests: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  relationshipStrength: z.number().min(1).max(4).optional(),
});

// Schema for updates (all fields optional)
export const contactUpdateSchema = contactCreateSchema.partial();

// Schema for search/filter params
export const contactQuerySchema = z.object({
  search: z.string().optional(),
  tags: z.string().optional(),
  minScore: z.coerce.number().optional(),
  maxScore: z.coerce.number().optional(),
  source: z.enum(['MANUAL', 'CSV', 'GOOGLE', 'LINKEDIN', 'ICLOUD', 'OUTLOOK']).optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(25),
  sort: z.enum(['firstName', 'lastName', 'primaryEmail', 'company', 'enrichmentScore', 'createdAt', 'updatedAt']).default('lastName'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type ContactCreate = z.infer<typeof contactCreateSchema>;
export type ContactUpdate = z.infer<typeof contactUpdateSchema>;
export type ContactQuery = z.infer<typeof contactQuerySchema>;
```

**Acceptance Criteria:**
- [ ] Create schema validates firstName as required
- [ ] Update schema allows partial updates
- [ ] Query schema supports new sort fields
- [ ] All schemas export types correctly

---

### Task 1.5: Run Migration and Verify
**Description:** Execute Prisma migration and verify data integrity
**Size:** Small
**Priority:** Critical
**Dependencies:** Task 1.1, Task 1.2
**Can run parallel with:** None

**Steps:**
1. Create Prisma migration: `npx prisma migrate dev --name add-split-contact-fields`
2. Run data migration SQL script
3. Verify data integrity with spot checks
4. Regenerate Prisma client: `npx prisma generate`

**Verification Queries:**
```sql
-- Check all contacts have firstName
SELECT COUNT(*) FROM "Contact" WHERE "firstName" IS NULL;
-- Should return 0

-- Check lastName populated for multi-word names
SELECT COUNT(*) FROM "Contact" WHERE "name" LIKE '% %' AND "lastName" IS NULL;
-- Should return 0

-- Check email migration
SELECT COUNT(*) FROM "Contact" WHERE "email" IS NOT NULL AND "primaryEmail" IS NULL;
-- Should return 0
```

**Acceptance Criteria:**
- [ ] Migration runs without errors
- [ ] All existing contacts have firstName
- [ ] Data integrity verified
- [ ] Prisma client regenerated

---

## Phase 2: Backend Updates (7 tasks)

### Task 2.1: Update Enrichment Score Calculation
**Description:** Modify enrichment scoring for new field structure
**Size:** Small
**Priority:** High
**Dependencies:** Phase 1 complete
**Can run parallel with:** Task 2.2, 2.3

**File:** `src/lib/enrichment.ts`

**Implementation:**
```typescript
interface EnrichmentScoreInput {
  firstName: string;
  lastName?: string | null;
  primaryEmail?: string | null;
  secondaryEmail?: string | null;
  primaryPhone?: string | null;
  secondaryPhone?: string | null;
  title?: string | null;
  company?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  howWeMet?: string | null;
  whyNow?: string | null;
  notes?: string | null;
}

export function calculateEnrichmentScore(contact: EnrichmentScoreInput, tagCount: number): number {
  let score = 0;

  // Name: 10 points total (firstName required, lastName bonus)
  if (contact.firstName) score += 7;
  if (contact.lastName) score += 3;

  // Email: 10 points (primary gets full, secondary is bonus)
  if (contact.primaryEmail) score += 8;
  if (contact.secondaryEmail) score += 2;

  // Phone: 5 points
  if (contact.primaryPhone) score += 4;
  if (contact.secondaryPhone) score += 1;

  // Other fields (unchanged weights)
  if (contact.title) score += 10;
  if (contact.company) score += 10;
  if (contact.location) score += 5;
  if (contact.linkedinUrl) score += 5;
  if (contact.howWeMet) score += 15;
  if (contact.whyNow) score += 20;  // Still most valuable
  if (contact.notes) score += 5;
  if (tagCount > 0) score += 5;

  return Math.min(score, 100);
}
```

**Acceptance Criteria:**
- [ ] Score calculation uses new fields
- [ ] firstName + lastName combined = ~10 points
- [ ] primaryEmail weighted higher than secondaryEmail
- [ ] Max score still 100

---

### Task 2.2: Update Contacts API Search/Sort
**Description:** Update GET /api/contacts for new field structure
**Size:** Medium
**Priority:** High
**Dependencies:** Phase 1 complete
**Can run parallel with:** Task 2.1, 2.3

**File:** `src/app/api/contacts/route.ts`

**Key Changes:**
```typescript
// Search across name fields and emails
const where: Prisma.ContactWhereInput = {
  userId: user.id,
  ...(query.search && {
    OR: [
      { firstName: { contains: query.search, mode: 'insensitive' } },
      { lastName: { contains: query.search, mode: 'insensitive' } },
      { primaryEmail: { contains: query.search, mode: 'insensitive' } },
      { secondaryEmail: { contains: query.search, mode: 'insensitive' } },
      { company: { contains: query.search, mode: 'insensitive' } },
      { title: { contains: query.search, mode: 'insensitive' } },
      { notes: { contains: query.search, mode: 'insensitive' } },
    ],
  }),
};

// Sort by lastName by default
const orderBy: Prisma.ContactOrderByWithRelationInput = {
  [query.sort]: query.order,
};

// Select new fields
const contacts = await prisma.contact.findMany({
  where,
  orderBy,
  skip: (query.page - 1) * query.limit,
  take: query.limit,
  select: {
    id: true,
    firstName: true,
    lastName: true,
    primaryEmail: true,
    secondaryEmail: true,
    primaryPhone: true,
    secondaryPhone: true,
    title: true,
    company: true,
    // ... rest of fields
  },
});
```

**Acceptance Criteria:**
- [ ] Search works across firstName, lastName, both emails
- [ ] Default sort is lastName ascending
- [ ] All new fields returned in response
- [ ] Pagination still works correctly

---

### Task 2.3: Update Contact CRUD API
**Description:** Update POST/PUT/DELETE for single contact operations
**Size:** Medium
**Priority:** High
**Dependencies:** Phase 1 complete
**Can run parallel with:** Task 2.1, 2.2

**File:** `src/app/api/contacts/[id]/route.ts`

**Key Changes:**
- Accept firstName/lastName instead of name
- Accept primaryEmail/secondaryEmail instead of email
- Accept primaryPhone/secondaryPhone instead of phone
- Update validation to use new schemas

**Acceptance Criteria:**
- [ ] GET returns new field structure
- [ ] PUT accepts new field structure
- [ ] Validation uses updated Zod schemas
- [ ] Enrichment score recalculated on update

---

### Task 2.4: Update CSV Import API
**Description:** Modify import API to accept new field structure
**Size:** Medium
**Priority:** High
**Dependencies:** Phase 1 complete
**Can run parallel with:** Task 2.5

**File:** `src/app/api/contacts/import/csv/route.ts`

**Implementation:**
```typescript
const importContactSchema = z.object({
  contact: z.object({
    firstName: z.string().min(1),
    lastName: z.string().optional().nullable(),
    primaryEmail: z.string().email().optional().nullable().or(z.literal('')),
    secondaryEmail: z.string().email().optional().nullable().or(z.literal('')),
    primaryPhone: z.string().optional().nullable(),
    secondaryPhone: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    company: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    linkedinUrl: z.string().url().optional().nullable().or(z.literal('')),
    howWeMet: z.string().optional().nullable(),
    whyNow: z.string().optional().nullable(),
    expertise: z.string().optional().nullable(),
    interests: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  }),
  skipDuplicates: z.boolean().default(true),
});

// Check duplicates on primaryEmail
if (skipDuplicates && cleanContact.primaryEmail) {
  const existing = await prisma.contact.findFirst({
    where: {
      userId: user.id,
      primaryEmail: cleanContact.primaryEmail,
    },
  });
  if (existing) {
    return NextResponse.json({ skipped: true, reason: 'duplicate' }, { status: 200 });
  }
}
```

**Acceptance Criteria:**
- [ ] API accepts firstName/lastName
- [ ] API accepts primary/secondary email and phone
- [ ] Duplicate check uses primaryEmail
- [ ] Enrichment score calculated correctly

---

### Task 2.5: Update CSV Export API
**Description:** Update export to include new fields with proper headers
**Size:** Small
**Priority:** Medium
**Dependencies:** Phase 1 complete
**Can run parallel with:** Task 2.4

**File:** `src/app/api/contacts/export/route.ts`

**Key Changes:**
```typescript
const headers = [
  'First Name',
  'Last Name',
  'Primary Email',
  'Secondary Email',
  'Primary Phone',
  'Secondary Phone',
  'Title',
  'Company',
  'Location',
  'LinkedIn URL',
  'How We Met',
  'Why Now',
  'Expertise',
  'Interests',
  'Notes',
  'Relationship Strength',
  'Enrichment Score',
  'Source',
  'Created At',
];

// Map contact to row
const row = [
  contact.firstName,
  contact.lastName || '',
  contact.primaryEmail || '',
  contact.secondaryEmail || '',
  contact.primaryPhone || '',
  contact.secondaryPhone || '',
  // ... rest
];
```

**Acceptance Criteria:**
- [ ] Export includes all new fields
- [ ] Headers clearly labeled
- [ ] Empty fields exported as empty strings
- [ ] CSV valid and importable

---

### Task 2.6: Update Chat/AI Routes
**Description:** Update AI routes to use new name format
**Size:** Small
**Priority:** Medium
**Dependencies:** Phase 1 complete
**Can run parallel with:** Task 2.5

**Files:**
- `src/app/api/chat/draft-intro/route.ts`
- `src/app/api/chat/explore/route.ts`

**Key Changes:**
```typescript
import { getDisplayName } from '@/types/contact';

// In draft-intro
const contactName = getDisplayName(contact);
const context = `Contact: ${contactName}...`;

// In explore
const sanitizedContacts = contacts.map(c => ({
  id: c.id,
  name: getDisplayName(c),
  email: c.primaryEmail,
  // ...
}));
```

**Acceptance Criteria:**
- [ ] AI receives properly formatted names
- [ ] Display name helper used consistently
- [ ] No references to old `name` field

---

### Task 2.7: Update Enrichment Queue API
**Description:** Update queue endpoint for new field structure
**Size:** Small
**Priority:** Medium
**Dependencies:** Phase 1 complete
**Can run parallel with:** Task 2.6

**File:** `src/app/api/enrichment/queue/route.ts`

**Key Changes:**
- Use `getDisplayName()` for contact display
- Update enrichment reasons to reference correct fields

**Acceptance Criteria:**
- [ ] Queue returns contacts with new field structure
- [ ] Display names formatted correctly
- [ ] Enrichment reasons accurate

---

## Phase 3: Form & Display Updates (6 tasks)

### Task 3.1: Update ContactForm Component
**Description:** Split name/email/phone into separate form fields
**Size:** Large
**Priority:** High
**Dependencies:** Phase 2 complete
**Can run parallel with:** Task 3.2

**File:** `src/components/contacts/ContactForm.tsx`

**Key Changes:**
```tsx
// Form fields structure
<div className="grid grid-cols-2 gap-4">
  <div>
    <Label htmlFor="firstName">First Name *</Label>
    <Input
      id="firstName"
      {...register('firstName', { required: 'First name is required' })}
      placeholder="John"
    />
  </div>
  <div>
    <Label htmlFor="lastName">Last Name</Label>
    <Input
      id="lastName"
      {...register('lastName')}
      placeholder="Doe"
    />
  </div>
</div>

<div className="grid grid-cols-2 gap-4">
  <div>
    <Label htmlFor="primaryEmail">Primary Email</Label>
    <Input
      id="primaryEmail"
      type="email"
      {...register('primaryEmail')}
      placeholder="john@example.com"
    />
  </div>
  <div>
    <Label htmlFor="secondaryEmail">Secondary Email</Label>
    <Input
      id="secondaryEmail"
      type="email"
      {...register('secondaryEmail')}
      placeholder="john.doe@work.com"
    />
  </div>
</div>

<div className="grid grid-cols-2 gap-4">
  <div>
    <Label htmlFor="primaryPhone">Primary Phone</Label>
    <Input
      id="primaryPhone"
      {...register('primaryPhone')}
      placeholder="+1 (555) 123-4567"
    />
  </div>
  <div>
    <Label htmlFor="secondaryPhone">Secondary Phone</Label>
    <Input
      id="secondaryPhone"
      {...register('secondaryPhone')}
      placeholder="+1 (555) 987-6543"
    />
  </div>
</div>
```

**Acceptance Criteria:**
- [ ] Form has separate first/last name fields
- [ ] Form has primary/secondary email fields
- [ ] Form has primary/secondary phone fields
- [ ] Validation requires firstName
- [ ] Form submits correct data structure

---

### Task 3.2: Update ContactDetail Component
**Description:** Display new fields in contact detail view
**Size:** Medium
**Priority:** High
**Dependencies:** Phase 2 complete
**Can run parallel with:** Task 3.1

**File:** `src/components/contacts/ContactDetail.tsx`

**Key Changes:**
```tsx
import { getDisplayName } from '@/types/contact';

// Avatar and heading
<Avatar name={getDisplayName(contact)} />
<h1>{getDisplayName(contact)}</h1>

// Contact info section
<div className="space-y-2">
  {contact.primaryEmail && (
    <a href={`mailto:${contact.primaryEmail}`}>
      {contact.primaryEmail}
    </a>
  )}
  {contact.secondaryEmail && (
    <a href={`mailto:${contact.secondaryEmail}`} className="text-text-tertiary">
      {contact.secondaryEmail}
    </a>
  )}
</div>

<div className="space-y-2">
  {contact.primaryPhone && (
    <a href={`tel:${contact.primaryPhone}`}>
      {contact.primaryPhone}
    </a>
  )}
  {contact.secondaryPhone && (
    <a href={`tel:${contact.secondaryPhone}`} className="text-text-tertiary">
      {contact.secondaryPhone}
    </a>
  )}
</div>
```

**Acceptance Criteria:**
- [ ] Name displays as "First Last"
- [ ] Primary email/phone prominent
- [ ] Secondary email/phone shown but de-emphasized
- [ ] All links work correctly

---

### Task 3.3: Update ContactsTable Component
**Description:** Update table display and sorting for new fields
**Size:** Medium
**Priority:** High
**Dependencies:** Phase 2 complete
**Can run parallel with:** Task 3.4

**File:** `src/components/contacts/ContactsTable.tsx`

**Key Changes:**
```tsx
import { getDisplayName } from '@/types/contact';

// Table columns
<TableHead
  sortable
  sortKey="lastName"
  currentSort={sort}
  onSort={handleSort}
>
  Name
</TableHead>
<TableHead sortable sortKey="primaryEmail">Email</TableHead>

// Table cells
<TableCell>
  <div className="flex items-center gap-3">
    <Avatar name={getDisplayName(contact)} size="sm" />
    <span>{getDisplayName(contact)}</span>
  </div>
</TableCell>
<TableCell>{contact.primaryEmail || '-'}</TableCell>
```

**Acceptance Criteria:**
- [ ] Name column shows "First Last"
- [ ] Sort by lastName works
- [ ] Email column shows primaryEmail
- [ ] Avatar uses display name for initials

---

### Task 3.4: Update Chat Components
**Description:** Update ContactCard and DraftIntroModal for new fields
**Size:** Small
**Priority:** Medium
**Dependencies:** Phase 2 complete
**Can run parallel with:** Task 3.3

**Files:**
- `src/components/chat/ContactCard.tsx`
- `src/components/chat/DraftIntroModal.tsx`

**Key Changes:**
- Use `getDisplayName()` for all name displays
- Update any email references to `primaryEmail`

**Acceptance Criteria:**
- [ ] Contact cards show formatted names
- [ ] Draft intro modal uses correct name
- [ ] No references to old `name` field

---

### Task 3.5: Update Enrichment Pages
**Description:** Update enrichment page and session for new fields
**Size:** Small
**Priority:** Medium
**Dependencies:** Phase 2 complete
**Can run parallel with:** Task 3.4

**Files:**
- `src/app/(dashboard)/enrichment/page.tsx`
- `src/app/(dashboard)/enrichment/session/page.tsx`

**Key Changes:**
- Use `getDisplayName()` for contact display
- Update any email fallbacks to use `primaryEmail`

**Acceptance Criteria:**
- [ ] Enrichment queue shows formatted names
- [ ] Session page displays correct contact info
- [ ] No references to old fields

---

### Task 3.6: Update Avatar Helper Functions
**Description:** Update getInitials and getAvatarColor helpers
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 3.1
**Can run parallel with:** Task 3.5

**Implementation:**
```typescript
// Update to work with new name structure
export function getInitials(contact: { firstName: string; lastName?: string | null }): string {
  const first = contact.firstName.charAt(0).toUpperCase();
  const last = contact.lastName?.charAt(0).toUpperCase() || '';
  return first + last;
}

export function getAvatarColor(contact: { firstName: string; lastName?: string | null }): string {
  const name = `${contact.firstName}${contact.lastName || ''}`;
  // Hash the name to get consistent color
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  // ... rest of color generation
}
```

**Acceptance Criteria:**
- [ ] Initials show first letter of each name
- [ ] Avatar color consistent for same contact
- [ ] Works with lastName being null

---

## Phase 4: Smart Import UI (5 tasks)

### Task 4.1: Create CSV Analysis Utility
**Description:** Build column analysis logic for smart import
**Size:** Large
**Priority:** High
**Dependencies:** Phase 3 complete
**Can run parallel with:** None

**File:** `src/lib/csv-analysis.ts` (NEW)

**Implementation:**
```typescript
export interface ColumnAnalysis {
  index: number;
  header: string;
  hasData: boolean;
  sampleValue: string;
  suggestedField: string | null;
}

export interface AnalysisResult {
  totalRows: number;
  populatedColumns: ColumnAnalysis[];
  emptyColumns: string[];
  mappedColumns: ColumnAnalysis[];
  unmappedColumns: ColumnAnalysis[];
}

// Field mapping rules
const fieldMappingRules: Array<{
  field: string;
  patterns: RegExp[];
}> = [
  { field: 'firstName', patterns: [/^first.?name$/i, /^given.?name$/i] },
  { field: 'lastName', patterns: [/^last.?name$/i, /^family.?name$/i, /^surname$/i] },
  { field: 'primaryEmail', patterns: [/^e?.?mail.?1?.?value$/i, /^email$/i, /^e-mail$/i] },
  { field: 'secondaryEmail', patterns: [/^e?.?mail.?2.?value$/i, /^secondary.?email$/i] },
  { field: 'primaryPhone', patterns: [/^phone.?1?.?value$/i, /^phone$/i, /^mobile$/i, /^cell$/i] },
  { field: 'secondaryPhone', patterns: [/^phone.?2.?value$/i, /^work.?phone$/i, /^home.?phone$/i] },
  { field: 'company', patterns: [/^company$/i, /^organization.?(name)?$/i, /^employer$/i] },
  { field: 'title', patterns: [/^title$/i, /^job.?title$/i, /^position$/i, /^organization.?title$/i] },
  { field: 'location', patterns: [/^location$/i, /^city$/i, /^address$/i] },
  { field: 'linkedinUrl', patterns: [/linkedin/i] },
  { field: 'notes', patterns: [/^notes?$/i, /^comments?$/i] },
];

function detectFieldMapping(header: string): string | null {
  for (const rule of fieldMappingRules) {
    if (rule.patterns.some(pattern => pattern.test(header))) {
      return rule.field;
    }
  }
  return null;
}

export function analyzeCSV(headers: string[], rows: string[][]): AnalysisResult {
  const analysis: ColumnAnalysis[] = headers.map((header, index) => {
    const values = rows.map(row => row[index]?.trim() || '');
    const nonEmptyValues = values.filter(v => v.length > 0);

    return {
      index,
      header,
      hasData: nonEmptyValues.length > 0,
      sampleValue: nonEmptyValues[0] || '',
      suggestedField: detectFieldMapping(header),
    };
  });

  const populated = analysis.filter(c => c.hasData);
  const empty = analysis.filter(c => !c.hasData).map(c => c.header);
  const mapped = populated.filter(c => c.suggestedField !== null);
  const unmapped = populated.filter(c => c.suggestedField === null);

  return {
    totalRows: rows.length,
    populatedColumns: populated,
    emptyColumns: empty,
    mappedColumns: mapped,
    unmappedColumns: unmapped,
  };
}

export function formatUnmappedDataForNotes(
  data: Array<{ header: string; value: string }>
): string {
  return data
    .filter(c => c.value.trim())
    .map(c => `[${c.header}: ${c.value}]`)
    .join(' ');
}
```

**Acceptance Criteria:**
- [ ] Empty columns correctly identified
- [ ] Common fields auto-mapped (firstName, lastName, email, etc.)
- [ ] Unmapped columns with data identified
- [ ] Notes format function works correctly

---

### Task 4.2: Rewrite Import Page Mapping Step
**Description:** Complete rewrite of the mapping UI for smart import
**Size:** Large
**Priority:** High
**Dependencies:** Task 4.1
**Can run parallel with:** None

**File:** `src/app/(dashboard)/contacts/import/page.tsx`

**Key Changes:**
- After CSV parse, call `analyzeCSV()` to categorize columns
- Show summary: "Found X contacts with Y fields populated"
- Display "Confirmed Mappings" card (collapsible, editable)
- Display "Extra Data" card with checkboxes
- Hide empty columns completely

**New State:**
```typescript
const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
const [selectedUnmapped, setSelectedUnmapped] = useState<Set<number>>(new Set());
```

**Acceptance Criteria:**
- [ ] Empty columns hidden
- [ ] Mapped columns shown with sample values
- [ ] Unmapped columns shown with checkboxes
- [ ] Can edit mappings if needed
- [ ] Import uses correct field structure

---

### Task 4.3: Implement Confirmed Mappings Card
**Description:** Build the confirmed mappings display component
**Size:** Medium
**Priority:** High
**Dependencies:** Task 4.2
**Can run parallel with:** Task 4.4

**Component Structure:**
```tsx
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Check className="h-5 w-5 text-success" />
      Confirmed Mappings
    </CardTitle>
    <Button variant="ghost" size="sm" onClick={toggleEdit}>
      {isEditing ? 'Done' : 'Edit'}
    </Button>
  </CardHeader>
  <CardContent>
    {mappedColumns.map(col => (
      <div key={col.index} className="flex items-center gap-4 py-2">
        <span className="w-40 text-text-secondary">{col.header}</span>
        <span className="text-text-tertiary">→</span>
        {isEditing ? (
          <Select value={col.suggestedField} onValueChange={...}>
            ...
          </Select>
        ) : (
          <span className="text-text-primary">
            {getFieldLabel(col.suggestedField)}
          </span>
        )}
        <span className="text-text-tertiary text-sm">
          Sample: {col.sampleValue}
        </span>
      </div>
    ))}
  </CardContent>
</Card>
```

**Acceptance Criteria:**
- [ ] Shows all auto-mapped columns
- [ ] Edit mode allows changing mappings
- [ ] Sample values displayed
- [ ] Visual indication of mapping

---

### Task 4.4: Implement Extra Data Card
**Description:** Build the unmapped data selection component
**Size:** Medium
**Priority:** High
**Dependencies:** Task 4.2
**Can run parallel with:** Task 4.3

**Component Structure:**
```tsx
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <AlertCircle className="h-5 w-5 text-warning" />
      Extra Data (not mapped to fields)
    </CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-text-tertiary mb-4">
      Selected items will be added to the Notes field
    </p>
    {unmappedColumns.map(col => (
      <div key={col.index} className="flex items-center gap-3 py-2">
        <Checkbox
          checked={selectedUnmapped.has(col.index)}
          onCheckedChange={(checked) => {
            const next = new Set(selectedUnmapped);
            if (checked) next.add(col.index);
            else next.delete(col.index);
            setSelectedUnmapped(next);
          }}
        />
        <span className="text-text-secondary">{col.header}</span>
        <span className="text-text-tertiary text-sm">
          Sample: {col.sampleValue}
        </span>
      </div>
    ))}
  </CardContent>
</Card>
```

**Acceptance Criteria:**
- [ ] Shows only unmapped columns with data
- [ ] Checkboxes for selection
- [ ] Clear explanation of what happens
- [ ] Sample values displayed

---

### Task 4.5: Update Import Logic for Notes Merge
**Description:** Integrate notes merge into import process
**Size:** Medium
**Priority:** High
**Dependencies:** Task 4.3, Task 4.4
**Can run parallel with:** None

**Key Changes:**
```typescript
const handleStartImport = async () => {
  for (const row of parsedData.rows) {
    const contact: Record<string, string> = {};

    // Map confirmed fields
    for (const col of mappedColumns) {
      const value = row[col.index]?.trim();
      if (col.suggestedField && value) {
        contact[col.suggestedField] = value;
      }
    }

    // Build notes from selected unmapped columns
    const unmappedData = unmappedColumns
      .filter(col => selectedUnmapped.has(col.index))
      .map(col => ({
        header: col.header,
        value: row[col.index]?.trim() || '',
      }))
      .filter(d => d.value);

    if (unmappedData.length > 0) {
      const extraNotes = formatUnmappedDataForNotes(unmappedData);
      contact.notes = contact.notes
        ? `${contact.notes}\n\n${extraNotes}`
        : extraNotes;
    }

    // Submit to API
    await fetch('/api/contacts/import/csv', {
      method: 'POST',
      body: JSON.stringify({ contact, skipDuplicates }),
    });
  }
};
```

**Acceptance Criteria:**
- [ ] Mapped fields imported correctly
- [ ] Selected unmapped data merged into notes
- [ ] Notes format: `[Header: value] [Header2: value2]`
- [ ] Existing notes preserved if present

---

## Phase 5: Cleanup & Polish (2 tasks)

### Task 5.1: Remove Deprecated Fields from Schema
**Description:** Remove old name/email/phone fields after migration confirmed
**Size:** Small
**Priority:** Low
**Dependencies:** All Phase 4 tasks complete, user confirmation
**Can run parallel with:** None

**Steps:**
1. Verify all code uses new fields
2. Create migration to drop old columns
3. Run migration
4. Update any remaining references

**Schema Change:**
```prisma
model Contact {
  // Remove these lines:
  // name    String?
  // email   String?
  // phone   String?
}
```

**Acceptance Criteria:**
- [ ] No code references old fields
- [ ] Migration drops columns cleanly
- [ ] Application works without old fields

---

### Task 5.2: E2E Testing and Documentation
**Description:** Final testing and documentation updates
**Size:** Medium
**Priority:** Medium
**Dependencies:** Task 5.1
**Can run parallel with:** None

**Testing:**
- Import a real Google Contacts CSV export
- Verify empty columns hidden
- Verify mapping accuracy
- Verify notes merge works
- Test edge cases (single-word names, missing emails)

**Documentation:**
- Update any API documentation
- Add import guide for users
- Document new field structure

**Acceptance Criteria:**
- [ ] Google Contacts CSV imports correctly
- [ ] LinkedIn CSV imports correctly (if applicable)
- [ ] Documentation updated
- [ ] No regressions in existing functionality

---

## Execution Summary

| Phase | Tasks | Priority | Dependencies |
|-------|-------|----------|--------------|
| Phase 1: Schema Migration | 5 | Critical | None |
| Phase 2: Backend Updates | 7 | High | Phase 1 |
| Phase 3: Form & Display | 6 | High | Phase 2 |
| Phase 4: Smart Import UI | 5 | High | Phase 3 |
| Phase 5: Cleanup | 2 | Low | Phase 4 |

**Total Tasks:** 25

**Parallel Execution Opportunities:**
- Phase 1: Tasks 1.2 and 1.3 can run in parallel
- Phase 2: Tasks 2.1-2.3 can run in parallel; 2.4-2.7 can run in parallel
- Phase 3: Tasks 3.1-3.2 can run in parallel; 3.3-3.5 can run in parallel
- Phase 4: Tasks 4.3 and 4.4 can run in parallel

**Critical Path:** 1.1 → 1.2 → 1.5 → 2.2 → 3.1 → 4.1 → 4.2 → 4.5 → 5.1
