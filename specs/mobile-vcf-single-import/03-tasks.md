# Task Breakdown: Mobile VCF Single Import

**Generated:** 2026-01-23
**Source:** specs/mobile-vcf-single-import/02-specification.md
**Last Decompose:** 2026-01-23

---

## Overview

Add an "Import a vCard" button to the mobile new contact screen that allows users to upload a single `.vcf` file. This is a focused, single-file modification to `ContactForm.tsx`.

**Scope:** ~120 lines added to one file
**Dependencies:** All dependencies already exist (vcf-parser, useMediaQuery, AlertDialog)

---

## Phase 1: Core Implementation

### Task 1.1: Add imports and state variables

**Description:** Add all required imports and state variables to ContactForm.tsx
**Size:** Small
**Priority:** High
**Dependencies:** None

**Implementation:**

Add these imports at the top of the file:
```typescript
import { useIsMobile } from '@/hooks/useMediaQuery';
import { parseVcfFile, type ParsedContact } from '@/lib/vcf-parser';
import { FileUp } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
```

Add these state variables inside the component (after existing state):
```typescript
const isMobile = useIsMobile();
const [isImporting, setIsImporting] = useState(false);
const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
const [showMultiContactDialog, setShowMultiContactDialog] = useState(false);
const [pendingVcfData, setPendingVcfData] = useState<ParsedContact | null>(null);
```

Add `getValues` and `reset` to the useForm destructuring:
```typescript
const {
  register,
  handleSubmit,
  formState: { errors },
  setValue,
  watch,
  getValues,  // ADD THIS
  reset,      // ADD THIS
} = useForm<ContactFormData>({
```

**Acceptance Criteria:**
- [ ] All imports compile without errors
- [ ] State variables initialized correctly
- [ ] `getValues` and `reset` available from useForm
- [ ] TypeScript reports no errors

---

### Task 1.2: Add helper functions

**Description:** Add mapVcfToFormData, formHasData, and applyVcfData helper functions
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.1

**Implementation:**

Add inside the component, after state declarations:

```typescript
// Map VCF parsed contact to form data structure
const mapVcfToFormData = (contact: ParsedContact): Partial<ContactFormData> => ({
  firstName: contact.firstName,
  lastName: contact.lastName || '',
  primaryEmail: contact.primaryEmail || '',
  secondaryEmail: contact.secondaryEmail || '',
  primaryPhone: contact.primaryPhone || '',
  secondaryPhone: contact.secondaryPhone || '',
  title: contact.title || '',
  company: contact.company || '',
  location: [contact.city, contact.state].filter(Boolean).join(', ') || '',
  linkedinUrl: contact.linkedinUrl || '',
  notes: contact.notes || '',
  // Fields not in VCF - keep defaults
  organizationalTitle: '',
  howWeMet: '',
  relationshipStrength: 1,
  whyNow: '',
  expertise: '',
  interests: '',
});

// Check if user has entered any data in the form
const formHasData = (): boolean => {
  const values = getValues();
  return !!(
    values.firstName ||
    values.lastName ||
    values.primaryEmail ||
    values.primaryPhone ||
    values.title ||
    values.company ||
    values.notes
  );
};

// Apply VCF data to form and show success toast
const applyVcfData = (contact: ParsedContact) => {
  const formData = mapVcfToFormData(contact);
  reset({ ...getValues(), ...formData, relationshipStrength: 1 });
  setTags([]); // Clear tags since VCF doesn't have them
  toast({
    title: 'Contact imported',
    description: 'Review the information and save when ready.',
  });
};
```

**Acceptance Criteria:**
- [ ] mapVcfToFormData correctly maps all VCF fields to form fields
- [ ] Location combines city and state with comma separator
- [ ] formHasData returns true when any tracked field has content
- [ ] applyVcfData resets form with VCF data and clears tags
- [ ] Success toast shown after apply

---

### Task 1.3: Add file handler and dialog handlers

**Description:** Implement handleVcfFileSelect and overwrite dialog handlers
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.2

**Implementation:**

Add after the helper functions:

```typescript
// Handle VCF file selection from native file input
const handleVcfFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Reset input so same file can be re-selected
  e.target.value = '';

  // Validate extension (iOS Safari ignores accept attribute)
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith('.vcf') && !fileName.endsWith('.vcard')) {
    toast({
      title: 'Invalid file type',
      description: 'Please select a .vcf or .vcard file.',
      variant: 'destructive',
    });
    return;
  }

  setIsImporting(true);

  try {
    const text = await file.text();
    const { contacts } = parseVcfFile(text);

    if (contacts.length === 0) {
      toast({
        title: 'No contact found',
        description: 'Could not read any contact information from this file.',
        variant: 'destructive',
      });
      return;
    }

    if (contacts.length > 1) {
      // Multi-contact file - show dialog with link to bulk import
      setShowMultiContactDialog(true);
      return;
    }

    // Single contact - check if form has data
    const contact = contacts[0];
    if (formHasData()) {
      setPendingVcfData(contact);
      setShowOverwriteDialog(true);
    } else {
      applyVcfData(contact);
    }
  } catch (error) {
    console.error('VCF parse error:', error);
    toast({
      title: 'Import failed',
      description: 'Could not read the file. It may be corrupted or in an unsupported format.',
      variant: 'destructive',
    });
  } finally {
    setIsImporting(false);
  }
};

// Handle overwrite confirmation
const handleOverwriteConfirm = () => {
  if (pendingVcfData) {
    applyVcfData(pendingVcfData);
  }
  setPendingVcfData(null);
  setShowOverwriteDialog(false);
};

// Handle overwrite cancel
const handleOverwriteCancel = () => {
  setPendingVcfData(null);
  setShowOverwriteDialog(false);
};
```

**Acceptance Criteria:**
- [ ] File extension validated client-side (.vcf, .vcard)
- [ ] Invalid file type shows destructive toast
- [ ] Empty/unparseable file shows "No contact found" toast
- [ ] Multi-contact file triggers multi-contact dialog
- [ ] Single contact with empty form applies immediately
- [ ] Single contact with existing data shows overwrite dialog
- [ ] Overwrite confirm applies data and closes dialog
- [ ] Overwrite cancel preserves form data and closes dialog
- [ ] Input reset allows re-selecting same file
- [ ] Loading state managed with isImporting

---

## Phase 2: UI Components

### Task 2.1: Add import button (mobile only)

**Description:** Add the import button UI that only shows on mobile viewports
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.1

**Implementation:**

Add this JSX after the header section (after `</div>` that closes the `mb-8` header div), before the `<form>` tag:

```tsx
{/* Mobile VCF Import Button */}
{isMobile && (
  <div className="mb-6">
    <label
      htmlFor="vcf-import-input"
      className={cn(
        'flex w-full cursor-pointer items-center justify-center gap-2',
        'rounded-lg border border-border bg-bg-secondary',
        'px-4 py-3 text-sm font-medium text-text-secondary',
        'transition-colors hover:border-gold-primary hover:text-gold-primary',
        isImporting && 'pointer-events-none opacity-50'
      )}
    >
      {isImporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileUp className="h-4 w-4" />
      )}
      {isImporting ? 'Importing...' : 'Import a vCard'}
      <input
        id="vcf-import-input"
        type="file"
        accept=".vcf,.vcard,text/vcard,text/x-vcard"
        onChange={handleVcfFileSelect}
        className="sr-only"
        disabled={isImporting}
      />
    </label>
    <p className="mt-2 text-center text-xs text-text-tertiary">
      Share a contact to Files, then import here
    </p>
  </div>
)}
```

**Location in file:** Insert between line 209 (`</div>` closing header) and line 211 (`<form id="contact-form"`)

**Acceptance Criteria:**
- [ ] Button only visible when `isMobile` is true (< 768px viewport)
- [ ] Button hidden on desktop viewports
- [ ] FileUp icon shown in default state
- [ ] Loader2 spinner shown when isImporting is true
- [ ] Button text changes to "Importing..." during import
- [ ] Button disabled and dimmed during import
- [ ] Helper text shown below button
- [ ] File input is visually hidden (sr-only)
- [ ] Accept attribute includes all VCF MIME types

---

### Task 2.2: Add overwrite confirmation dialog

**Description:** Add the AlertDialog for confirming form data overwrite
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.3

**Implementation:**

Add this JSX at the end of the component, just before the closing `</div>` of the main container (before the final `</div>` and after the sticky submit bar):

```tsx
{/* Overwrite Confirmation Dialog */}
<AlertDialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Replace current entries?</AlertDialogTitle>
      <AlertDialogDescription>
        You&apos;ve already entered some information. Importing this vCard will replace your current entries.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel onClick={handleOverwriteCancel}>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleOverwriteConfirm}>Import</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Acceptance Criteria:**
- [ ] Dialog opens when showOverwriteDialog is true
- [ ] Title clearly states action will replace data
- [ ] Description explains consequence
- [ ] Cancel button closes dialog and preserves data
- [ ] Import button applies VCF data and closes dialog
- [ ] Dialog can be dismissed via overlay click or escape key

---

### Task 2.3: Add multi-contact dialog

**Description:** Add the AlertDialog for multi-contact file handling with link to bulk import
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.3

**Implementation:**

Add this JSX right after the overwrite dialog:

```tsx
{/* Multi-Contact Dialog */}
<AlertDialog open={showMultiContactDialog} onOpenChange={setShowMultiContactDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Multiple contacts detected</AlertDialogTitle>
      <AlertDialogDescription>
        Looks like this is a multi-contact file. Head over to our bulk upload tool for this one.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction asChild>
        <Link href="/contacts/import">Go to Import</Link>
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Acceptance Criteria:**
- [ ] Dialog opens when showMultiContactDialog is true
- [ ] Title indicates multiple contacts found
- [ ] Description directs user to bulk import tool
- [ ] Cancel button closes dialog and stays on form
- [ ] "Go to Import" button navigates to /contacts/import
- [ ] Link uses Next.js Link component for client-side navigation

---

## Phase 3: Testing & Verification

### Task 3.1: Manual testing on iOS Safari

**Description:** Test the complete flow on actual iOS device
**Size:** Medium
**Priority:** High
**Dependencies:** Tasks 2.1, 2.2, 2.3

**Test Scenarios:**

1. **Happy path:**
   - Share a contact from iOS Contacts app
   - Save to Files app
   - Open Better Connections in Safari
   - Navigate to /contacts/new
   - Tap "Import a vCard"
   - Select the .vcf file from Files
   - Verify all fields populate correctly
   - Edit if needed and save

2. **Multi-contact rejection:**
   - Export multiple contacts from iCloud as single .vcf
   - Try to import
   - Verify dialog appears with "Go to Import" link
   - Test both Cancel and Go to Import buttons

3. **Overwrite confirmation:**
   - Fill in firstName field manually
   - Tap "Import a vCard"
   - Verify confirmation dialog appears
   - Test Cancel (data should be preserved)
   - Test Import (data should be replaced)

4. **Error handling:**
   - Try importing a .txt file
   - Verify "Invalid file type" toast
   - Try importing empty .vcf
   - Verify "No contact found" toast

5. **Viewport responsiveness:**
   - Verify button visible on iPhone viewport
   - Rotate to landscape, verify still visible if < 768px
   - Test on iPad, verify hidden at >= 768px

**Acceptance Criteria:**
- [ ] All 5 test scenarios pass
- [ ] No console errors during any flow
- [ ] Loading states display correctly
- [ ] Toasts appear and are dismissible
- [ ] Dialogs are properly styled and functional

---

### Task 3.2: Verify desktop behavior

**Description:** Ensure import button is hidden on desktop viewports
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 2.1

**Test Steps:**
1. Open /contacts/new on desktop browser (> 768px width)
2. Verify "Import a vCard" button is NOT visible
3. Resize window to < 768px
4. Verify button appears
5. Resize back to > 768px
6. Verify button disappears

**Acceptance Criteria:**
- [ ] Button hidden at >= 768px viewport width
- [ ] Button appears at < 768px viewport width
- [ ] Responsive transition works smoothly
- [ ] No layout shift when button appears/disappears

---

## Summary

| Phase | Tasks | Estimated Lines |
|-------|-------|-----------------|
| Phase 1: Core Implementation | 3 tasks | ~70 lines |
| Phase 2: UI Components | 3 tasks | ~50 lines |
| Phase 3: Testing | 2 tasks | N/A |
| **Total** | **8 tasks** | **~120 lines** |

**Execution Order:**
1. Task 1.1 (imports/state)
2. Task 1.2 (helper functions)
3. Task 1.3 (handlers)
4. Task 2.1 (import button) - can run parallel with 1.2, 1.3
5. Task 2.2 (overwrite dialog)
6. Task 2.3 (multi-contact dialog)
7. Task 3.1 (iOS testing)
8. Task 3.2 (desktop verification)

**Parallel Opportunities:**
- Tasks 1.2 and 1.3 can be done in parallel with Task 2.1 (UI doesn't depend on logic until wired up)
- Tasks 2.2 and 2.3 can be done in parallel (independent dialogs)
