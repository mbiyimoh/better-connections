# Mobile VCF Single Import - Specification

**Slug:** mobile-vcf-single-import
**Author:** Claude Code
**Date:** 2026-01-23
**Status:** Ready for Implementation

---

## 1. Overview

Add an "Import a vCard" button to the mobile new contact screen that allows users to upload a single `.vcf` file from their device's Files app. The VCF data pre-fills the contact form, allowing the user to review and edit before saving.

**Target users:** Mobile users (iOS Safari) who want to import a contact they've shared from the iOS Contacts app and saved to Files.

---

## 2. User Stories

### US-1: Import vCard on Mobile
**As a** mobile user creating a new contact
**I want to** import a vCard file from my device
**So that** I don't have to manually type contact information I already have

**Acceptance Criteria:**
- [ ] "Import a vCard" button visible on mobile viewport only (< 768px)
- [ ] Tapping opens native iOS file picker with Files app access
- [ ] Selecting valid single-contact `.vcf` pre-fills form fields
- [ ] User can review, edit, and save the contact normally

### US-2: Multi-Contact File Handling
**As a** user who accidentally selects a multi-contact VCF
**I want to** be directed to the appropriate bulk import tool
**So that** I can import all contacts properly

**Acceptance Criteria:**
- [ ] Multi-contact VCF triggers a dialog (not just toast)
- [ ] Dialog explains the situation and offers link to bulk import
- [ ] User can dismiss and stay on form, or navigate to import page

### US-3: Form Data Protection
**As a** user who has already entered some data in the form
**I want to** be warned before importing overwrites my entries
**So that** I don't accidentally lose my work

**Acceptance Criteria:**
- [ ] If any form field has data, show confirmation dialog before import
- [ ] Dialog clearly states import will replace current entries
- [ ] User can cancel (keep data) or continue (overwrite)

---

## 3. Technical Specification

### 3.1 Component Changes

**File:** `src/components/contacts/ContactForm.tsx`

#### New Imports
```typescript
import { useIsMobile } from '@/hooks/useMediaQuery';
import { parseVcfFile } from '@/lib/vcf-parser';
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

#### New State
```typescript
const isMobile = useIsMobile();
const [isImporting, setIsImporting] = useState(false);
const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
const [showMultiContactDialog, setShowMultiContactDialog] = useState(false);
const [pendingVcfData, setPendingVcfData] = useState<ParsedContact | null>(null);
```

#### Field Mapping Function
```typescript
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
  // These fields don't exist in VCF, keep defaults:
  organizationalTitle: '',
  howWeMet: '',
  relationshipStrength: 1,
  whyNow: '',
  expertise: '',
  interests: '',
});
```

#### Form Has Data Check
```typescript
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
```

#### File Handler
```typescript
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

const applyVcfData = (contact: ParsedContact) => {
  const formData = mapVcfToFormData(contact);
  reset({ ...getValues(), ...formData, relationshipStrength: 1 });
  // Clear tags since VCF doesn't have them
  setTags([]);
  toast({
    title: 'Contact imported',
    description: 'Review the information and save when ready.',
  });
};

const handleOverwriteConfirm = () => {
  if (pendingVcfData) {
    applyVcfData(pendingVcfData);
  }
  setPendingVcfData(null);
  setShowOverwriteDialog(false);
};

const handleOverwriteCancel = () => {
  setPendingVcfData(null);
  setShowOverwriteDialog(false);
};
```

### 3.2 UI Components

#### Import Button (Mobile Only)
Location: After the page title, before "Basic Information" section.

```tsx
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

#### Overwrite Confirmation Dialog
```tsx
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

#### Multi-Contact Dialog
```tsx
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

### 3.3 Field Mapping Reference

| VCF Field (ParsedContact) | Form Field | Transformation |
|---------------------------|------------|----------------|
| `firstName` | `firstName` | Direct |
| `lastName` | `lastName` | Direct, fallback to empty string |
| `primaryEmail` | `primaryEmail` | Direct |
| `secondaryEmail` | `secondaryEmail` | Direct |
| `primaryPhone` | `primaryPhone` | Direct |
| `secondaryPhone` | `secondaryPhone` | Direct |
| `title` | `title` | Direct |
| `company` | `company` | Direct |
| `city` + `state` | `location` | Join with ", " |
| `linkedinUrl` | `linkedinUrl` | Direct |
| `notes` | `notes` | Direct |
| N/A | `organizationalTitle` | Empty (not in VCF) |
| N/A | `howWeMet` | Empty (not in VCF) |
| N/A | `relationshipStrength` | Default to 1 |
| N/A | `whyNow` | Empty (not in VCF) |
| N/A | `expertise` | Empty (not in VCF) |
| N/A | `interests` | Empty (not in VCF) |

---

## 4. Edge Cases

| Scenario | Behavior |
|----------|----------|
| Empty .vcf file | Toast: "No contact found" |
| .vcf with no parseable name | Toast: "No contact found" (parser skips nameless entries) |
| Multi-contact .vcf | Dialog with link to `/contacts/import` |
| Non-.vcf file selected | Toast: "Invalid file type" |
| File read error | Toast: "Import failed" with description |
| Form has data, user cancels import | Form data preserved, dialog closes |
| Form has data, user confirms import | Form reset with VCF data |
| VCF has partial data | Only available fields populated |
| Desktop viewport | Import button hidden |
| SSR/hydration | Button hidden until `isMobile` resolves (undefined → false/true) |

---

## 5. Testing Plan

### Manual Testing (iOS Safari)

1. **Happy path:**
   - Share contact from iOS Contacts → Save to Files
   - Open `/contacts/new` on mobile Safari
   - Tap "Import a vCard"
   - Select file from Files app
   - Verify fields populate correctly
   - Save contact

2. **Multi-contact rejection:**
   - Export multiple contacts as single .vcf from iCloud
   - Try to import on mobile
   - Verify dialog appears with link to bulk import

3. **Overwrite confirmation:**
   - Fill in some fields manually
   - Tap "Import a vCard"
   - Verify confirmation dialog appears
   - Test both Cancel (data preserved) and Import (data replaced)

4. **Error handling:**
   - Try importing a .txt file renamed to .vcf
   - Try importing an empty file
   - Verify appropriate error toasts

5. **Viewport responsiveness:**
   - Verify button visible at < 768px
   - Verify button hidden at >= 768px

### Automated Testing

E2E test file: `.quick-checks/test-mobile-vcf-import.spec.ts`

```typescript
test.describe('Mobile VCF Import', () => {
  test.use({ viewport: { width: 375, height: 812 } }); // iPhone viewport

  test('shows import button on mobile', async ({ page }) => {
    await page.goto('/contacts/new');
    await expect(page.getByText('Import a vCard')).toBeVisible();
  });

  test('hides import button on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/contacts/new');
    await expect(page.getByText('Import a vCard')).not.toBeVisible();
  });

  test('imports single-contact vcf', async ({ page }) => {
    await page.goto('/contacts/new');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('fixtures/single-contact.vcf');
    await expect(page.locator('#firstName')).toHaveValue('John');
  });

  test('rejects multi-contact vcf', async ({ page }) => {
    await page.goto('/contacts/new');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('fixtures/multi-contact.vcf');
    await expect(page.getByText('Multiple contacts detected')).toBeVisible();
  });
});
```

---

## 6. Implementation Checklist

- [ ] Add imports (`useIsMobile`, `parseVcfFile`, `FileUp`, `AlertDialog`)
- [ ] Add state variables (`isImporting`, dialogs, `pendingVcfData`)
- [ ] Add `mapVcfToFormData()` function
- [ ] Add `formHasData()` check function
- [ ] Add `handleVcfFileSelect()` handler
- [ ] Add `applyVcfData()` function
- [ ] Add `handleOverwriteConfirm/Cancel()` handlers
- [ ] Add import button UI (mobile only)
- [ ] Add overwrite confirmation dialog
- [ ] Add multi-contact dialog with link
- [ ] Manual test on iOS Safari
- [ ] Verify desktop hides button
- [ ] Update CLAUDE.md with pattern documentation (if significant)

---

## 7. Files Modified

| File | Change |
|------|--------|
| `src/components/contacts/ContactForm.tsx` | Add import button, handlers, dialogs (~120 lines) |

**No new files required.** Reuses existing `vcf-parser.ts` and `useMediaQuery.ts`.

---

## 8. Dependencies

- `@/lib/vcf-parser` - Already exists, no changes needed
- `@/hooks/useMediaQuery` - Already exists, no changes needed
- `@/components/ui/alert-dialog` - Already exists (shadcn/ui)
- `lucide-react` - Already installed, using `FileUp` icon

**No new npm packages required.**
