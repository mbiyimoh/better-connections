# Smart CSV Import Mapping

**Slug:** smart-csv-import-mapping
**Author:** Claude Code
**Date:** 2025-12-25
**Branch:** preflight/smart-csv-import-mapping
**Related:** Phase 5 polish, CSV import feature

---

## 1) Intent & Assumptions

**Task brief:** Improve the CSV import UX to eliminate overwhelming field mapping UI. Currently, Google Contacts exports 30+ columns (most empty), forcing users to manually review/map each one. The new flow should: (1) auto-filter columns with no data, (2) smart-map populated columns to system fields, and (3) offer to merge unmapped data into notes.

**Assumptions:**
- Most CSV imports come from Google Contacts, LinkedIn, or similar sources with many empty columns
- Users typically have 3-5 actually populated fields (name, email, company, title, phone)
- The existing `notes` field is suitable for storing extra unmapped data
- LLM search will index notes content, so unmapped data remains discoverable
- Single-row sample data is sufficient to determine if a column has any values (may need to scan more rows)

**Out of scope:**
- Multiple import source templates (Google-specific, LinkedIn-specific)
- Custom field creation for frequently-imported non-standard fields
- Batch validation before import starts
- Import history/undo functionality

---

## 2) Pre-reading Log

- `src/app/(dashboard)/contacts/import/page.tsx`: Current import UI with manual column mapping, auto-detect via keyword matching, shows all columns regardless of data presence
- `src/app/api/contacts/import/csv/route.ts`: API accepts 12 contact fields, validates with Zod, calculates enrichment score
- `prisma/schema.prisma`: Contact model has 12 mappable fields: name, email, title, company, location, phone, linkedinUrl, howWeMet, whyNow, expertise, interests, notes
- `src/lib/enrichment.ts`: Enrichment score calculation based on field completeness

---

## 3) Codebase Map

**Primary components/modules:**
- `src/app/(dashboard)/contacts/import/page.tsx` - Main import wizard UI (435 lines)
- `src/app/api/contacts/import/csv/route.ts` - Single contact import API

**Shared dependencies:**
- `papaparse` - CSV parsing library
- `@/components/ui/select` - Radix Select for field dropdowns
- `@/lib/enrichment` - Score calculation

**Data flow:**
```
CSV File → Papa.parse() → headers[] + rows[][]
  → Auto-mapping (keyword match) → fieldMapping{}
  → User review/adjust → Import loop → API → Prisma
```

**Feature flags/config:** None

**Potential blast radius:**
- Import page UI (major rewrite of mapping step)
- Potentially API if we add bulk import endpoint
- No impact on existing contacts or other features

---

## 4) Root Cause Analysis

**This is a UX improvement, not a bug fix.** However, the root cause of poor UX:

**Problem:** The current implementation shows ALL CSV columns in the mapping UI, regardless of whether they contain data. Google Contacts exports ~35 columns; most users only populate 4-6.

**Evidence from screenshot:**
- 20+ rows visible, scrolling required
- Many show "Sample: (empty)" - zero value to user
- Multiple name-related columns (First Name, Middle Name, Last Name, Phonetic First Name, etc.) all auto-mapped to "Name *"
- User must scroll through irrelevant fields to find the few that matter

**Root cause:** No pre-filtering of empty columns before displaying mapping UI.

---

## 5) Research

### Potential Solutions

**Solution 1: Pre-filter empty columns (client-side)**

Scan all rows after parsing, identify columns where every cell is empty, exclude them from mapping UI.

| Pros | Cons |
|------|------|
| Simple implementation | Large CSVs may be slow to scan |
| No API changes needed | Must handle edge cases (whitespace-only) |
| Immediate UX improvement | Still shows unmappable columns |

**Solution 2: Smart mapping with confidence scoring**

Use fuzzy matching + column data analysis to auto-map with confidence levels. Show "confident" mappings as collapsed/confirmed, "uncertain" mappings for user review.

| Pros | Cons |
|------|------|
| Minimal user interaction | More complex logic |
| Can combine multiple source columns (First + Last → Name) | May make mistakes user has to correct |
| Feels "intelligent" | Harder to test edge cases |

**Solution 3: Two-phase UI (Recommended)**

Phase 1: Show only populated columns that were auto-mapped, with a summary of what will be imported.
Phase 2: Show "extra data" columns that have values but no system field match, with option to append to notes.

| Pros | Cons |
|------|------|
| Clean, minimal UI | Slightly more complex UI state |
| User sees exactly what matters | Need clear "expand to see all" escape hatch |
| Handles the notes-merge elegantly | Two-step confirmation |

**Solution 4: AI-assisted mapping**

Use LLM to analyze column names and sample data to suggest mappings.

| Pros | Cons |
|------|------|
| Most accurate mapping | Adds latency and API cost |
| Could handle any CSV format | Over-engineering for MVP |
| Future-proof | Requires error handling for AI failures |

### Recommendation

**Solution 3 (Two-phase UI)** with elements of Solution 1 (empty column filtering).

Implementation approach:
1. After CSV parse, scan all rows to identify:
   - Empty columns (no data in any row) → hide completely
   - Mapped columns (auto-detected system field match + has data) → show in "Confirmed Mappings"
   - Unmapped columns with data → show in "Extra Data" section

2. UI Flow:
   ```
   Step 1: Upload CSV
   Step 2: Review Smart Mapping
     - "We found X contacts with the following fields:"
     - [Confirmed mappings - collapsible, editable]
     - "These columns have data but don't match our fields:"
     - [Extra data columns with checkboxes to include in Notes]
   Step 3: Import
   ```

3. Name field handling:
   - Detect First Name + Last Name columns → combine into Name
   - If "Name" or "Full Name" exists, prefer that
   - Show preview of combined name in mapping UI

---

## 6) Clarifications (RESOLVED)

| Question | Decision |
|----------|----------|
| Name fields | **Add firstName + lastName to schema** (separate fields) |
| Extra data format | **Option A:** `[Birthday: 1985-03-15] [Labels: myContacts]` |
| "Has data" threshold | **At least 1 row** with non-empty value |
| Empty columns | **Hide permanently** - no escape hatch, they're useless |
| Multiple email/phone | **Add primary + secondary fields** to schema, extras go to notes |

### Required Schema Changes

```prisma
model Contact {
  // Name fields (replacing single 'name')
  firstName             String
  lastName              String?

  // Email fields (replacing single 'email')
  primaryEmail          String?
  secondaryEmail        String?

  // Phone fields (replacing single 'phone')
  primaryPhone          String?
  secondaryPhone        String?

  // ... rest unchanged
}
```

**Migration notes:**
- Existing `name` field → parse into firstName/lastName (or keep as firstName)
- Existing `email` field → becomes primaryEmail
- Existing `phone` field → becomes primaryPhone

---

## 7) Technical Implementation Notes

### Key Changes Required

**1. Add column analysis function:**
```typescript
type ColumnAnalysis = {
  index: number;
  header: string;
  hasData: boolean;          // at least one row has value
  dataCount: number;         // rows with data
  sampleValue: string;       // first non-empty value
  suggestedMapping: string | null;  // auto-detected system field
  confidence: 'high' | 'medium' | 'low';
};

function analyzeColumns(headers: string[], rows: string[][]): ColumnAnalysis[]
```

**2. Improve auto-mapping logic:**
- Handle compound fields (First Name + Last Name → name)
- Recognize common aliases (Organization → company, Mobile → phone)
- Return confidence level for each mapping

**3. New UI components:**
- `ConfirmedMappingsCard` - shows auto-mapped fields, expandable to edit
- `ExtraDataCard` - shows unmapped columns with data, checkbox to include in notes
- `ImportSummary` - "Importing X contacts with: Name, Email, Company..."

**4. Notes merge logic:**
- Format unmapped data as labeled entries
- Prepend to any existing notes content from CSV
- Make format configurable or use sensible default

### Files to Modify

1. `src/app/(dashboard)/contacts/import/page.tsx` - Major rewrite of mapping step
2. `src/app/api/contacts/import/csv/route.ts` - May need to accept notes merge data
3. New: `src/lib/csv-analysis.ts` - Column analysis utilities

---

## 8) Estimated Complexity

| Component | Effort |
|-----------|--------|
| Column analysis logic | Medium |
| Name combination logic | Low |
| New mapping UI | Medium-High |
| Notes merge formatting | Low |
| Testing with various CSV formats | Medium |

**Total: Medium complexity feature**

The core logic is straightforward, but the UI needs careful design to feel intuitive and not hide important options from power users.
