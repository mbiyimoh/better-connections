# Colleague Feedback Round 2 - January 2026

**Slug:** colleague-feedback-round-2
**Author:** Claude Code
**Date:** 2026-01-08
**Branch:** preflight/colleague-feedback-round-2
**Related:** specs/emily-feedback-jan-2026/, specs/onboarding-story-slides/spec.md

---

## 1) Intent & Assumptions

**Task brief:** Address 5 pieces of colleague feedback:
1. **Onboarding slides** - Auto-advance is too fast for first-time viewers; needs click-to-advance with visual progress indicator
2. **Filters button bug** - "Something went wrong" popup when clicking Filters in top navigation bar
3. **Tag categorization** - "Interest in fintech, SaaS and AI" being tagged as EXPERTISE (purple) instead of INTEREST (amber)
4. **Tag editing** - Need ability to edit tag text directly before adding after enrichment
5. **Bulk duplicate management** - Need "replace all", "skip all", "merge all" options for imports, plus ability to delete all contacts

**Assumptions:**
- Colleague is testing on desktop (mentions "top navigation bar" which is the ContactsTable filter bar)
- "Interest in X" phrasing is ambiguous - user means personal passion, but AI interprets as professional expertise
- Existing bulk delete API exists (`/api/contacts/bulk`) but bulk duplicate actions need UI
- VCF import flow already has per-contact merge review; needs bulk action shortcuts

**Out of scope:**
- Mobile-specific filter drawer (FilterDrawer component exists but is unused)
- OAuth import flows (Google, LinkedIn)
- New tag categories (e.g., "Personal" category suggestion from previous feedback)
- Custom vocabulary/speech recognition improvements

---

## 2) Pre-reading Log

- `specs/emily-feedback-jan-2026/PLANNING.md`: Previous feedback batch with similar items - established pattern for organizing specs by theme
- `specs/onboarding-story-slides/spec.md`: Original design decision "No skip button. It's only ~36 seconds" - needs reconsideration based on user feedback
- `specs/vcf-import-icloud-contacts/02-specification.md`: Current duplicate handling with per-field conflict resolution, auto-merge fields pattern
- `CLAUDE.md`: Design system reference - TAG_CATEGORY_COLORS defined in `src/lib/design-system.ts`
- `src/lib/openai.ts:55-63`: TAG_SUGGESTION_SYSTEM_PROMPT defines categories but description for INTEREST ("personal hobbies, passions") doesn't match user expectation

---

## 3) Codebase Map

### Primary Components/Modules

| Component | Path | Role |
|-----------|------|------|
| StoryOnboarding | `src/components/onboarding/StoryOnboarding.tsx` | Auto-advance timer (lines 25-44), tap navigation |
| StoryProgressBar | `src/components/onboarding/StoryProgressBar.tsx` | 6-segment progress bar |
| ContactsTable | `src/components/contacts/ContactsTable.tsx` | Filter Popover (lines 374-487), Select components |
| BubbleTagSuggestions | `src/components/enrichment/completion/BubbleTagSuggestions.tsx` | Tag selection after enrichment |
| ImportMergeReview | `src/components/import/ImportMergeReview.tsx` | Per-contact duplicate resolution |
| VcfImportFlow | `src/components/import/VcfImportFlow.tsx` | Import orchestration |
| MobileErrorBoundary | `src/components/layout/MobileErrorBoundary.tsx` | "Something went wrong" UI |

### Shared Dependencies

- **Design System**: `src/lib/design-system.ts` - TAG_CATEGORY_COLORS, BRAND_GOLD
- **AI Prompts**: `src/lib/openai.ts` - TAG_SUGGESTION_SYSTEM_PROMPT, ENRICHMENT_EXTRACTION_SYSTEM_PROMPT
- **Schemas**: `src/lib/schemas/enrichmentInsight.ts` - Category definitions for extraction
- **UI Components**: shadcn/ui Select, Popover, Sheet

### Data Flow

1. **Onboarding**: Page load → StoryOnboarding → setInterval (100ms, +1.5% progress) → auto-advance slides
2. **Filters**: URL params → fetchContacts → Popover → Select onValueChange → updateParams → refetch
3. **Tag Extraction**: Voice transcript → GPT-4o-mini → enrichmentInsightSchema → BubbleTagSuggestions
4. **Duplicate Import**: VCF file → parse → detect duplicates → ImportMergeReview → commit

### Potential Blast Radius

1. **Onboarding change**: Low risk - isolated component, no data dependencies
2. **Filters bug fix**: Low risk - contained in ContactsTable
3. **Tag categorization**: Medium risk - prompt changes affect all tag suggestions
4. **Tag editing**: Low risk - additive UI feature
5. **Bulk duplicate actions**: Medium risk - new import flow paths, API changes

---

## 4) Root Cause Analysis

### Issue 1: Onboarding Too Fast

**Not a bug** - design decision from original spec: "No skip button. It's only ~36 seconds and sets critical context."

**User feedback**: First-time viewers need time to read and absorb; auto-advance doesn't let them control pace.

**Resolution**: Convert from auto-advance to click-to-advance with clear progress indicator.

---

### Issue 2: Filters Button Bug

**Repro steps:**
1. Navigate to /contacts
2. Click "Filters" button in search bar area
3. Observe "Something went wrong" popup

**Observed vs Expected:**
- Observed: MobileErrorBoundary catches error, shows fallback UI
- Expected: Filter Popover opens with Source, Relationship, Category, Score filters

**Hypothesis 1 - Radix Select with empty string value** (High confidence):
The ContactsTable uses `<SelectItem value="">All sources</SelectItem>` which may cause issues with Radix UI Select. Radix Select doesn't allow empty string as a valid value - it treats empty string as "no selection".

**Evidence** (ContactsTable.tsx lines 408-414):
```tsx
<SelectContent className="bg-bg-secondary border-border">
  <SelectItem value="">All sources</SelectItem>  // ← Empty string problematic
  {sources.map((source) => (
    <SelectItem key={source} value={source}>
      {source}
    </SelectItem>
  ))}
</SelectContent>
```

**Hypothesis 2 - Popover portal rendering** (Low confidence):
The Popover may be rendering into a portal that doesn't have the expected context.

**Decision**: Most likely Hypothesis 1. Empty string values in Radix Select are known to cause issues. Fix by using a sentinel value like `"all"` or `"__all__"` instead of empty string.

---

### Issue 3: Tag Categorization

**Observed**: User says "interest in fintech, SaaS and AI" → tagged as EXPERTISE (purple)

**Expected**: User intended INTEREST category (amber)

**Root Cause** (AI prompt ambiguity):
The TAG_SUGGESTION_SYSTEM_PROMPT (`src/lib/openai.ts:57-60`) defines:
- `EXPERTISE: Their skills (e.g., "marketing expert", "engineering leader")`
- `INTEREST: Personal interests (e.g., "hiking", "board games")`

The phrase "interest in fintech" uses the word "interest" but describes a **professional domain interest**, which the AI correctly interprets as expertise. The user's mental model differs from the system's categories.

**Resolution Options**:
1. **Better prompt guidance**: Add examples clarifying "interest IN [topic]" vs "interested IN [hobby]"
2. **Category clarification**: Change INTEREST to "PERSONAL" to make it clearer
3. **User education**: Explain categories in the UI

---

### Issue 4: Tag Editing (Feature Request)

**Current behavior**: BubbleTagSuggestions shows checkboxes to select/deselect tags, but no way to edit the text before adding.

**User need**: Sometimes AI gets the wording slightly wrong; user wants to fix it before committing.

---

### Issue 5: Bulk Duplicate Management (Feature Request)

**Current behavior**: ImportMergeReview requires per-contact decisions, with "Skip this contact" and "Accept All Defaults" options.

**User need**:
- "Skip All" remaining duplicates
- "Merge All" (use smart merge for all)
- "Replace All" (use incoming values for all)
- Delete all contacts and start fresh

**Note**: Existing `handleSkipAllRemaining()` function may exist from previous feedback (Emily Spec D), needs verification and expansion.

---

## 5) Research

### Potential Solutions

#### 1. Onboarding Click-to-Advance

**Option A: Pure click navigation (no timer)**
- Pros: Full user control, cleaner code, no accessibility concerns with auto-advance
- Cons: Users might not realize they need to click

**Option B: Click + optional "play" mode**
- Pros: Flexibility for both preferences
- Cons: More complex, two interaction modes

**Option C: Click required with visual prompt**
- Pros: Clear affordance, maintains engagement
- Cons: Needs visual design work

**Recommendation**: Option A with clear visual affordance (arrow icon, progress dots, subtle instruction). Instagram stories also allow tap-to-advance; it's a familiar pattern.

#### 2. Filters Bug Fix

**Option A: Replace empty string with sentinel value**
- Change `<SelectItem value="">All sources</SelectItem>` to `<SelectItem value="all">All sources</SelectItem>`
- Update filter logic to treat "all" as no filter
- Pros: Simple, follows Radix UI best practices
- Cons: Need to update multiple filters

**Option B: Use undefined/controlled state**
- Use `value={sourceFilter || undefined}` and `onValueChange={(v) => updateParams({ source: v === 'all' ? null : v })}`
- Pros: Cleaner state management
- Cons: More complex logic

**Recommendation**: Option A - straightforward fix with minimal changes.

#### 3. Tag Categorization

**Option A: Enhanced prompt with disambiguation**
```
- INTEREST: Personal hobbies and passions OUTSIDE of work (e.g., "hiking", "board games", "wine collecting")
  NOTE: "Interest in [professional topic]" should be EXPERTISE, not INTEREST
- EXPERTISE: Professional skills, domain knowledge, and professional interests (e.g., "fintech expert", "interested in AI", "SaaS background")
```
- Pros: Direct fix, low risk
- Cons: Prompt engineering can be fragile

**Option B: Rename INTEREST to PERSONAL**
- Pros: Clearer mental model
- Cons: Breaking change for existing tags, UI updates needed

**Option C: Add user-facing category selector**
- After AI suggests, let user change category
- Pros: User has final say
- Cons: More UI complexity

**Recommendation**: Option A first (prompt improvement) + Option C later (category selector in tag editing). Combined with Issue 4's tag editing, users can override AI decisions.

#### 4. Tag Editing

**Option A: Inline edit mode**
- Click edit icon on tag → text becomes editable input → save/cancel
- Pros: Familiar pattern, minimal UI change
- Cons: Need to manage edit state per tag

**Option B: Edit modal**
- Click tag → modal with text field + category selector
- Pros: More room for features, can change category too
- Cons: More friction, interrupts flow

**Option C: Editable chips**
- Tags are always editable (contentEditable or input styled as chip)
- Pros: Direct manipulation, fast
- Cons: Can feel janky, harder to implement well

**Recommendation**: Option A (inline edit) with ability to change category. Show edit icon on hover, click to enter edit mode.

#### 5. Bulk Duplicate Management

**Option A: Action bar with bulk actions**
- Add header bar: "12 duplicates found | [Skip All] [Merge All] [Replace All]"
- Pros: Clear, fast for large imports
- Cons: "Replace All" might be destructive without review

**Option B: Default action selector + "Apply to All"**
- Dropdown to set default action, button to apply
- Pros: More control over default behavior
- Cons: Extra step

**Option C: Smart defaults with confirmation**
- Analyze conflicts, suggest "smart merge" for all, show preview
- Pros: Intelligent, less decision fatigue
- Cons: More complex implementation

**Recommendation**: Option A with confirmation dialogs for destructive actions. Also add "Delete All Contacts" option in Settings or a visible "Start Fresh" button.

---

## 6) Clarification

The following decisions would benefit from user input:

1. **Onboarding progress indicator style**:
   - Current: Instagram-style segmented progress bar at top
   - Options: Keep segmented bar + add dots below content? Add "Tap to continue" text? Use arrow icons?
   >> I'm thinking more of a (1 of 4) (2 of 4) or even just dots where the one representing the current slide lights up or something so the user taps to advance but can see how many slides there are at any point in time

2. **"Replace All" behavior for duplicates**:
   - Should "Replace All" overwrite ALL fields from incoming, or only non-empty incoming fields?
   - Should it require confirmation? ("This will update 47 contacts. Continue?")
   >> it would be great if it could give the user that option (overwrite everything vs just empty fields)

3. **"Delete All Contacts" location**:
   - Add to Settings page under "Data Management"?
   - Add to Import page as "Start Fresh" option?
   - Require typing "DELETE" to confirm?
   >> all 3 of those things would be good

4. **Tag editing scope**:
   - Just edit text, or also allow changing category?
   - Should edited tags show "edited" indicator?
   >> allow for editing text and category. no need to show an indication for edited tags though

5. **Tag categorization - user education**:
   - Add tooltips explaining each category?
   - Show category definitions in the tag suggestion UI?
   >> yes to all

---

## 7) Recommended Implementation Order

1. **Filters Bug** (P0 - blocking) - Quick fix, unblocks basic usage
2. **Onboarding Click-to-Advance** (P1 - UX polish) - Improves first-time experience
3. **Tag Editing** (P1 - UX) - Enables workaround for categorization issues
4. **Tag Categorization Prompt** (P2 - enhancement) - Reduces mis-categorization
5. **Bulk Duplicate Management** (P2 - enhancement) - Power user feature

---

## 8) Proposed Spec Organization

Create individual specs for each item:

```
specs/colleague-feedback-round-2/
├── 01-ideation.md (this file)
├── spec-a-filters-bug-fix.md
├── spec-b-onboarding-click-advance.md
├── spec-c-tag-editing.md
├── spec-d-tag-categorization.md
└── spec-e-bulk-duplicate-actions.md
```

Or combine related items:
- **Spec A**: Filters Bug Fix (single file, ~1hr)
- **Spec B**: Onboarding UX (single file, ~2hrs)
- **Spec C**: Tag Improvements (editing + categorization, ~3hrs)
- **Spec D**: Bulk Import Actions (duplicate management + delete all, ~4hrs)
