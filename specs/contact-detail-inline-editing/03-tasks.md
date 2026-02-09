# Task Breakdown: Contact Detail Inline Editing

**Generated:** 2026-02-06
**Source:** specs/contact-detail-inline-editing/02-spec.md
**Last Decompose:** 2026-02-06

---

## Overview

Transform the contact detail page from a read-only view with separate edit page into an inline-editable experience with 7 editable sections, clickable placeholders for empty fields, and score celebration integration.

**Total Tasks:** 14
**Phases:** 4

---

## Phase 1: Foundation Infrastructure (3 tasks)

### Task 1.1: Create useInlineEdit Hook
**Description:** Create the core hook that manages inline editing state across all sections
**Size:** Medium
**Priority:** High (Blocking)
**Dependencies:** None
**Can run parallel with:** Task 1.2

**Technical Requirements:**
- Track which section is currently being edited (only one at a time)
- Hold local form data for the section being edited
- Call PUT /api/contacts/[id] with only the fields in that section
- After successful save, update local contact state and call router.refresh()
- Compare previousScore with newScore to trigger celebration

**Implementation:**
```typescript
// src/components/contacts/hooks/useInlineEdit.ts
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { Contact } from '@/types/contact';

interface UseInlineEditOptions {
  contact: Contact;
  onScoreImproved?: (previousScore: number, newScore: number) => void;
}

interface UseInlineEditReturn {
  editingSection: string | null;
  startEditing: (sectionId: string) => void;
  formData: Partial<Contact>;
  updateField: <K extends keyof Contact>(field: K, value: Contact[K]) => void;
  saveSection: (sectionId: string, fields: (keyof Contact)[]) => Promise<boolean>;
  cancelEdit: () => void;
  isSaving: boolean;
  localContact: Contact;
}

export function useInlineEdit({ contact, onScoreImproved }: UseInlineEditOptions): UseInlineEditReturn {
  const router = useRouter();
  const { toast } = useToast();

  const [localContact, setLocalContact] = useState<Contact>(contact);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Contact>>({});
  const [isSaving, setIsSaving] = useState(false);

  const startEditing = useCallback((sectionId: string) => {
    // Initialize form data with current values
    setFormData({ ...localContact });
    setEditingSection(sectionId);
  }, [localContact]);

  const updateField = useCallback(<K extends keyof Contact>(field: K, value: Contact[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingSection(null);
    setFormData({});
  }, []);

  const saveSection = useCallback(async (sectionId: string, fields: (keyof Contact)[]): Promise<boolean> => {
    setIsSaving(true);
    const previousScore = localContact.enrichmentScore;

    try {
      // Build payload with only the section's fields
      const payload: Record<string, unknown> = {};
      for (const field of fields) {
        payload[field] = formData[field] ?? null;
      }

      const response = await fetch(`/api/contacts/${localContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to save');
      }

      const updatedContact = await response.json();
      setLocalContact(updatedContact);
      setEditingSection(null);
      setFormData({});

      // Check for score improvement
      if (updatedContact.enrichmentScore > previousScore && onScoreImproved) {
        onScoreImproved(previousScore, updatedContact.enrichmentScore);
      }

      router.refresh();
      return true;
    } catch (error) {
      toast({
        title: 'Error saving',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [localContact, formData, router, toast, onScoreImproved]);

  return {
    editingSection,
    startEditing,
    formData,
    updateField,
    saveSection,
    cancelEdit,
    isSaving,
    localContact,
  };
}
```

**Acceptance Criteria:**
- [ ] Hook tracks editingSection state correctly
- [ ] formData initializes with current contact values on startEditing
- [ ] saveSection sends only specified fields to API
- [ ] Score improvement callback fires when score increases
- [ ] cancelEdit clears form state
- [ ] isSaving state updates correctly during save

---

### Task 1.2: Create Section Validation Schemas
**Description:** Create Zod schemas for each section's fields
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 1.1

**Implementation:**
```typescript
// src/lib/validations/contact-sections.ts
import { z } from 'zod';

export const profileHeaderSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(255),
  lastName: z.string().max(255).optional().or(z.literal('')),
  title: z.string().max(255).optional().or(z.literal('')),
  organizationalTitle: z.string().max(255).optional().or(z.literal('')),
  company: z.string().max(255).optional().or(z.literal('')),
});

export const contactInfoSchema = z.object({
  primaryEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  secondaryEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  primaryPhone: z.string().max(50).optional().or(z.literal('')),
  secondaryPhone: z.string().max(50).optional().or(z.literal('')),
  location: z.string().max(255).optional().or(z.literal('')),
});

export const socialLinksSchema = z.object({
  linkedinUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  twitterUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  githubUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  instagramUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  websiteUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
});

export const relationshipSchema = z.object({
  relationshipStrength: z.number().int().min(1).max(4),
  howWeMet: z.string().optional().or(z.literal('')),
  lastContactDate: z.string().optional().or(z.literal('')).nullable(),
  referredBy: z.string().max(255).optional().or(z.literal('')),
  relationshipHistory: z.string().optional().or(z.literal('')),
});

export const whyNowSchema = z.object({
  whyNow: z.string().optional().or(z.literal('')),
});

export const expertiseInterestsSchema = z.object({
  expertise: z.string().optional().or(z.literal('')),
  interests: z.string().optional().or(z.literal('')),
});

export const notesSchema = z.object({
  notes: z.string().optional().or(z.literal('')),
});

// Section field mappings for save operations
export const SECTION_FIELDS = {
  profileHeader: ['firstName', 'lastName', 'title', 'organizationalTitle', 'company'] as const,
  contactInfo: ['primaryEmail', 'secondaryEmail', 'primaryPhone', 'secondaryPhone', 'location'] as const,
  socialLinks: ['linkedinUrl', 'twitterUrl', 'githubUrl', 'instagramUrl', 'websiteUrl'] as const,
  relationship: ['relationshipStrength', 'howWeMet', 'lastContactDate', 'referredBy', 'relationshipHistory'] as const,
  whyNow: ['whyNow'] as const,
  expertiseInterests: ['expertise', 'interests'] as const,
  notes: ['notes'] as const,
} as const;
```

**Acceptance Criteria:**
- [ ] All 7 section schemas defined with correct validation rules
- [ ] firstName validation requires non-empty string
- [ ] Email fields validate email format or empty
- [ ] URL fields validate URL format or empty
- [ ] SECTION_FIELDS mapping exported for use in save operations

---

### Task 1.3: Create EditableSection Wrapper Component
**Description:** Create the reusable wrapper that handles view/edit mode switching with animations
**Size:** Medium
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 1.1, 1.2

**Implementation:**
```typescript
// src/components/contacts/sections/EditableSection.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  variant?: 'default' | 'gold';
  // For profile header - no title shown, different layout
  hideTitle?: boolean;
}

export function EditableSection({
  title,
  sectionId,
  isEditing,
  onEditStart,
  onSave,
  onCancel,
  isSaving,
  children,
  editContent,
  className,
  variant = 'default',
  hideTitle = false,
}: EditableSectionProps) {
  const handleSave = async () => {
    await onSave();
  };

  return (
    <motion.div
      layout
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={cn(
        'rounded-xl border p-6 transition-colors',
        variant === 'gold'
          ? isEditing
            ? 'border-gold-primary bg-gold-subtle'
            : 'border-gold-primary/30 bg-gold-subtle'
          : isEditing
            ? 'border-gold-primary/50 bg-bg-secondary'
            : 'border-border bg-bg-secondary',
        className
      )}
    >
      {/* Section Header */}
      {!hideTitle && (
        <div className="mb-4 flex items-center justify-between">
          <h2 className={cn(
            'text-sm font-semibold uppercase tracking-wider',
            variant === 'gold' ? 'text-gold-primary flex items-center gap-2' : 'text-text-tertiary'
          )}>
            {title}
          </h2>
          {!isEditing && (
            <button
              onClick={onEditStart}
              className="rounded-md p-1.5 text-text-tertiary opacity-0 transition-opacity hover:bg-white/5 hover:text-white group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100"
              aria-label={`Edit ${title}`}
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            key="edit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {editContent}

            {/* Save/Cancel Buttons */}
            <div className="mt-4 flex gap-3 md:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isSaving}
                className="flex-1 md:flex-none"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-gold-primary hover:bg-gold-light text-bg-primary md:flex-none"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
```

**Acceptance Criteria:**
- [ ] Shows children in view mode, editContent in edit mode
- [ ] Pencil icon visible on hover (desktop) or always (mobile)
- [ ] Gold variant applies correct styling for Why Now section
- [ ] Save/Cancel buttons appear in edit mode
- [ ] Save button shows loading state while saving
- [ ] Framer Motion transitions between modes smoothly

---

## Phase 2: Section Components (7 tasks)

### Task 2.1: Create ProfileHeaderSection
**Description:** Editable profile header with name, title, position, company
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.1, 1.2, 1.3

**Implementation:**
Create `src/components/contacts/sections/ProfileHeaderSection.tsx` that:
- Shows avatar + display name + subtitle (title at company) in view mode
- Shows 5 input fields in edit mode: firstName, lastName, title, organizationalTitle, company
- Uses 2-column grid for fields
- Validates with profileHeaderSchema
- Includes the existing avatar + dropdown menu

**Fields:**
- firstName (required, text input)
- lastName (text input)
- title (text input, placeholder: "Job role (e.g., Software Engineer)")
- organizationalTitle (text input, placeholder: "Position (e.g., VP of Engineering)")
- company (text input)

**View Mode Display:**
```
[Avatar] John Doe
         VP of Engineering, Software Engineer at Acme Inc
                                                    [⋮ Menu]
```

**Acceptance Criteria:**
- [ ] View mode shows avatar, name, formatted subtitle
- [ ] Edit mode shows 5 fields in organized layout
- [ ] firstName validation shows error if empty
- [ ] Dropdown menu (Edit all, Delete) still accessible
- [ ] Mobile layout stacks fields vertically

---

### Task 2.2: Create ContactInfoSection
**Description:** Editable contact information (email, phone, location)
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.1, 1.2, 1.3

**Implementation:**
Create `src/components/contacts/sections/ContactInfoSection.tsx` that:
- Shows populated fields with icons in view mode
- Shows empty placeholders for unfilled fields ("Add email...")
- Edit mode shows all 5 fields vertically
- Phone fields auto-format on blur using formatPhoneForDisplay()

**Fields:**
- primaryEmail (email input with Mail icon)
- secondaryEmail (email input)
- primaryPhone (phone input, auto-format)
- secondaryPhone (phone input, auto-format)
- location (text input with MapPin icon)

**View Mode:**
- Each populated field: [Icon] value (clickable for email/phone)
- Empty fields: [Icon] "Add email..." (italic, clickable to edit)

**Acceptance Criteria:**
- [ ] View mode shows icons with values or placeholders
- [ ] Email links are mailto:
- [ ] Phone links are tel:
- [ ] Phone auto-formats on blur
- [ ] Empty fields show clickable placeholders
- [ ] Email validation works

---

### Task 2.3: Create SocialLinksSection
**Description:** Editable social media and website URLs
**Size:** Medium
**Priority:** Medium
**Dependencies:** Task 1.1, 1.2, 1.3

**Implementation:**
Create `src/components/contacts/sections/SocialLinksSection.tsx` with:
- View mode: Platform icon + "LinkedIn Profile" link (or placeholder)
- Edit mode: 5 URL input fields

**Fields:**
- linkedinUrl (Linkedin icon)
- twitterUrl (Twitter icon)
- githubUrl (Github icon)
- instagramUrl (Instagram icon)
- websiteUrl (Globe icon)

**Acceptance Criteria:**
- [ ] View mode shows platform-specific icons
- [ ] Links open in new tab with rel="noopener noreferrer"
- [ ] Empty fields show "Add LinkedIn..." placeholder
- [ ] URL validation on save
- [ ] Invalid URLs show error message

---

### Task 2.4: Create RelationshipSection
**Description:** Editable relationship details with strength toggle, dates, and narrative fields
**Size:** Large
**Priority:** High
**Dependencies:** Task 1.1, 1.2, 1.3

**Implementation:**
Create `src/components/contacts/sections/RelationshipSection.tsx` with:
- relationshipStrength: 4-button toggle (reuse design from ContactForm)
- howWeMet: textarea
- lastContactDate: native date input
- referredBy: text input
- relationshipHistory: textarea

**View Mode:**
- Strength: Visual bars (1-4) with label (Weak/Casual/Good/Strong)
- How We Met: Text or placeholder
- Last Contact: Formatted date or "Not set"
- Referred By: Text or placeholder
- History: Text or placeholder

**Acceptance Criteria:**
- [ ] Strength toggle shows filled bars for current level
- [ ] Date picker works for lastContactDate
- [ ] Strength has tooltip explaining each level
- [ ] Textareas expand appropriately
- [ ] All new fields (referredBy, relationshipHistory) work

---

### Task 2.5: Create WhyNowSection
**Description:** Editable Why Now with gold styling
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.1, 1.2, 1.3

**Implementation:**
Create `src/components/contacts/sections/WhyNowSection.tsx` with:
- Special gold styling (variant="gold" on EditableSection)
- Sparkles icon in header
- Single whyNow textarea

**View Mode:**
```
✨ WHY NOW
What makes this contact relevant right now?
```
(placeholder if empty, value if filled)

**Edit Mode:**
- Single textarea with placeholder
- Gold border maintained

**Acceptance Criteria:**
- [ ] Gold styling applied in both view and edit modes
- [ ] Sparkles icon in header
- [ ] Placeholder clickable to enter edit mode
- [ ] Textarea rows: 3 desktop, 4 mobile

---

### Task 2.6: Create ExpertiseInterestsSection
**Description:** Editable expertise and interests in side-by-side layout
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 1.1, 1.2, 1.3

**Implementation:**
Create `src/components/contacts/sections/ExpertiseInterestsSection.tsx` with:
- Two textareas: expertise and interests
- Side by side on desktop, stacked on mobile
- Show both in same section

**View Mode:**
```
EXPERTISE               INTERESTS
[value or placeholder]  [value or placeholder]
```

**Edit Mode:**
- Two textareas side by side (grid-cols-2)
- Stack on mobile

**Acceptance Criteria:**
- [ ] 2-column layout on desktop
- [ ] Stacked on mobile
- [ ] Each field has appropriate placeholder
- [ ] View shows subsection labels

---

### Task 2.7: Create NotesSection
**Description:** Editable notes with whitespace preservation
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 1.1, 1.2, 1.3

**Implementation:**
Create `src/components/contacts/sections/NotesSection.tsx` with:
- Single notes textarea
- View mode preserves whitespace (whitespace-pre-wrap)

**View Mode:**
```
NOTES
[notes content with whitespace preserved, or "Add notes..." placeholder]
```

**Edit Mode:**
- Single textarea, 3 rows desktop, 4 mobile

**Acceptance Criteria:**
- [ ] Whitespace preserved in view mode
- [ ] Placeholder shows when empty
- [ ] Larger textarea on mobile

---

## Phase 3: Integration (2 tasks)

### Task 3.1: Refactor ContactDetail to Use Section Components
**Description:** Replace inline JSX with new section components and wire up useInlineEdit
**Size:** Large
**Priority:** High
**Dependencies:** All Phase 2 tasks

**Implementation:**
Modify `src/components/contacts/ContactDetail.tsx`:
1. Import useInlineEdit hook
2. Import all section components
3. Replace existing inline JSX sections with components
4. Wire up editing state and callbacks
5. Keep existing: EnrichmentScoreCard, TagsSection, ResearchRunHistory, action buttons
6. Add celebration trigger when score improves

**Key Changes:**
```tsx
export function ContactDetail({ contact: initialContact, researchRuns, totalContacts }: Props) {
  const {
    editingSection,
    startEditing,
    formData,
    updateField,
    saveSection,
    cancelEdit,
    isSaving,
    localContact,
  } = useInlineEdit({
    contact: initialContact,
    onScoreImproved: (prev, next) => {
      // Trigger celebration
      setCelebrationData({ previousScore: prev, newScore: next, ... });
    },
  });

  return (
    <div className="group"> {/* For hover visibility */}
      <ProfileHeaderSection
        contact={localContact}
        isEditing={editingSection === 'profileHeader'}
        onEditStart={() => startEditing('profileHeader')}
        onSave={() => saveSection('profileHeader', SECTION_FIELDS.profileHeader)}
        onCancel={cancelEdit}
        isSaving={isSaving}
        formData={formData}
        updateField={updateField}
      />
      {/* ... other sections ... */}
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] All 7 sections replaced with new components
- [ ] Single section editable at a time
- [ ] Save triggers API call and refreshes
- [ ] Score celebration triggers when score improves
- [ ] Existing features (tags, score card, research) still work
- [ ] Mobile layout correct

---

### Task 3.2: Update EnrichmentScoreCard Suggestion Links
**Description:** Make "Improve your score" suggestions trigger inline edit mode instead of navigating
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 3.1

**Implementation:**
Modify `src/components/contacts/EnrichmentScoreCard.tsx`:
- Change suggestion chip behavior from Link to button
- Accept callback prop for triggering section edit
- Map field names to section IDs

**Changes:**
```tsx
interface EnrichmentScoreCardProps {
  contact: Contact;
  onEditSection?: (sectionId: string) => void;
}

// In suggestion rendering:
<button
  onClick={() => onEditSection?.(getSection(field))}
  className="..."
>
  Add {fieldLabel}
</button>

function getSection(field: string): string {
  const mapping: Record<string, string> = {
    whyNow: 'whyNow',
    howWeMet: 'relationship',
    expertise: 'expertiseInterests',
    interests: 'expertiseInterests',
    notes: 'notes',
    // ... etc
  };
  return mapping[field] || 'profileHeader';
}
```

**Acceptance Criteria:**
- [ ] Clicking suggestion triggers inline edit mode
- [ ] Correct section opens for each field
- [ ] No more navigation to /edit page from suggestions

---

## Phase 4: Polish (2 tasks)

### Task 4.1: Add Keyboard Navigation
**Description:** Implement keyboard shortcuts for edit mode
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 3.1

**Implementation:**
Add keyboard handlers to EditableSection and input components:
- **Escape:** Cancel edit mode
- **Enter:** Save (for single-line inputs only)
- **Ctrl/Cmd + Enter:** Save (for textareas)

```tsx
// In EditableSection or individual sections
useEffect(() => {
  if (!isEditing) return;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      onSave();
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [isEditing, onCancel, onSave]);
```

**Acceptance Criteria:**
- [ ] Escape cancels current edit
- [ ] Ctrl+Enter saves in textareas
- [ ] Enter in text inputs saves (not in textareas)
- [ ] Tab navigates between fields normally

---

### Task 4.2: Mobile Optimization Pass
**Description:** Ensure all sections work well on mobile with proper touch targets
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 3.1

**Implementation:**
Review and adjust for mobile:
- Touch targets minimum 44x44px
- Edit icon always visible (not hover-dependent)
- Form inputs h-12 instead of h-10
- Save/Cancel buttons full-width and stacked
- Textareas use mobile row counts

**Changes:**
```tsx
// Example mobile adjustments
<Button className="h-11 w-11 md:h-10 md:w-10" />

<Input className="h-12 md:h-10" />

<Textarea rows={isMobile ? 4 : 3} />

// Save/Cancel on mobile
<div className="flex flex-col gap-2 md:flex-row md:justify-end">
  <Button className="w-full md:w-auto">Cancel</Button>
  <Button className="w-full md:w-auto">Save</Button>
</div>
```

**Acceptance Criteria:**
- [ ] All touch targets 44x44px minimum
- [ ] Edit icons always visible on mobile
- [ ] Inputs appropriately sized
- [ ] Buttons full-width on mobile
- [ ] Textareas taller on mobile

---

## Execution Strategy

### Parallel Opportunities
- Phase 1 tasks can all run in parallel (1.1, 1.2, 1.3)
- Phase 2 section tasks can run in parallel once Phase 1 complete
- Phase 4 tasks can run in parallel

### Critical Path
1. Task 1.1 (useInlineEdit) → All Phase 2 tasks → Task 3.1 (Integration)
2. Task 1.3 (EditableSection) → All Phase 2 tasks

### Recommended Order
1. **First:** Tasks 1.1, 1.2, 1.3 (parallel)
2. **Then:** Tasks 2.1-2.7 (parallel, start with 2.1, 2.2, 2.4 as high priority)
3. **Then:** Task 3.1 (integration - largest single task)
4. **Then:** Task 3.2
5. **Finally:** Tasks 4.1, 4.2 (parallel)

---

## Summary

| Phase | Tasks | Parallel? | Est. Complexity |
|-------|-------|-----------|-----------------|
| 1. Foundation | 3 | Yes | Medium |
| 2. Sections | 7 | Yes | Medium each |
| 3. Integration | 2 | No | Large + Small |
| 4. Polish | 2 | Yes | Small |
| **Total** | **14** | — | — |
