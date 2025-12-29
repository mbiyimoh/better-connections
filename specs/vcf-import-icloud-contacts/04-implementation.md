# VCF Import (iCloud Contacts) - Implementation Summary

## Status: Complete

**Completed:** 2024-12-29

## Files Created

### Core Parser Module
- `src/lib/vcf-parser.ts` - VCF parsing utility with field extraction and conflict detection

### API Endpoints
- `src/app/api/contacts/import/vcf/route.ts` - Upload and analyze VCF files
- `src/app/api/contacts/import/vcf/commit/route.ts` - Commit import with merge decisions

### UI Components
- `src/components/import/ImportSourceCard.tsx` - Reusable import source selection card
- `src/components/import/VcfImportFlow.tsx` - Complete VCF import flow with steps
- `src/components/import/ImportMergeReview.tsx` - Modal for per-field conflict resolution
- `src/components/import/index.ts` - Barrel export file

### Modified Files
- `src/app/(dashboard)/contacts/import/page.tsx` - Added source selection UI and VCF flow
- `package.json` - Added vcard4-ts dependency

## Implementation Details

### VCF Parser (`src/lib/vcf-parser.ts`)

Key functions:
- `parseVcfFile(content: string)` - Main entry point, parses VCF content into contacts
- `extractName(vcard)` - Extracts firstName/lastName from N field
- `extractEmails(vcard)` - Extracts primary/secondary emails with PREF priority
- `extractPhones(vcard)` - Extracts phones with type-based priority (cell > mobile > work > home)
- `extractAddress(vcard)` - Extracts address components from ADR field
- `extractUrls(vcard)` - Extracts LinkedIn and website URLs
- `detectConflicts(incoming, existing)` - Detects field-level conflicts for merge review

Types exported:
- `ParsedContact` - Parsed VCF contact data
- `SkippedEntry` - Entry that couldn't be parsed
- `FieldConflict` - Field-level conflict between incoming and existing

### API: Upload Endpoint (`/api/contacts/import/vcf`)

**Method:** POST (FormData with `file` field)

**Response:**
```typescript
{
  success: boolean;
  analysis?: {
    newContacts: ParsedContact[];
    duplicates: DuplicateAnalysis[];
    skipped: SkippedEntry[];
  };
  error?: { code: string; message: string };
}
```

**Duplicate detection:** Matches by primaryEmail against existing contacts

### API: Commit Endpoint (`/api/contacts/import/vcf/commit`)

**Method:** POST (JSON)

**Request body:**
```typescript
{
  newContacts: ParsedContact[];
  duplicateResolutions: DuplicateResolution[];
}
```

**Resolution actions:**
- `skip` - Don't import the duplicate
- `merge` - Apply field decisions (keep existing or use new value)

**Smart merge behavior:**
- Empty existing fields are auto-filled from incoming data
- Notes are appended (not replaced)
- Overflow emails/phones go to notes

### UI Components

**ImportSourceCard** - Selection card for import sources
- Props: icon, title, description, fileTypeHint, onClick, disabled

**VcfImportFlow** - Multi-step import wizard
- Steps: upload → analyzing → review → importing → complete
- Uses react-dropzone for file upload
- 10MB file size limit

**ImportMergeReview** - Conflict resolution modal
- Per-contact navigation with keyboard support (Arrow keys, Escape)
- Per-field radio buttons for keep/use_new decisions
- Skip/undo functionality
- "Accept All Defaults" bulk action

## Technical Decisions

### Library Choice: vcard4-ts
- TypeScript-first with strong types
- Handles vCard 3.0 and 4.0 formats
- Complex nested structures (N, ADR, ORG fields) properly typed

### Phone Priority System
Priority order for primary phone selection:
1. CELL type
2. MOBILE type
3. WORK type
4. HOME type
5. First available

### Email Priority System
Uses vCard PREF parameter (lower number = higher priority)

### Conflict Detection
Only reports conflicts when:
- Existing field has a value AND
- Incoming field has a different value

Auto-fill happens for:
- Existing field is null/empty AND
- Incoming field has a value

## Known Limitations

1. **No test coverage** - Project lacks testing infrastructure (no Jest/Vitest)
2. **Email-only duplicate detection** - Only matches on primaryEmail
3. **Single file upload** - No batch/multiple file support
4. **No undo after commit** - Changes are permanent once committed

## Future Enhancements

From specification nice-to-haves:
- Google Contacts integration
- Outlook integration
- Drag-and-drop improvements
- Import history/audit trail
