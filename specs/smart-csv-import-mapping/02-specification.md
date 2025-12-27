# Smart CSV Import with Schema Modernization

**Status:** Draft
**Author:** Claude Code
**Date:** 2025-12-25
**Spec Version:** 1.0

---

## 1. Overview

This specification covers two interconnected improvements to the Better Connections contact management system:

1. **Schema Modernization**: Split `name` into `firstName`/`lastName`, `email` into `primaryEmail`/`secondaryEmail`, and `phone` into `primaryPhone`/`secondaryPhone`
2. **Smart CSV Import**: Intelligent column filtering that hides empty columns, auto-maps populated columns, and offers to merge unmapped data into notes

These changes address the overwhelming UX of importing Google Contacts (35+ columns, most empty) while also improving the data model for better contact management.

---

## 2. Background/Problem Statement

### Current Pain Points

**Import UX Issues:**
- Google Contacts CSV exports ~35 columns; users typically have data in only 4-6
- Current UI shows ALL columns regardless of data presence
- Users must scroll through "Phonetic Middle Name" and "E-mail 2 - Label" to find relevant fields
- Auto-mapping is basic and maps many columns to "Name *" incorrectly

**Data Model Limitations:**
- Single `name` field doesn't support proper sorting by last name
- Single `email`/`phone` fields lose secondary contact info from imports
- No way to preserve unmapped but potentially valuable data (e.g., birthdays, labels)

### User Request
> "In an ideal world: 1) the system first looks to see which fields actually have values... 2) the system then smartly maps the remaining fields and asks about putting extras in notes"

---

## 3. Goals

- **G1**: Eliminate cognitive overload by hiding CSV columns with no data
- **G2**: Auto-map populated columns to system fields with high accuracy
- **G3**: Preserve unmapped data by offering to merge into notes field
- **G4**: Support first/last name separation for better sorting and display
- **G5**: Support primary/secondary email and phone for richer contact profiles
- **G6**: Maintain backward compatibility with existing contacts during migration

---

## 4. Non-Goals

- Custom field creation for frequently-imported non-standard fields
- Multiple import source templates (Google-specific, LinkedIn-specific)
- Batch validation/preview before import starts
- Import history or undo functionality
- AI-powered field mapping (keep it rule-based for predictability)

---

## 5. Technical Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| Prisma | 6.19.1 | Database ORM and migrations |
| papaparse | existing | CSV parsing |
| Zod | existing | Schema validation |
| @radix-ui/react-select | existing | Field mapping dropdowns |

---

## 6. Detailed Design

### 6.1 Schema Changes

```prisma
model Contact {
  id                    String    @id @default(uuid())
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Name fields (replacing single 'name')
  firstName             String
  lastName              String?

  // Email fields (replacing single 'email')
  primaryEmail          String?
  secondaryEmail        String?

  // Phone fields (replacing single 'phone')
  primaryPhone          String?
  secondaryPhone        String?

  // Rest unchanged
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

### 6.2 Data Migration Strategy

```sql
-- Migration: Split existing name field
UPDATE "Contact" SET
  "firstName" = SPLIT_PART("name", ' ', 1),
  "lastName" = CASE
    WHEN POSITION(' ' IN "name") > 0
    THEN SUBSTRING("name" FROM POSITION(' ' IN "name") + 1)
    ELSE NULL
  END;

-- Migration: Copy email to primaryEmail
UPDATE "Contact" SET "primaryEmail" = "email";

-- Migration: Copy phone to primaryPhone
UPDATE "Contact" SET "primaryPhone" = "phone";
```

### 6.3 CSV Column Analysis Algorithm

```typescript
// New file: src/lib/csv-analysis.ts

interface ColumnAnalysis {
  index: number;
  header: string;
  hasData: boolean;           // At least 1 row has non-empty value
  dataCount: number;          // Number of rows with data
  sampleValue: string;        // First non-empty value found
  suggestedField: string | null;  // System field match
  confidence: 'high' | 'medium' | 'low';
}

interface AnalysisResult {
  totalRows: number;
  populatedColumns: ColumnAnalysis[];  // Columns with data
  emptyColumns: string[];              // Column names with no data (hidden)
  mappedColumns: ColumnAnalysis[];     // Auto-mapped to system fields
  unmappedColumns: ColumnAnalysis[];   // Has data but no field match
}

function analyzeCSV(headers: string[], rows: string[][]): AnalysisResult {
  const analysis: ColumnAnalysis[] = headers.map((header, index) => {
    const values = rows.map(row => row[index]?.trim() || '');
    const nonEmptyValues = values.filter(v => v.length > 0);

    return {
      index,
      header,
      hasData: nonEmptyValues.length > 0,
      dataCount: nonEmptyValues.length,
      sampleValue: nonEmptyValues[0] || '',
      suggestedField: detectFieldMapping(header),
      confidence: calculateConfidence(header, nonEmptyValues[0]),
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
```

### 6.4 Smart Field Mapping Rules

```typescript
// Field detection with priority ordering
const fieldMappingRules: Array<{
  field: string;
  patterns: RegExp[];
  priority: number;
}> = [
  // Name fields
  { field: 'firstName', patterns: [/^first.?name$/i, /^given.?name$/i], priority: 1 },
  { field: 'lastName', patterns: [/^last.?name$/i, /^family.?name$/i, /^surname$/i], priority: 1 },

  // Email fields (priority matters - first match wins)
  { field: 'primaryEmail', patterns: [/^e?.?mail.?1?.?value$/i, /^email$/i, /^e-mail$/i], priority: 1 },
  { field: 'secondaryEmail', patterns: [/^e?.?mail.?2.?value$/i, /^secondary.?email$/i], priority: 2 },

  // Phone fields
  { field: 'primaryPhone', patterns: [/^phone.?1?.?value$/i, /^phone$/i, /^mobile$/i, /^cell$/i], priority: 1 },
  { field: 'secondaryPhone', patterns: [/^phone.?2.?value$/i, /^work.?phone$/i, /^home.?phone$/i], priority: 2 },

  // Other fields
  { field: 'company', patterns: [/^company$/i, /^organization.?(name)?$/i, /^employer$/i], priority: 1 },
  { field: 'title', patterns: [/^title$/i, /^job.?title$/i, /^position$/i, /^organization.?title$/i], priority: 1 },
  { field: 'location', patterns: [/^location$/i, /^city$/i, /^address$/i], priority: 1 },
  { field: 'linkedinUrl', patterns: [/linkedin/i], priority: 1 },
  { field: 'notes', patterns: [/^notes?$/i, /^comments?$/i], priority: 1 },
];

// Special handling for compound name detection
function detectNameColumns(columns: ColumnAnalysis[]): {
  firstNameCol: number | null;
  lastNameCol: number | null;
  fullNameCol: number | null;
} {
  // Prefer separate first/last, fall back to full name
}
```

### 6.5 Notes Merge Format

When unmapped columns with data are selected for inclusion:

```typescript
function formatUnmappedDataForNotes(
  unmappedColumns: Array<{ header: string; value: string }>
): string {
  // Format: [FieldName: value] [FieldName2: value2]
  return unmappedColumns
    .filter(c => c.value.trim())
    .map(c => `[${c.header}: ${c.value}]`)
    .join(' ');
}

// Example output:
// [Birthday: 1985-03-15] [Labels: myContacts] [Website: example.com]
```

### 6.6 New Import UI Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Upload                                              │
│  ─────────────────                                          │
│  [Drop CSV here or Browse]                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 2: Review Smart Mapping                               │
│  ───────────────────────────                                │
│                                                             │
│  📊 Found 847 contacts                                      │
│  🗂️ 28 columns detected, 6 have data                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✓ Confirmed Mappings                          [Edit]│   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ First Name + Last Name  →  Name     Sample: "John"  │   │
│  │ E-mail 1 - Value        →  Email    Sample: "j@..."│   │
│  │ Organization Name       →  Company  Sample: "Acme" │   │
│  │ Organization Title      →  Title    Sample: "CEO"  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⚠️ Extra Data (not mapped to fields)                │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ ☑ Birthday         Sample: "1985-03-15"             │   │
│  │ ☑ Labels           Sample: "myContacts"             │   │
│  │ ☐ Photo            Sample: "(binary data)"          │   │
│  │                                                     │   │
│  │ Selected items will be added to Notes field         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Back]                              [Import 847 Contacts]  │
└─────────────────────────────────────────────────────────────┘
```

### 6.7 Files to Modify

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add new fields, update indexes |
| `src/types/contact.ts` | Update Contact interface |
| `src/lib/validations/contact.ts` | Update Zod schemas |
| `src/lib/enrichment.ts` | Update score calculation |
| `src/lib/csv-analysis.ts` | **NEW** - Column analysis utilities |
| `src/app/api/contacts/route.ts` | Update search/sort logic |
| `src/app/api/contacts/[id]/route.ts` | Update validation |
| `src/app/api/contacts/import/csv/route.ts` | Update import schema |
| `src/app/api/contacts/export/route.ts` | Update export columns |
| `src/app/api/chat/draft-intro/route.ts` | Update name handling |
| `src/app/api/chat/explore/route.ts` | Update name/email handling |
| `src/app/api/enrichment/queue/route.ts` | Update field references |
| `src/components/contacts/ContactForm.tsx` | Split into firstName/lastName fields |
| `src/components/contacts/ContactDetail.tsx` | Update display |
| `src/components/contacts/ContactsTable.tsx` | Update display and sort |
| `src/components/chat/ContactCard.tsx` | Update name display |
| `src/components/chat/DraftIntroModal.tsx` | Update name display |
| `src/app/(dashboard)/contacts/import/page.tsx` | Complete rewrite of mapping UI |
| `src/app/(dashboard)/enrichment/page.tsx` | Update name display |
| `src/app/(dashboard)/enrichment/session/page.tsx` | Update name/email display |

---

## 7. User Experience

### Import Flow Changes

**Before:**
1. Upload CSV → See 35 rows of field mappings → Scroll forever → Import

**After:**
1. Upload CSV → See clean summary of 5-6 mapped fields
2. Optional: Check boxes for extra data to include in notes
3. Import

### Contact Display Changes

- Names display as "FirstName LastName" everywhere
- Contact detail shows Primary Email prominently, Secondary Email below
- Same for phone numbers
- Sort by last name by default in contact list

### Form Changes

- Contact form now has separate First Name / Last Name fields
- Email section shows Primary Email (required feel) and Secondary Email (optional)
- Phone section same pattern

---

## 8. Testing Strategy

### Unit Tests

```typescript
// src/lib/__tests__/csv-analysis.test.ts

describe('analyzeCSV', () => {
  it('identifies empty columns correctly', () => {
    const headers = ['Name', 'Birthday', 'Photo'];
    const rows = [
      ['John Doe', '', ''],
      ['Jane Doe', '', ''],
    ];
    const result = analyzeCSV(headers, rows);
    expect(result.emptyColumns).toContain('Birthday');
    expect(result.emptyColumns).toContain('Photo');
    expect(result.populatedColumns.map(c => c.header)).toContain('Name');
  });

  it('auto-maps common field names', () => {
    const headers = ['First Name', 'Last Name', 'E-mail 1 - Value'];
    const rows = [['John', 'Doe', 'john@example.com']];
    const result = analyzeCSV(headers, rows);

    expect(result.mappedColumns.find(c => c.header === 'First Name')?.suggestedField)
      .toBe('firstName');
    expect(result.mappedColumns.find(c => c.header === 'E-mail 1 - Value')?.suggestedField)
      .toBe('primaryEmail');
  });

  it('identifies unmapped columns with data', () => {
    const headers = ['Name', 'Birthday', 'Custom Field'];
    const rows = [['John', '1990-01-01', 'custom value']];
    const result = analyzeCSV(headers, rows);

    expect(result.unmappedColumns.map(c => c.header)).toContain('Birthday');
    expect(result.unmappedColumns.map(c => c.header)).toContain('Custom Field');
  });
});

describe('formatUnmappedDataForNotes', () => {
  it('formats data in bracket notation', () => {
    const data = [
      { header: 'Birthday', value: '1990-01-01' },
      { header: 'Labels', value: 'friends' },
    ];
    const result = formatUnmappedDataForNotes(data);
    expect(result).toBe('[Birthday: 1990-01-01] [Labels: friends]');
  });

  it('skips empty values', () => {
    const data = [
      { header: 'Birthday', value: '1990-01-01' },
      { header: 'Labels', value: '' },
    ];
    const result = formatUnmappedDataForNotes(data);
    expect(result).toBe('[Birthday: 1990-01-01]');
  });
});
```

### Integration Tests

```typescript
// Test import API with new schema
describe('POST /api/contacts/import/csv', () => {
  it('accepts firstName and lastName separately', async () => {
    const response = await fetch('/api/contacts/import/csv', {
      method: 'POST',
      body: JSON.stringify({
        contact: {
          firstName: 'John',
          lastName: 'Doe',
          primaryEmail: 'john@example.com',
        },
        skipDuplicates: true,
      }),
    });
    expect(response.status).toBe(201);
  });

  it('merges unmapped data into notes', async () => {
    const response = await fetch('/api/contacts/import/csv', {
      method: 'POST',
      body: JSON.stringify({
        contact: {
          firstName: 'John',
          lastName: 'Doe',
          notes: '[Birthday: 1990-01-01] [Labels: friends]',
        },
        skipDuplicates: true,
      }),
    });
    const data = await response.json();
    expect(data.contact.notes).toContain('[Birthday: 1990-01-01]');
  });
});
```

### E2E Tests

```typescript
// tests/import-csv.spec.ts
test('smart import hides empty columns and shows mapped fields', async ({ page }) => {
  await page.goto('/contacts/import');

  // Upload a Google Contacts CSV
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('fixtures/google-contacts-export.csv');

  // Should show summary, not 35 rows
  await expect(page.getByText(/Found \d+ contacts/)).toBeVisible();
  await expect(page.getByText('Confirmed Mappings')).toBeVisible();

  // Empty columns should NOT be visible
  await expect(page.getByText('Phonetic First Name')).not.toBeVisible();
  await expect(page.getByText('Phonetic Last Name')).not.toBeVisible();

  // Extra data section should show unmapped columns with data
  await expect(page.getByText('Extra Data')).toBeVisible();
});
```

---

## 9. Performance Considerations

### CSV Scanning
- Scan ALL rows to identify empty columns (not just first row)
- For very large CSVs (10k+ rows), consider sampling (every 10th row)
- Cache analysis results in component state

### Database
- Add indexes on `firstName`, `lastName`, `primaryEmail` for search performance
- Migration should be done in batches for large datasets

---

## 10. Security Considerations

- No new security concerns - same validation as before
- Ensure Zod validation on all new fields
- Sanitize notes field content (already handled)

---

## 11. Documentation

### Updates Needed
- Update API documentation for new contact fields
- Update import guide with new UX flow
- Add migration notes for existing users

---

## 12. Implementation Phases

### Phase 1: Schema Migration
1. Add new fields to Prisma schema (keep old fields temporarily)
2. Create migration with data transformation
3. Update TypeScript types
4. Update Zod validation schemas
5. Run migration on dev database

### Phase 2: Backend Updates
1. Update enrichment score calculation
2. Update search/filter queries in contacts API
3. Update import API to accept new fields
4. Update export API to output new fields
5. Update chat/AI routes for name concatenation

### Phase 3: Form & Display Updates
1. Update ContactForm with split name/email/phone fields
2. Update ContactDetail display
3. Update ContactsTable display and sorting
4. Update all other components with name display

### Phase 4: Smart Import UI
1. Create `src/lib/csv-analysis.ts` utilities
2. Rewrite import page mapping step
3. Add "Extra Data" section with checkboxes
4. Implement notes merge formatting
5. Update import API call with new data structure

### Phase 5: Cleanup & Polish
1. Remove old `name`, `email`, `phone` fields from schema
2. Final migration
3. E2E testing with real CSV exports
4. Documentation updates

---

## 13. Open Questions

1. **Enrichment scoring**: Should `firstName` + `lastName` combined equal 10 points (same as old `name`), or should each be 5 points?
   - **Recommendation**: Combined = 10 points for backward compatibility

2. **Sort default**: Should contact list default sort be `lastName` or `firstName`?
   - **Recommendation**: `lastName` (more professional/standard)

3. **Display format**: Should name display be "First Last" or "Last, First"?
   - **Recommendation**: "First Last" for display, but sort by lastName

---

## 14. References

- Ideation document: `specs/smart-csv-import-mapping/01-ideation.md`
- Current import page: `src/app/(dashboard)/contacts/import/page.tsx`
- Prisma schema: `prisma/schema.prisma`
- Google Contacts CSV format: Standard export with ~35 columns
