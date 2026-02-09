# Contact Detail: Show All Fields + Inline Editing — Specification

**Slug:** contact-detail-inline-editing
**Author:** Claude Code
**Date:** 2026-02-05
**Status:** Draft
**Related:** [01-ideation.md](./01-ideation.md)

---

## 1. Overview

Transform the contact detail page from a read-only view with a separate edit page into a fully inline-editable experience where:
1. **All populated fields are visible** — no hiding behind an edit page
2. **Empty fields show clickable placeholders** — "Add expertise...", "Add notes...", etc.
3. **Each section is inline-editable** — click pencil icon to edit, Save/Cancel buttons appear
4. **Profile header is editable** — name, title, position, company
5. **All database fields are exposed** — including previously hidden fields (social URLs, referredBy, relationshipHistory, lastContactDate, websiteUrl)

---

## 2. Section Architecture

The detail page will be reorganized into the following editable sections:

### 2.1 Profile Header Section
**Location:** Top of page (existing header area)
**Fields:**
- `firstName` (required)
- `lastName`
- `title` (Job Role)
- `organizationalTitle` (Position)
- `company`

**Edit behavior:** Clicking edit icon shows inline form with 5 fields in 2-column layout. Name fields on first row, professional fields below.

### 2.2 Contact Information Section
**Location:** Left column (existing)
**Fields:**
- `primaryEmail`
- `secondaryEmail`
- `primaryPhone`
- `secondaryPhone`
- `location`

**Edit behavior:** All 5 fields shown in vertical stack. Phone fields auto-format on blur.

### 2.3 Social & Web Section
**Location:** Right column or below Contact Info
**Fields:**
- `linkedinUrl`
- `twitterUrl`
- `githubUrl`
- `instagramUrl`
- `websiteUrl`

**View behavior:** Shows platform icon + "LinkedIn Profile" link (or empty placeholder)
**Edit behavior:** URL input fields with validation

### 2.4 Relationship Section
**Location:** Right column (existing)
**Fields:**
- `relationshipStrength` (1-4 toggle buttons)
- `howWeMet` (textarea)
- `lastContactDate` (date picker)
- `referredBy` (text input)
- `relationshipHistory` (textarea)

**Edit behavior:** Toggle buttons for strength, textareas for narrative fields, date picker for lastContactDate.

### 2.5 Why Now Section
**Location:** Full width, gold-highlighted (existing)
**Fields:**
- `whyNow` (textarea)

**Edit behavior:** Single textarea. Clicking placeholder or edit icon enters edit mode. Gold styling maintained in edit mode.

### 2.6 Expertise & Interests Section
**Location:** Below Why Now
**Fields:**
- `expertise` (textarea)
- `interests` (textarea)

**Edit behavior:** Two textareas side by side (desktop) or stacked (mobile).

### 2.7 Notes Section
**Location:** Full width, bottom
**Fields:**
- `notes` (textarea)

**Edit behavior:** Single textarea. Preserves whitespace in view mode.

---

## 3. Component Structure

### 3.1 New Components to Create

```
src/components/contacts/
├── ContactDetailClient.tsx          # Main client component (renamed from ContactDetail)
├── sections/
│   ├── EditableSection.tsx          # Wrapper with edit/save/cancel logic
│   ├── ProfileHeaderSection.tsx     # Name + professional info
│   ├── ContactInfoSection.tsx       # Email, phone, location
│   ├── SocialLinksSection.tsx       # All social URLs + website
│   ├── RelationshipSection.tsx      # Strength, howWeMet, lastContact, referredBy, history
│   ├── WhyNowSection.tsx            # whyNow (special gold styling)
│   ├── ExpertiseInterestsSection.tsx # expertise + interests
│   └── NotesSection.tsx             # notes
├── fields/
│   ├── EditableTextField.tsx        # View/edit text input
│   ├── EditableTextarea.tsx         # View/edit textarea
│   ├── EditableDateField.tsx        # View/edit date picker
│   ├── EditableUrlField.tsx         # View/edit URL with validation
│   ├── RelationshipStrengthField.tsx # 4-button toggle (extract from ContactForm)
│   └── PlaceholderField.tsx         # "Add a note..." clickable placeholder
└── hooks/
    └── useInlineEdit.ts             # Hook managing edit state + save logic
```

### 3.2 EditableSection Component

```tsx
interface EditableSectionProps {
  title: string;
  sectionId: string;
  isEditing: boolean;
  onEditStart: () => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  children: React.ReactNode;
  editContent: React.ReactNode;
  className?: string;
  // For gold-styled sections like Why Now
  variant?: 'default' | 'gold';
}
```

**Behavior:**
- Shows `children` (view mode) or `editContent` (edit mode) based on `isEditing`
- Header has section title + pencil icon button
- Edit mode adds Save/Cancel buttons at bottom of section
- Framer Motion `layout` for smooth height transitions
- Pencil icon: visible on hover (desktop), always visible (mobile)

### 3.3 useInlineEdit Hook

```tsx
interface UseInlineEditOptions {
  contactId: string;
  initialData: Partial<Contact>;
  onSaveSuccess?: (updatedContact: Contact) => void;
}

interface UseInlineEditReturn {
  editingSection: string | null;
  setEditingSection: (section: string | null) => void;
  formData: Partial<Contact>;
  updateField: (field: keyof Contact, value: unknown) => void;
  saveSection: (section: string, fields: (keyof Contact)[]) => Promise<void>;
  cancelEdit: () => void;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}
```

**Behavior:**
- Tracks which section is currently being edited (only one at a time)
- Holds local form data for the section being edited
- `saveSection()` calls PUT /api/contacts/[id] with only the fields in that section
- Handles "unsaved changes" warning if user clicks edit on another section
- After successful save, calls `router.refresh()` and `onSaveSuccess`

---

## 4. API Contract

### 4.1 Existing Endpoint (No Changes Needed)

**PUT /api/contacts/[id]**

Already supports partial updates. Send only changed fields:

```json
// Example: saving Contact Info section
{
  "primaryEmail": "john@example.com",
  "secondaryEmail": "john.doe@work.com",
  "primaryPhone": "(555) 123-4567",
  "secondaryPhone": null,
  "location": "San Francisco, CA"
}
```

**Response:**
```json
{
  "id": "...",
  "firstName": "John",
  // ... all contact fields
  "enrichmentScore": 72,  // Recalculated
  "tags": [...]
}
```

### 4.2 Section → Fields Mapping

| Section | Fields Sent on Save |
|---------|---------------------|
| Profile Header | firstName, lastName, title, organizationalTitle, company |
| Contact Info | primaryEmail, secondaryEmail, primaryPhone, secondaryPhone, location |
| Social & Web | linkedinUrl, twitterUrl, githubUrl, instagramUrl, websiteUrl |
| Relationship | relationshipStrength, howWeMet, lastContactDate, referredBy, relationshipHistory |
| Why Now | whyNow |
| Expertise & Interests | expertise, interests |
| Notes | notes |

---

## 5. State Management

### 5.1 Page-Level State

```tsx
// In ContactDetailClient.tsx
const [contact, setContact] = useState<Contact>(initialContact);
const [editingSection, setEditingSection] = useState<string | null>(null);
const [sectionFormData, setSectionFormData] = useState<Partial<Contact>>({});
const [isSaving, setIsSaving] = useState(false);
```

### 5.2 Edit Flow

1. User clicks pencil icon on section
2. If another section is editing with unsaved changes → show confirmation dialog
3. `setEditingSection(sectionId)` + `setSectionFormData(currentValuesForSection)`
4. Section renders edit mode with form inputs
5. User modifies fields → updates `sectionFormData`
6. **Save:**
   - `setIsSaving(true)`
   - PUT to API with section's fields
   - On success: update local `contact` state, `setEditingSection(null)`, `router.refresh()`
   - If score improved: trigger celebration animation
7. **Cancel:**
   - Discard `sectionFormData`
   - `setEditingSection(null)`

### 5.3 Celebration Integration

After save, compare `previousScore` (captured before save) with `newScore` (from API response):

```tsx
const handleSectionSave = async (fields: (keyof Contact)[]) => {
  const previousScore = contact.enrichmentScore;

  const response = await fetch(`/api/contacts/${contact.id}`, {
    method: 'PUT',
    body: JSON.stringify(getFieldsPayload(fields)),
  });

  const updatedContact = await response.json();
  setContact(updatedContact);

  if (updatedContact.enrichmentScore > previousScore) {
    // Trigger celebration (reuse existing ResearchApplyCelebration or similar)
    setCelebrationData({
      previousScore,
      newScore: updatedContact.enrichmentScore,
      appliedChangesSummary: [`Updated ${sectionName}`],
    });
  }

  router.refresh();
};
```

---

## 6. UI/UX Specifications

### 6.1 View Mode (Not Editing)

**Field with value:**
```
[Icon] Field Label
Field Value (clickable text, styled appropriately)
```

**Field without value (placeholder):**
```
[Icon] Field Label
"Add a note..." (text-tertiary, italic, clickable → triggers edit mode)
```

### 6.2 Section Header

**Desktop:**
```
┌─────────────────────────────────────────────────┐
│  SECTION TITLE                          [✏️]   │  ← Pencil visible on hover
└─────────────────────────────────────────────────┘
```

**Mobile:**
```
┌─────────────────────────────────────────────────┐
│  SECTION TITLE                          [✏️]   │  ← Pencil always visible
└─────────────────────────────────────────────────┘
```

### 6.3 Edit Mode

**Section in edit mode:**
```
┌─────────────────────────────────────────────────┐
│  SECTION TITLE                                  │
├─────────────────────────────────────────────────┤
│  [Input fields for all section fields]          │
│                                                 │
│  [Cancel]                    [Save ✓]           │
└─────────────────────────────────────────────────┘
```

- Section gets a subtle gold border or highlight to indicate edit mode
- Buttons: Cancel (ghost/outline), Save (primary gold)
- Save button disabled while `isSaving`
- Show inline validation errors below fields

### 6.4 Mobile Optimizations

- Touch targets: minimum 44x44px for all interactive elements
- Section edit buttons: full-width, slightly larger text
- Form inputs: full-width, taller (h-12 vs h-10)
- Save/Cancel buttons: larger, full-width stacked on mobile
- Textareas: taller default rows (4 instead of 2)

### 6.5 Keyboard Navigation

- **Tab:** Navigate between fields in edit mode
- **Escape:** Cancel edit mode, discard changes
- **Enter:** Save (for single-line inputs)
- **Ctrl+Enter / Cmd+Enter:** Save (for textareas)

### 6.6 Animations (Framer Motion)

**Section mode transition:**
```tsx
<motion.div layout transition={{ duration: 0.2, ease: "easeInOut" }}>
  <AnimatePresence mode="wait">
    {isEditing ? (
      <motion.div
        key="edit"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {editContent}
      </motion.div>
    ) : (
      <motion.div
        key="view"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {children}
      </motion.div>
    )}
  </AnimatePresence>
</motion.div>
```

**Edit mode border highlight:**
```tsx
className={cn(
  "rounded-xl border p-6 transition-colors",
  isEditing
    ? "border-gold-primary/50 bg-bg-secondary"
    : "border-border bg-bg-secondary"
)}
```

---

## 7. Field Specifications

### 7.1 Text Fields

| Field | Max Length | Placeholder |
|-------|------------|-------------|
| firstName | 255 | "First name" |
| lastName | 255 | "Last name" |
| title | 255 | "Job role (e.g., Software Engineer)" |
| organizationalTitle | 255 | "Position (e.g., VP of Engineering)" |
| company | 255 | "Company name" |
| location | 255 | "City, State" |
| referredBy | 255 | "Who referred you?" |

### 7.2 Email Fields

| Field | Validation | Placeholder |
|-------|------------|-------------|
| primaryEmail | Valid email or empty | "john@example.com" |
| secondaryEmail | Valid email or empty | "john.doe@work.com" |

### 7.3 Phone Fields

| Field | Max Length | Placeholder | Auto-format |
|-------|------------|-------------|-------------|
| primaryPhone | 50 | "(555) 123-4567" | On blur via `formatPhoneForDisplay()` |
| secondaryPhone | 50 | "(555) 987-6543" | On blur via `formatPhoneForDisplay()` |

### 7.4 URL Fields

| Field | Validation | Placeholder | View Display |
|-------|------------|-------------|--------------|
| linkedinUrl | Valid URL or empty | "https://linkedin.com/in/..." | "LinkedIn Profile" link |
| twitterUrl | Valid URL or empty | "https://twitter.com/..." | "Twitter/X Profile" link |
| githubUrl | Valid URL or empty | "https://github.com/..." | "GitHub Profile" link |
| instagramUrl | Valid URL or empty | "https://instagram.com/..." | "Instagram Profile" link |
| websiteUrl | Valid URL or empty | "https://example.com" | "Website" link |

### 7.5 Textarea Fields

| Field | Rows (Default) | Rows (Mobile) | Placeholder |
|-------|---------------|---------------|-------------|
| howWeMet | 2 | 3 | "Met at TechCrunch Disrupt 2024..." |
| whyNow | 3 | 4 | "What makes this contact relevant right now?" |
| expertise | 2 | 3 | "SaaS growth, product-led growth..." |
| interests | 2 | 3 | "AI/ML, investing, hiking..." |
| notes | 3 | 4 | "Any other notes about this contact..." |
| relationshipHistory | 3 | 4 | "History of interactions, context..." |

### 7.6 Special Fields

**relationshipStrength:**
- 4-button toggle: Weak (1), Casual (2), Good (3), Strong (4)
- Visual: Filled buttons up to selected level
- Reuse existing design from ContactForm

**lastContactDate:**
- Date picker component (shadcn DatePicker or native input type="date")
- Display format: "Jan 15, 2026"
- Empty state: "Not set"

---

## 8. Validation

### 8.1 Client-Side Validation

Each section has its own Zod schema (subset of contactFormSchema):

```tsx
const profileHeaderSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(255),
  lastName: z.string().max(255).optional().or(z.literal('')),
  title: z.string().max(255).optional(),
  organizationalTitle: z.string().max(255).optional(),
  company: z.string().max(255).optional(),
});

const contactInfoSchema = z.object({
  primaryEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  secondaryEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  primaryPhone: z.string().max(50).optional().or(z.literal('')),
  secondaryPhone: z.string().max(50).optional().or(z.literal('')),
  location: z.string().max(255).optional(),
});

// ... etc for each section
```

### 8.2 Error Display

- Inline error messages below each field
- Red border on invalid fields
- Save button disabled if validation errors exist
- Toast notification on server-side validation failure

---

## 9. Page Layout

### 9.1 Desktop Layout (>768px)

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Contacts                                          │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ PROFILE HEADER (Avatar, Name, Title, Company)     [✏️] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ ENRICHMENT SCORE CARD (existing)                      │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ [Enrich: Personal Context] [Enrich: Online Research]    ││
│ └──────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ TAGS SECTION (existing inline editing)                   ││
│ └──────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ WHY NOW (gold styling)                              [✏️]││
│ │ "What makes this contact relevant right now?"            ││
│ └──────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌────────────────────────┐  ┌────────────────────────┐      │
│ │ CONTACT INFO      [✏️]│  │ RELATIONSHIP       [✏️]│      │
│ │ Email, Phone, Location │  │ Strength, How We Met   │      │
│ │                        │  │ Last Contact, Referred │      │
│ └────────────────────────┘  └────────────────────────┘      │
│                                                             │
│ ┌────────────────────────┐  ┌────────────────────────┐      │
│ │ SOCIAL & WEB      [✏️]│  │ EXPERTISE/INTERESTS[✏️]│      │
│ │ LinkedIn, Twitter, etc │  │ Expertise, Interests   │      │
│ └────────────────────────┘  └────────────────────────┘      │
│                                                             │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ NOTES                                               [✏️]││
│ │ Any notes about this contact...                          ││
│ └──────────────────────────────────────────────────────────┘│
│                                                             │
│ [RESEARCH RUN HISTORY - existing]                           │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Mobile Layout (<768px)

All sections stack vertically, full-width. Same order as desktop.

---

## 10. Migration Strategy

### Phase 1: Create Component Infrastructure
- Create `EditableSection`, `useInlineEdit`, and field components
- Create section components (empty implementations)
- No changes to existing ContactDetail yet

### Phase 2: Implement Section Components
- ProfileHeaderSection with inline editing
- ContactInfoSection with inline editing
- SocialLinksSection with inline editing
- RelationshipSection with inline editing (new fields: lastContactDate, referredBy, relationshipHistory)
- WhyNowSection with inline editing
- ExpertiseInterestsSection with inline editing
- NotesSection with inline editing

### Phase 3: Integrate into ContactDetail
- Replace current read-only sections with new editable section components
- Wire up state management and save logic
- Add celebration integration

### Phase 4: Update Related Components
- Update EnrichmentScoreCard "Improve your score" links to trigger inline edit mode
- Test all save/cancel/validation flows
- Mobile optimization pass

### Phase 5: Polish & Edge Cases
- Keyboard navigation
- Unsaved changes warning dialog
- Accessibility audit
- Performance optimization (memoization)

---

## 11. Testing Requirements

### 11.1 Unit Tests
- Zod schemas for each section
- `useInlineEdit` hook behavior
- Field formatting functions

### 11.2 E2E Tests
- Edit each section, save, verify persisted
- Cancel edit, verify no changes
- Validation error display and blocking save
- Score celebration after save
- Mobile responsive behavior
- Keyboard navigation (Escape, Enter, Tab)

### 11.3 Manual Testing Checklist
- [ ] All sections editable
- [ ] Empty fields show placeholders
- [ ] Placeholders trigger edit mode on click
- [ ] Only one section editable at a time
- [ ] Unsaved changes warning when switching sections
- [ ] Phone auto-formatting works
- [ ] URL validation works
- [ ] Date picker works for lastContactDate
- [ ] Relationship strength toggle works
- [ ] Score recalculates after save
- [ ] Celebration shows when score improves
- [ ] Mobile layout correct
- [ ] Mobile touch targets adequate
- [ ] Escape cancels edit
- [ ] Enter/Ctrl+Enter saves

---

## 12. Success Criteria

1. **All 30+ contact fields visible** on detail page (populated or as placeholders)
2. **7 editable sections** with consistent edit/save/cancel UX
3. **Single section editing** — only one section in edit mode at a time
4. **Enrichment score updates** correctly after each section save
5. **Celebration animation** triggers when score improves
6. **Mobile-friendly** — all interactions work on touch devices
7. **Fallback preserved** — `/contacts/[id]/edit` still works for power users
8. **No regressions** — Tags section, EnrichmentScoreCard, Research features still work

---

## 13. Open Questions (Resolved)

| Question | Decision |
|----------|----------|
| Empty field display? | Clickable placeholders |
| Profile header editable? | Yes |
| Keep /edit route? | Yes, as fallback |
| Add hidden DB fields? | Yes, all of them |
| Save granularity? | Independent per section |
| Mobile approach? | Optimize within same layout paradigm |

---

## 14. Appendix: Files to Create/Modify

### New Files
- `src/components/contacts/sections/EditableSection.tsx`
- `src/components/contacts/sections/ProfileHeaderSection.tsx`
- `src/components/contacts/sections/ContactInfoSection.tsx`
- `src/components/contacts/sections/SocialLinksSection.tsx`
- `src/components/contacts/sections/RelationshipSection.tsx`
- `src/components/contacts/sections/WhyNowSection.tsx`
- `src/components/contacts/sections/ExpertiseInterestsSection.tsx`
- `src/components/contacts/sections/NotesSection.tsx`
- `src/components/contacts/fields/EditableTextField.tsx`
- `src/components/contacts/fields/EditableTextarea.tsx`
- `src/components/contacts/fields/EditableDateField.tsx`
- `src/components/contacts/fields/EditableUrlField.tsx`
- `src/components/contacts/fields/RelationshipStrengthField.tsx`
- `src/components/contacts/fields/PlaceholderField.tsx`
- `src/components/contacts/hooks/useInlineEdit.ts`
- `src/lib/validations/contact-sections.ts` (section schemas)

### Modified Files
- `src/components/contacts/ContactDetail.tsx` → Major refactor
- `src/components/contacts/EnrichmentScoreCard.tsx` → Update suggestion links
- `src/types/contact.ts` → Ensure all fields typed (should already be complete)

### Unchanged Files
- `src/components/contacts/ContactForm.tsx` → Keep for /contacts/new
- `src/app/(dashboard)/contacts/[id]/edit/page.tsx` → Keep as fallback
- `src/app/api/contacts/[id]/route.ts` → No changes needed
