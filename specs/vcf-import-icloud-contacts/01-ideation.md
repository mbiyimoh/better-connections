# VCF (vCard) Import for iCloud Contacts

**Slug:** vcf-import-icloud-contacts
**Author:** Claude Code
**Date:** 2025-12-29
**Branch:** feat/vcf-import-icloud-contacts
**Related:**
- `src/app/api/contacts/import/csv/route.ts` (reference pattern)
- `src/lib/csv-analysis.ts` (field mapping patterns)
- `src/app/(dashboard)/contacts/import/page.tsx` (UI reference)

---

## 1) Intent & Assumptions

**Task brief:** Add VCF (vCard) file import support to Better Connections, enabling users to bulk import contacts from iCloud or any vCard-compatible source. The primary use case is a user exporting their entire iCloud address book (or a portion) as a .vcf file and uploading it.

**Assumptions:**
- Users will export contacts from iCloud.com → Settings → Export vCard
- iCloud exports vCard 3.0 format (most common, best compatibility)
- A single .vcf file can contain multiple contacts (multi-contact vCard)
- Files may range from single contacts to 1000+ contacts
- Photos embedded in vCards should be skipped (large base64 strings, not needed for v1)
- Source tracking: imported contacts get `source: 'ICLOUD'`

**Out of scope:**
- Direct iCloud API integration (OAuth, sync)
- Two-way sync or incremental updates
- vCard export functionality (export from Better Connections)
- Photo import (embedded base64 photos in vCards)
- Field mapping UI customization (use sensible auto-mapping only)
- Individual contact sharing via vCard

---

## 2) Pre-reading Log

| File | Takeaway |
|------|----------|
| `prisma/schema.prisma` | Contact model uses split `firstName`/`lastName`, primary/secondary email/phone, detailed address fields. Has `ICLOUD` in `ContactSource` enum. |
| `src/lib/csv-analysis.ts` | Field mapping patterns with SYSTEM_FIELDS array. Reference for creating VCF equivalent mappings. |
| `src/app/api/contacts/import/csv/route.ts` | Import pattern: Supabase auth → user upsert → Zod validation → duplicate check → enrichment score → Prisma create. Returns `{success, contact}` or `{skipped, reason}`. |
| `src/lib/enrichment.ts` | `calculateEnrichmentScore()` function already exists. Reuse for VCF imports. |
| `src/app/(dashboard)/contacts/import/page.tsx` | 4-step UI: Upload → Mapping → Importing → Complete. VCF can follow similar pattern but simpler (no mapping step needed). |
| `CLAUDE.md` | Design system: dark theme, gold accent (#C9A227), no emojis. |

---

## 3) Codebase Map

**Primary components/modules:**
- `src/app/api/contacts/import/vcf/route.ts` (NEW) - API endpoint for VCF import
- `src/lib/vcf-parser.ts` (NEW) - VCF parsing utilities and field mapping
- `src/app/(dashboard)/contacts/import/page.tsx` - Extend existing import page with VCF tab

**Shared dependencies:**
- `@/lib/db` - Prisma client
- `@/lib/supabase/server` - Auth
- `@/lib/enrichment` - calculateEnrichmentScore
- `zod` - Validation
- `lucide-react` - Icons

**Data flow:**
```
VCF File (user upload)
    ↓
File → FormData → API Route
    ↓
vcard4-ts parseVCards()
    ↓
Map each vCard → Contact object
    ↓
Batch insert with duplicate checking
    ↓
Return summary: {imported, skipped, errors}
```

**Feature flags/config:** None needed

**Potential blast radius:**
- Import page UI (add VCF section)
- No impact on existing CSV flow
- No database schema changes (ICLOUD source already exists)

---

## 4) Root Cause Analysis

N/A - This is a new feature, not a bug fix.

---

## 5) Research

### Library Evaluation

| Library | TypeScript | Multi-Contact | Size | Verdict |
|---------|-----------|--------------|------|---------|
| **vcard4-ts** | Native | Yes (`parseVCards()`) | 10kb | **Recommended** |
| ical.js | Config | Yes | Medium | Too heavy (includes iCal) |
| vcard4 | Full | Yes | Medium | Less documented |
| vcf | Unknown | Manual split | Small | Not maintained |

**vcard4-ts** wins because:
- TypeScript-first design with full type safety
- Explicit multi-contact support via `parseVCards()` function
- Zero dependencies, tiny footprint (10kb)
- Properties that appear multiple times are always arrays (predictable API)

### vCard Field → Better Connections Mapping

| vCard Property | Contact Field | Notes |
|---------------|---------------|-------|
| `FN` | (display name) | Used as fallback if N missing |
| `N` | `firstName`, `lastName` | N.value = [family, given, middle, prefix, suffix] |
| `EMAIL` (first) | `primaryEmail` | Multiple allowed, take first |
| `EMAIL` (second+) | `secondaryEmail` | Subsequent emails |
| `TEL` (cell/mobile) | `primaryPhone` | Prioritize TYPE=cell/mobile |
| `TEL` (other) | `secondaryPhone` | Work, home, etc. |
| `ORG` | `company` | Organization name |
| `TITLE` | `title` | Job title |
| `ADR` | `streetAddress`, `city`, `state`, `zipCode`, `country` | ADR = [PO, Ext, Street, City, Region, Postal, Country] |
| `URL` | `linkedinUrl` or `websiteUrl` | Detect LinkedIn URLs |
| `NOTE` | `notes` | Contact notes |
| `BDAY` | (not mapped) | Could add later |
| `PHOTO` | (skipped) | Too large for v1 |

### Potential Solutions

**Option 1: Server-Side Parsing (Recommended)**
- Parse VCF in API route using vcard4-ts
- Batch database inserts
- Progress tracking for large files

*Pros:*
- Better memory handling for large files
- Can implement streaming for 1000+ contacts
- Cleaner error handling
- Server-side validation before DB

*Cons:*
- Requires file upload to server

**Option 2: Client-Side Parsing**
- Parse in browser like CSV import
- Send contacts one-by-one

*Pros:*
- Matches existing CSV pattern
- No server memory concerns

*Cons:*
- Browser can crash on large files (5MB+ common with photos)
- Slower for bulk imports
- Less control over error handling

**Recommendation:** Option 1 (Server-Side Parsing) for better handling of real-world iCloud exports that can be large.

---

## 6) Clarifications (Resolved)

### 1. UI Placement: Source-Based Navigation
**Decision:** Separate tab on existing import page with **source-based labeling**:
- Primary labels: "Import from iCloud", "Import from Google Contacts"
- File types mentioned subtly underneath for technical clarity
- Import landing page acts as router directing users to the right experience
- Non-technical users care about *where contacts come from*, not file formats

### 2. Duplicate Handling: Smart Merge with Review
**Decision:** When a contact with matching email exists, use **smart merge with user review**:

**Phase 1: Detection**
- Match by `primaryEmail` (exact match)
- Identify field-by-field conflicts

**Phase 2: Review UI** (following ConflictResolutionModal pattern)
- Show existing value vs incoming value for each conflicting field
- User chooses "Keep existing" or "Use new" per field
- Default to "Keep existing" (conservative)

**Smart Merge Rules:**
| Field Type | Behavior |
|-----------|----------|
| Text fields (notes, expertise, interests) | Append/merge intelligently |
| Structured fields (title, company, name) | User chooses via conflict UI |
| Additive fields (emails, phones) | Fill empty slots, extras to notes |
| URLs | Fill empty, detect LinkedIn |
| Address fields | Fill empty components |

**References:**
- `src/app/(dashboard)/enrichment/session/page.tsx` - ConflictResolutionModal
- `src/components/enrichment/completion/MentionedPersonCard.tsx` - Review patterns

### 3. Multiple Emails/Phones: Preserve in Notes
**Decision:** Take first 2, append extras to notes
- `primaryEmail` ← first email
- `secondaryEmail` ← second email
- Third+ emails → `[Additional Email: value]` in notes
- Same pattern for phones

### 4. Progress Feedback: Progress Bar with Count
**Decision:** "Importing 156 of 500..." with progress bar
- Essential for large iCloud exports
- Provides confidence the process is working
- Shows real-time count updates

### 5. File Size Limit: 10 MB
**Decision:** 10 MB maximum (~5000 contacts)
- Accommodates most real-world iCloud exports
- Server-side parsing handles this safely

---

## 7) Implementation Approach

### Files to Create

1. **`src/lib/vcf-parser.ts`** - VCF parsing utilities
   - `parseVcfFile(content: string)` - Wrapper around vcard4-ts
   - `mapVCardToContact(vcard)` - Field mapping
   - `extractPhones(vcardPhones)` - Smart phone extraction with type priority
   - `extractEmails(vcardEmails)` - Email extraction with overflow to notes
   - `formatAddress(vcardAddress)` - Address field breakdown
   - `detectLinkedInUrl(urls)` - LinkedIn vs website detection

2. **`src/app/api/contacts/import/vcf/route.ts`** - API endpoint
   - POST handler for file upload
   - Returns parsed contacts + detected duplicates

3. **`src/app/api/contacts/import/vcf/merge/route.ts`** - Merge API
   - POST handler for applying merge decisions
   - Handles conflict resolution per user choices

4. **`src/components/import/ImportMergeReview.tsx`** - Merge review modal
   - Shows conflicts for each duplicate contact
   - Radio buttons: "Keep existing" vs "Use new" per field
   - Batch approve all / individual review

5. **`src/components/import/ImportSourceCard.tsx`** - Source selection card
   - Reusable card for import sources (iCloud, Google, etc.)
   - Icon, title, description, file type hint

### Files to Modify

1. **`src/app/(dashboard)/contacts/import/page.tsx`**
   - Refactor to source-based landing page
   - Add iCloud tab/flow with VCF uploader
   - Integrate merge review modal
   - Progress bar for large imports

### Implementation Steps

**Phase 1: Core Parsing**
```bash
npm install vcard4-ts
```
- Create `vcf-parser.ts` with field mapping logic
- Unit tests for parsing edge cases

**Phase 2: API Endpoints**
- VCF upload endpoint (parse, detect duplicates, return analysis)
- Merge endpoint (apply user decisions)

**Phase 3: Import UI Refactor**
- Source-based landing page ("Import from iCloud", "Import from Google")
- File type hints shown subtly
- Progress bar with real-time count

**Phase 4: Merge Review UI**
- Modal following ConflictResolutionModal pattern
- Field-by-field comparison
- Batch vs individual actions
- Summary of what will be created/updated

**Phase 5: Integration & Polish**
- E2E tests for full import flow
- Error handling for malformed files
- Edge case handling (no contacts, all duplicates, etc.)

### Data Flow (Updated)

```
1. User lands on /contacts/import
   └─ Sees source cards: "Import from iCloud", "Import from Google"

2. User clicks "Import from iCloud"
   └─ Tab/section with VCF dropzone + instructions

3. User uploads .vcf file
   └─ POST /api/contacts/import/vcf
   └─ Server parses with vcard4-ts
   └─ Detects duplicates by primaryEmail
   └─ Returns: { newContacts[], duplicates[], errors[] }

4. If duplicates exist:
   └─ ImportMergeReview modal opens
   └─ Shows field-by-field conflicts per duplicate
   └─ User chooses per field: keep existing / use new
   └─ Progress: "Reviewing 1 of 12 conflicts..."

5. User confirms
   └─ POST /api/contacts/import/vcf/merge
   └─ Creates new contacts
   └─ Updates duplicates per user decisions
   └─ Progress bar: "Importing 156 of 500..."

6. Completion screen
   └─ Summary: Created X, Updated Y, Skipped Z
   └─ "View Contacts" button
```

### Estimated Scope
- New code: ~800-1000 lines (larger due to merge review)
- Modified code: ~200 lines (import page refactor)
- Testing: Unit tests for parser, E2E for full flow

---

## 8) Risks & Considerations

| Risk | Mitigation |
|------|------------|
| Large file memory issues | Server-side parsing with batch processing |
| Malformed vCard files | Graceful error handling, skip invalid entries |
| Character encoding issues | Detect/strip BOM, ensure UTF-8 |
| Missing required fields | Fallback: use FN if N missing, generate firstName |
| Photo data bloat | Skip PHOTO property entirely |
| Merge review UX complexity | Follow established ConflictResolutionModal pattern |
| Too many conflicts overwhelms user | Batch actions + "Accept all defaults" option |
| Performance with 1000+ contacts | Pagination in merge review, streaming imports |

---

## 9) Merge Review UX Pattern

Based on existing patterns in `ConflictResolutionModal` and `MentionedPersonCard`:

### Visual Design
```
┌─────────────────────────────────────────────────────────┐
│  Review Import Conflicts                         [×]    │
│─────────────────────────────────────────────────────────│
│                                                         │
│  12 contacts already exist in your network.             │
│  Review what should be updated.                         │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ John Smith (john@example.com)              1/12 │   │
│  │─────────────────────────────────────────────────│   │
│  │                                                 │   │
│  │ Title                                           │   │
│  │ ○ Keep: "Product Manager"                       │   │
│  │ ● Use new: "Senior Product Manager"             │   │
│  │                                                 │   │
│  │ Company                                         │   │
│  │ ● Keep: "Acme Corp"                             │   │
│  │ ○ Use new: "Acme Corporation"                   │   │
│  │                                                 │   │
│  │ Notes                                           │   │
│  │ ✓ Will append new notes to existing             │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [← Previous]  [Skip this contact]  [Next →]           │
│                                                         │
│─────────────────────────────────────────────────────────│
│  [Accept All Defaults]              [Apply & Import]    │
└─────────────────────────────────────────────────────────┘
```

### Key Interactions
- **Per-contact view** with prev/next navigation
- **Per-field radio buttons**: Keep existing (default) vs Use new
- **Auto-merge indicator** for text fields (notes, etc.)
- **Skip option** to exclude a contact entirely
- **Accept All Defaults** for quick flow (keeps all existing)
- **Apply & Import** commits decisions and starts import

### Color Coding
- Existing values: `text-white` (neutral)
- New values: `text-green-400` (highlight change)
- Auto-merge: `text-blue-400` with info icon
- Skipped: `text-zinc-500` (dimmed)

---

## Sources & References

- [vCard Wikipedia](https://en.wikipedia.org/wiki/VCard)
- [RFC 6350 - vCard Format Specification](https://tools.ietf.org/html/rfc6350)
- [vcard4-ts npm](https://www.npmjs.com/package/vcard4-ts)
- [Apple Support - Export iCloud Contacts](https://support.apple.com/guide/icloud/import-export-and-print-contacts-mmfba748b2/icloud)
