# Emily Feedback Implementation Plan

**Date:** January 2026
**Source:** Slack feedback from Emily (colleague/tester)
**Context:** First real-world usage testing of Better Connections

---

## Overview

Emily tested the VCF import flow, enrichment workflow, and general navigation. This document captures all feedback items, their analysis, and implementation groupings.

---

## Raw Feedback (Numbered for Reference)

1. VCF duplicate handling requires individual decisions - need "skip all" option
2. Same-name contacts should suggest merge with review before committing
3. Need search bar in the 'enrich' section to find specific people
4. Contact detail page needs prominent Edit and Enrich buttons (not buried in dropdown)
5. (implied) Tag editing capability needed
6. After voice enrichment, should be able to edit tags before saving
7. Consider adding "Personal" or "Family" tag category
8. Custom vocabulary/profile for speech recognition (business names, family, colleagues)
9. After save, need "Enrich further" button to continue without navigating away
10. Manual search/link when wrong person is matched from mentions
11. Extract more from voice: DOB, hometown, social handles (IG username lookup)
12. **BUG:** "Show more contacts" button doesn't work; page arrows disappeared
13. Alphabet slider for quick navigation on contacts/enrich pages
14. Hometown suggestion based on phone area code
15. Relationship strength slider needs descriptions (Weak="know through friends" to Strong="can call for anything")
16. **BUG:** Wrong "Scott" selected - not cross-referencing context (email/company)
17. **BUG:** Pagination issues - default 25 too low, doesn't save preference, can't type page number

---

## Spec Groupings

### Spec A: Pagination & Loading Fixes (PRIORITY 1 - BUGS)

**Items:** 12, 17

**Scope:**
- Fix non-functional "Show more contacts" button in enrichment queue
- Investigate/fix disappeared page arrows
- Add direct page number input field
- Change default page size from 25 to 100
- Consider localStorage for pagination preferences

**Key Files:**
- `src/app/(dashboard)/enrichment/page.tsx` (lines 499-505 - button has no handler)
- `src/components/contacts/ContactsTable.tsx` (pagination at lines 687-755)
- `src/app/api/enrichment/queue/route.ts` (may need pagination support)

**Dependencies:** None - can start immediately

---

### Spec B: Enrichment Flow Polish (PRIORITY 2)

**Items:** 3, 4, 6, 9, 15

**Scope:**
- Add search bar to enrichment queue page
- Add prominent Edit + Enrich buttons to ContactDetail (not in dropdown)
- Make tags editable during enrichment session before save
- Add "Continue Enriching" / "Enrich Further" button on completion screen
- Add descriptive labels to relationship strength (slider or dots with tooltips)

**Key Files:**
- `src/app/(dashboard)/enrichment/page.tsx` (queue page - add search)
- `src/components/contacts/ContactDetail.tsx` (line ~50-80 for action buttons)
- `src/app/(dashboard)/enrichment/session/page.tsx` (tag editing, completion flow)
- `src/components/enrichment/completion/CompletionCelebration.tsx` (add continue button)

**Dependencies:** None

**UX Notes:**
- Search in enrich should filter the priority queue, not replace it
- Relationship strength descriptions from Emily: "Weak = know through friends" to "Strong = can call for anything"

---

### Spec C: Mention Matching Improvements (PRIORITY 3)

**Items:** 10, 16 (BUG)

**Scope:**
- Fix "wrong Scott" bug - matching algorithm too naive (first alphabetical)
- Add context scoring: weight matches by email domain, company, expertise overlap
- Add manual "Link to different contact" UI in MentionedPersonCard
- Add search modal for manual linking

**Key Files:**
- `src/app/api/contacts/match-mentions/route.ts` (matching algorithm)
- `src/components/enrichment/completion/MentionedPersonCard.tsx` (add link override)
- `src/components/enrichment/completion/MentionedPeopleSection.tsx` (may need modal)

**Current Algorithm (Problem):**
```
1. EXACT: Full name or first name match → confidence 1.0
2. FUZZY: pg_trgm similarity > 0.3 → confidence = similarity score
3. NONE: No match
```
Issue: First match wins without considering context. If user says "introduced her to Scott from the investment firm", it should weight Scotts who work at investment firms higher.

**Proposed Fix:**
- Extract context from mention (company, role, expertise keywords)
- Score all potential matches, not just first
- Weight by: exact name > fuzzy name > company match > email domain > expertise overlap
- Return top match + alternatives for user confirmation

**Dependencies:** None

---

### Spec D: VCF Import Enhancements (PRIORITY 4)

**Items:** 1, 2

**Scope:**
- Add "Skip all remaining duplicates" checkbox/button to ImportMergeReview
- Add same-name detection (beyond email matching)
- Create merge preview UI for same-name contacts

**Key Files:**
- `src/components/import/ImportMergeReview.tsx` (add bulk skip)
- `src/components/import/VcfImportFlow.tsx` (orchestration)
- `src/app/api/contacts/import/vcf/route.ts` (add name-based duplicate detection)
- NEW: `src/components/import/SameNameMergeReview.tsx` (new component)

**Current Duplicate Detection:**
- Email-based only (case-insensitive Prisma mode)
- No name-based grouping

**Proposed Same-Name Logic:**
1. After email duplicate check, group remaining by normalized name
2. Present groups with 2+ contacts as "potential duplicates"
3. Show side-by-side comparison (emails, phones, companies)
4. User can: merge all, merge selected, or keep separate

**Dependencies:** None, but could build on Spec A patterns

---

### Spec E: Navigation & Discovery (PRIORITY 5)

**Items:** 13, 14, 15 (partial - descriptions only)

**Scope:**
- Add alphabet quick-jump sidebar to contacts list
- Add alphabet quick-jump to enrichment queue
- Add phone area code → hometown suggestion
- (Relationship descriptions covered in Spec B)

**Key Files:**
- `src/components/contacts/ContactsTable.tsx` (add alphabet sidebar)
- `src/app/(dashboard)/enrichment/page.tsx` (add alphabet sidebar)
- NEW: `src/components/ui/AlphabetSlider.tsx` (reusable component)
- NEW: `src/lib/area-codes.ts` (area code → location mapping)

**Area Code Data:**
- Need static mapping or API for US/CA area codes → city/state
- Could use libphonenumber-js for parsing
- Suggestion UX: "Based on area code, hometown might be: New Jersey" with confirm/edit

**Dependencies:** None

---

## Deferred Items (Future Consideration)

### Custom Vocabulary / Personal Profile (Item 8)
**Why deferred:** Novel feature requiring:
- New database model for user vocabulary
- Settings UI for managing terms
- Prompt injection into AI extraction
- Possibly custom speech recognition (beyond Web Speech API)

**When to revisit:** After core enrichment flow is polished

### Instagram Username Lookup (Item 11b)
**Why deferred:** External API integration, unclear value vs. effort

### DOB / Additional Field Extraction (Item 11a)
**Quick win for later:** Just expand the extraction schema in `src/lib/schemas/enrichmentInsight.ts`

### Personal/Family Tag Category (Item 7)
**Why deferred:** Schema change with wide blast radius. Consider whether to add one category or make categories user-configurable.

---

## Implementation Order Rationale

1. **Spec A first** - Bugs blocking basic navigation
2. **Spec C second** - Data quality issue (wrong matches persist in DB)
3. **Spec B third** - Highest UX impact for enrichment workflow
4. **Spec D fourth** - Import is one-time, less urgent
5. **Spec E fifth** - Polish, nice-to-have

---

## Files Reference (Quick Lookup)

| Area | Primary Files |
|------|---------------|
| Enrichment Queue | `src/app/(dashboard)/enrichment/page.tsx` |
| Enrichment Session | `src/app/(dashboard)/enrichment/session/page.tsx` |
| Contact Detail | `src/components/contacts/ContactDetail.tsx` |
| Contacts Table | `src/components/contacts/ContactsTable.tsx` |
| VCF Import | `src/components/import/VcfImportFlow.tsx`, `ImportMergeReview.tsx` |
| Mention Matching | `src/app/api/contacts/match-mentions/route.ts` |
| Mention UI | `src/components/enrichment/completion/MentionedPeopleSection.tsx` |
| Completion | `src/components/enrichment/completion/CompletionCelebration.tsx` |
| Design System | `src/lib/design-system.ts` |

---

## Notes for Future Sessions

- Emily is a real user doing real testing - her feedback reflects actual pain points
- The "Show more contacts" button at line 499-505 literally does nothing - easy fix
- Mention matching uses pg_trgm which is good, but the scoring/selection logic is the problem
- VCF import already handles per-field conflicts well; just needs bulk operations
- Tag categories are hardcoded in design-system.ts - adding one is easy, making configurable is harder
