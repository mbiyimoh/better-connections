# Mobile VCF Single Import for New Contact Screen

**Slug:** mobile-vcf-single-import
**Author:** Claude Code
**Date:** 2026-01-23
**Branch:** feat/mobile-vcf-single-import
**Related:**
- `specs/vcf-import-icloud-contacts/` - Existing bulk VCF import spec
- `developer-guides/06-contact-import-guide.md` - Import system documentation
- `src/components/contacts/ContactForm.tsx` - Target component for modification

---

## 1) Intent & Assumptions

**Task brief:** Add an "Import a vCard" button to the mobile new contact screen (`/contacts/new`) that allows users to upload a single .vcf file from their device's Files app. This bridges the gap until native iOS app support, letting mobile users import contacts one at a time via the standard file picker.

**Assumptions:**
- Target platform is iOS Safari (browser and PWA)
- Users share a contact from iOS Contacts app → save to Files → upload via this feature
- Single-contact VCF files only (multi-contact files should use `/contacts/import`)
- No duplicate detection needed (user is explicitly creating a new contact)
- Form should pre-fill with VCF data, allowing user to review/edit before saving
- Button should only appear on mobile viewports (< 768px)
- Reuse existing `vcf-parser.ts` for parsing

**Out of scope:**
- Multi-contact VCF import (use existing `/contacts/import` flow)
- Duplicate detection and merge UI (single contact = user's intent is clear)
- Desktop implementation (desktop has full import page accessible)
- Direct file sharing from Contacts app (requires native iOS integration)
- Drag-and-drop UI (not mobile-friendly)

---

## 2) Pre-reading Log

| File | Takeaway |
|------|----------|
| `src/app/(dashboard)/contacts/new/page.tsx` | Simple server component rendering `<ContactForm />` - modification point is the form component |
| `src/components/contacts/ContactForm.tsx` | 509-line form with sections for basic info, relationship, why now, tags, additional info. Uses react-hook-form + zod. Has sticky submit bar at bottom. |
| `src/lib/vcf-parser.ts` | `parseVcfFile()` returns `{ contacts, skipped }` - can reuse for single-contact parsing |
| `src/components/import/VcfImportFlow.tsx` | Uses react-dropzone for file upload - research shows this has iOS bugs, should use native input instead |
| `developer-guides/06-contact-import-guide.md` | Documents MIME types, field mapping, phone priority - all reusable |
| `specs/vcf-import-icloud-contacts/01-ideation.md` | Library choice (vcard4-ts), field mapping decisions already made |
| `src/hooks/useMediaQuery.ts` | `useIsMobile()` hook for viewport detection - use this for conditional rendering |

---

## 3) Codebase Map

**Primary components/modules:**
- `src/components/contacts/ContactForm.tsx` - Add import button and file handling logic
- `src/lib/vcf-parser.ts` - Reuse `parseVcfFile()` for parsing (no changes needed)

**Shared dependencies:**
- `@/hooks/useMediaQuery` - `useIsMobile()` for mobile detection
- `@/lib/vcf-parser` - VCF parsing utilities
- `react-hook-form` - Form state management (use `reset()` to populate form)
- `lucide-react` - Icons (FileUp or similar)

**Data flow:**
```
User taps "Import a vCard" button
    ↓
Native file input opens iOS Files picker
    ↓
User selects .vcf file
    ↓
Client reads file as text (FileReader)
    ↓
parseVcfFile() extracts contact data
    ↓
form.reset(mappedData) populates all fields
    ↓
User reviews/edits and clicks "Add Contact"
    ↓
Normal POST /api/contacts flow
```

**Feature flags/config:** None needed

**Potential blast radius:**
- `ContactForm.tsx` only - isolated change
- No API changes (reuse existing contact creation endpoint)
- No schema changes
- No impact on existing VCF bulk import flow

---

## 4) Root Cause Analysis

N/A - This is a new feature, not a bug fix.

---

## 5) Research

### Mobile File Upload on iOS Safari

**Critical findings from research:**

1. **react-dropzone has documented iOS bugs:**
   - MIME type detection fails on iOS Safari
   - Portal rendering issues
   - Label element conflicts
   - Drag state detection failures
   - **Recommendation:** Use native `<input type="file">` instead

2. **iOS `accept` attribute is unreliable:**
   - Safari ignores `accept` for non-image/video files
   - Must validate file extension client-side with JavaScript
   - Must also validate server-side (defense in depth)

3. **Files app access works:**
   - Native file input shows action sheet with "Choose Files" option
   - Users can select from local storage, iCloud Drive, third-party cloud apps

4. **Recommended implementation pattern:**
   ```tsx
   <label htmlFor="vcf-upload" className="...button-styles...">
     Import a vCard
     <input
       id="vcf-upload"
       type="file"
       accept=".vcf,.vcard,text/vcard,text/x-vcard"
       onChange={handleFileSelect}
       className="sr-only"  // Visually hidden
     />
   </label>
   ```

5. **Client-side validation required:**
   ```typescript
   const isVcf = file.name.toLowerCase().endsWith('.vcf') ||
                 file.name.toLowerCase().endsWith('.vcard');
   ```

### Potential Solutions

**Option 1: Inline Button in Header (Recommended)**
- Add "Import a vCard" button in the form header, below "Add Contact" title
- Only visible on mobile (`useIsMobile()`)
- Uses native file input with styled label
- Pre-fills form fields, user reviews and saves

*Pros:*
- Discoverable - user sees option immediately
- Simple UX - single tap to import
- Non-disruptive - doesn't change form layout
- Reuses existing parser and form validation

*Cons:*
- Adds visual complexity to header
- None significant

**Option 2: Bottom Sheet / Modal Approach**
- Add small icon button that opens a bottom sheet with import option
- More hidden, requires extra tap

*Pros:*
- Cleaner initial view
- Could expand to more import options later

*Cons:*
- Less discoverable (extra tap required)
- Over-engineered for single feature
- Bottom sheets are complex on mobile

**Option 3: Replace FAB Functionality**
- Make FAB open a choice: "Create manually" vs "Import vCard"

*Pros:*
- Central entry point

*Cons:*
- Adds friction to manual creation (most common path)
- Requires significant FAB refactoring

**Recommendation:** Option 1 (Inline Button in Header)

The simplest, most discoverable solution. Users opening `/contacts/new` on mobile will immediately see they can import a vCard. No extra taps, no modals, no FAB changes.

### UX Design

```
┌─────────────────────────────────────────────┐
│  ← Back to Contacts                         │
│                                             │
│  Add Contact                                │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  📁  Import a vCard                 │   │  ← Only on mobile
│  └─────────────────────────────────────┘   │
│                                             │
│  ─────────────────────────────────────────  │
│  Basic Information                          │
│  ...form fields...                          │
└─────────────────────────────────────────────┘
```

Button styling:
- Secondary/outline style (not competing with primary CTA)
- Gold border/text on hover (brand consistency)
- FileUp icon from lucide-react
- Full width on mobile for easy tap target

### Field Mapping (VCF → Form)

| VCF Field | Form Field | Notes |
|-----------|------------|-------|
| `firstName` | `firstName` | Direct map |
| `lastName` | `lastName` | Direct map |
| `primaryEmail` | `primaryEmail` | Direct map |
| `secondaryEmail` | `secondaryEmail` | Direct map |
| `primaryPhone` | `primaryPhone` | Direct map |
| `secondaryPhone` | `secondaryPhone` | Direct map |
| `title` | `title` | Direct map |
| `company` | `company` | Direct map |
| `city` | `location` | Combine city + state if available |
| `linkedinUrl` | `linkedinUrl` | Direct map |
| `notes` | `notes` | Direct map |

Note: `howWeMet`, `relationshipStrength`, `whyNow`, `expertise`, `interests`, `tags` are not in VCF - user fills these manually.

---

## 6) Clarifications

1. **Multi-contact file handling:** If user selects a VCF with multiple contacts, should we:
   - a) Only import the first contact and show a message?
   - b) Show an error directing them to `/contacts/import`?
   - c) Auto-navigate to the bulk import flow?

   **Recommendation:** Option (b) - Show toast: "This file contains multiple contacts. Please use the Import page for bulk imports." This keeps the feature simple and educates users about the right tool.

2. **Existing data warning:** If user has already filled some form fields and then imports a vCard, should we:
   - a) Overwrite all fields (could lose work)
   - b) Only fill empty fields (preserves user input)
   - c) Show a confirmation dialog

   **Recommendation:** Option (c) for safety - "Importing will replace your current entries. Continue?" with Cancel/Import buttons. Simple confirm dialog, not a complex merge UI.

3. **Error handling for invalid files:** If the file can't be parsed or has no valid contact:
   - Toast with error message
   - Keep user on form with their existing data intact
   - Don't navigate away or clear form

---

## 7) Implementation Approach

### Files to Modify

1. **`src/components/contacts/ContactForm.tsx`**
   - Add `useIsMobile()` hook
   - Add file input with hidden native input + styled label
   - Add `handleVcfImport()` function
   - Add confirmation dialog state (if user has existing entries)

### Implementation Steps

**Phase 1: Core Implementation (~50 lines)**

1. Import dependencies:
   ```typescript
   import { useIsMobile } from '@/hooks/useMediaQuery';
   import { parseVcfFile } from '@/lib/vcf-parser';
   import { FileUp } from 'lucide-react';
   ```

2. Add state for import handling:
   ```typescript
   const isMobile = useIsMobile();
   const [isImporting, setIsImporting] = useState(false);
   ```

3. Add file handler:
   ```typescript
   const handleVcfImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;

     // Validate extension (iOS ignores accept attribute)
     const isVcf = file.name.toLowerCase().endsWith('.vcf') ||
                   file.name.toLowerCase().endsWith('.vcard');
     if (!isVcf) {
       toast({ title: 'Invalid file', description: 'Please select a .vcf file' });
       return;
     }

     setIsImporting(true);
     try {
       const text = await file.text();
       const { contacts, skipped } = parseVcfFile(text);

       if (contacts.length === 0) {
         toast({ title: 'No contacts found', description: 'Could not read contact from file' });
         return;
       }

       if (contacts.length > 1) {
         toast({
           title: 'Multiple contacts detected',
           description: 'This file has multiple contacts. Use Import page for bulk imports.'
         });
         return;
       }

       // Map to form data and reset form
       const contact = contacts[0];
       reset({
         firstName: contact.firstName,
         lastName: contact.lastName || '',
         primaryEmail: contact.primaryEmail || '',
         // ... map all fields
       });

       toast({ title: 'Contact imported', description: 'Review and save the contact.' });
     } catch {
       toast({ title: 'Import failed', description: 'Could not read the file.' });
     } finally {
       setIsImporting(false);
       // Reset input so same file can be selected again
       e.target.value = '';
     }
   };
   ```

4. Add import button (mobile only) in header section:
   ```tsx
   {isMobile && (
     <div className="mt-4">
       <label
         htmlFor="vcf-import"
         className={cn(
           "flex w-full items-center justify-center gap-2 rounded-lg border border-border",
           "bg-bg-secondary px-4 py-3 text-sm font-medium text-text-secondary",
           "hover:border-gold-primary hover:text-gold-primary transition-colors cursor-pointer",
           isImporting && "opacity-50 pointer-events-none"
         )}
       >
         {isImporting ? (
           <Loader2 className="h-4 w-4 animate-spin" />
         ) : (
           <FileUp className="h-4 w-4" />
         )}
         {isImporting ? 'Importing...' : 'Import a vCard'}
         <input
           id="vcf-import"
           type="file"
           accept=".vcf,.vcard,text/vcard,text/x-vcard"
           onChange={handleVcfImport}
           className="sr-only"
           disabled={isImporting}
         />
       </label>
       <p className="mt-2 text-center text-xs text-text-tertiary">
         Share a contact from Contacts app, save to Files, then import here
       </p>
     </div>
   )}
   ```

### Estimated Scope

- Modified code: ~80-100 lines in `ContactForm.tsx`
- No new files needed
- No API changes
- No database changes

### Testing

1. **Manual testing on iOS:**
   - Share contact from Contacts app → Save to Files
   - Open Better Connections on mobile Safari
   - Tap FAB → Navigate to /contacts/new
   - Tap "Import a vCard" → Select file from Files
   - Verify all fields populate correctly
   - Save contact and verify in list

2. **Edge cases:**
   - Empty VCF file → Error toast
   - Multi-contact VCF → Error toast with redirect suggestion
   - Invalid file type → Error toast
   - VCF with minimal data (name only) → Populates what's available

---

## 8) Risks & Considerations

| Risk | Mitigation |
|------|------------|
| iOS Safari ignores `accept` attribute | Client-side extension validation |
| Large file could slow down parsing | VCF files are typically small (<10KB); single-contact even smaller |
| User loses form data on import | Confirmation dialog if form has data (or just reset - simple is fine) |
| File input styling inconsistent | Use sr-only input with styled label (battle-tested pattern) |
| Parsing errors from unusual VCF | Graceful error handling with toast, form remains unchanged |

---

## 9) Success Criteria

1. Mobile users on `/contacts/new` see "Import a vCard" button
2. Tapping opens iOS file picker (Files app accessible)
3. Selecting valid .vcf pre-fills form fields
4. Invalid files show appropriate error messages
5. Multi-contact files are rejected with helpful message
6. Button is hidden on desktop viewports
7. Existing form functionality unchanged

