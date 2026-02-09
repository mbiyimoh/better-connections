# Contact Detail: Show All Fields + Inline Editing

**Slug:** contact-detail-inline-editing
**Author:** Claude Code
**Date:** 2026-02-05
**Branch:** preflight/contact-detail-inline-editing
**Related:** `src/components/contacts/ContactDetail.tsx`, `src/components/contacts/ContactForm.tsx`

---

## 1) Intent & Assumptions

- **Task brief:** The contact detail page currently hides many populated fields (notes, expertise, interests, howWeMet, whyNow) behind a separate edit page. Two changes are needed: (1) Show all fields that have content directly on the detail page, and (2) Replace the separate full-page edit form with inline editing for each section on the detail page itself.
- **Assumptions:**
  - The `/contacts/[id]/edit` page and `ContactForm.tsx` will eventually be deprecated for editing existing contacts (but kept for creating new contacts at `/contacts/new`)
  - Inline editing should work section-by-section, not field-by-field (matches how users think about contact data)
  - The existing PUT `/api/contacts/[id]` endpoint already accepts partial updates and recalculates enrichment score — we can reuse it
  - Mobile and desktop must both be supported
  - Score recalculation after inline saves must still trigger the celebration experience when appropriate
- **Out of scope:**
  - Creating new contacts (still uses `/contacts/new` + `ContactForm`)
  - Changing the enrichment score calculation itself
  - Adding new database fields
  - Tag inline editing (already works via `TagsSection`)
  - Bulk import / VCF import flows

## 2) Pre-reading Log

- `src/components/contacts/ContactDetail.tsx` (543 lines): Main detail view. Read-only. Shows: profile header, enrichment score, action buttons, tags, whyNow (only if populated), contact info (email/phone/location/social — only if populated), relationship section, and additional info (expertise/interests/notes — only if ANY of the three populated). "Edit" is a dropdown menu item linking to `/contacts/[id]/edit`.
- `src/components/contacts/ContactForm.tsx` (760 lines): Full-page edit form with React Hook Form + Zod. Sections: Basic Info (11 fields in 2-col grid), Relationship (howWeMet + strength), Why Now, Tags, Additional Info (expertise/interests/notes). Sticky submit bar.
- `src/components/contacts/EnrichmentScoreCard.tsx`: Shows enrichment score circle + ranking badge + "Improve your score" suggestions that link to `/contacts/[id]/edit?focus=fieldName`. Will need to update these links to trigger inline edit mode instead.
- `src/components/contacts/TagsSection.tsx`: Already has inline editing for tags (add via AI suggestions, add manually). Good reference pattern for section-level inline editing.
- `src/app/(dashboard)/contacts/[id]/edit/page.tsx`: Server component that fetches contact and passes to `ContactForm`. Simple wrapper.
- `src/app/api/contacts/[id]/route.ts`: PUT endpoint accepts partial updates, normalizes phones, recalculates enrichment score, handles tags. Returns updated contact.
- `src/lib/enrichment.ts`: `calculateEnrichmentScore(contact, tagCount)` — called by API on every save.
- `src/lib/validations/contact.ts`: `contactUpdateSchema` = partial version of create schema. All fields optional.
- `src/types/contact.ts`: Contact interface with all 30+ fields.
- `prisma/schema.prisma`: Contact model — 37 fields total.

## 3) Codebase Map

### Primary components/modules
| File | Role |
|------|------|
| `src/components/contacts/ContactDetail.tsx` | Main detail view — **primary file to modify** |
| `src/components/contacts/ContactForm.tsx` | Full-page edit form — **reference for field config, will keep for /new** |
| `src/components/contacts/EnrichmentScoreCard.tsx` | Score display + "improve" suggestions |
| `src/components/contacts/TagsSection.tsx` | Tag management (already inline) |
| `src/app/api/contacts/[id]/route.ts` | PUT endpoint (handles partial updates) |

### Shared dependencies
- **Form:** `react-hook-form`, `@hookform/resolvers/zod`, `zod`
- **UI:** `@/components/ui/*` (shadcn: Input, Textarea, Button, Select, Label, Tooltip)
- **Animation:** `framer-motion` (AnimatePresence, motion)
- **Icons:** `lucide-react`
- **Phone formatting:** `@/lib/phone` → `formatPhoneForDisplay()`
- **Design system:** `@/lib/design-system` → `TAG_CATEGORY_COLORS`
- **Validation:** `@/lib/validations/contact` → `contactUpdateSchema`
- **Types:** `@/types/contact` → `Contact`, `TagCategory`, `getDisplayName`, `getInitials`, `getAvatarColor`

### Data flow
```
ContactDetail.tsx (read-only display)
  → User clicks "Edit" on a section
  → Section switches to edit mode (React Hook Form for that section)
  → User edits fields, clicks "Save"
  → PUT /api/contacts/[id] with changed fields
  → Server validates, normalizes phones, recalculates score
  → Response returns updated contact
  → Client updates local state + router.refresh()
  → If score improved → celebration animation
```

### Potential blast radius
- **ContactDetail.tsx** — major rewrite (add edit state per section, inline forms)
- **EnrichmentScoreCard.tsx** — update "Improve your score" links to trigger inline edit mode instead of navigating to edit page
- **ContactForm.tsx** — no changes (kept for /contacts/new), but could extract shared field config
- **API route** — no changes needed (already supports partial updates)

## 4) Root Cause Analysis

N/A — this is a feature enhancement, not a bug fix.

## 5) Research

### Potential Solutions

#### Solution A: Section-Level Inline Editing with Edit Icons

Each section on the detail page gets a small edit icon (pencil) in the section header. Clicking it transitions that section from read-only display to an inline form with Save/Cancel buttons.

**Pros:**
- Matches mental model (edit "Contact Info" as a group, not individual fields)
- Cross-field validation works naturally within a section
- Clear save/cancel affordance — no ambiguity about when changes are committed
- Compatible with enrichment score recalculation (one save = one score update)
- Similar to HubSpot, Salesforce contact views

**Cons:**
- More complex state management (which section is editing?)
- Section transitions need careful animation to avoid layout jank
- Need to handle "what if user is editing section A and clicks edit on section B?"

#### Solution B: Field-Level Click-to-Edit

Each individual field is clickable. Clicking swaps the text display for an input. Pressing Enter or clicking away saves. Escape cancels.

**Pros:**
- Fastest editing for single-field changes
- Feels very direct and modern (Notion-like)
- Simpler per-field implementation

**Cons:**
- Hard to coordinate multi-field saves (e.g., editing title AND company)
- Many API calls for rapid edits (one per field)
- Enrichment score recalculates on every field save — excessive
- Validation harder for cross-field rules
- Overwhelming edit affordance if every field has a click target
- Phone number formatting on blur is awkward with field-level

#### Solution C: Hybrid — Sections for Groups, Inline for Simple Fields

Group-edit for structured sections (Contact Info, Relationship, Additional Info), but direct click-to-edit for standalone fields like whyNow and notes.

**Pros:**
- Best of both worlds — complex sections edited together, simple fields edited fast
- WhyNow and notes are natural click-to-edit candidates (single field, textarea)
- Reduces number of section transitions

**Cons:**
- Inconsistent UX (two different editing paradigms on one page)
- Users may not understand which fields are click-to-edit vs section-edit
- More complex to implement and maintain

#### Solution D: Slide-in Panel / Sheet

Keep the detail page read-only but replace the full-page navigate with a slide-in sheet/drawer for editing sections.

**Pros:**
- No layout reflow on the detail page
- User sees context while editing
- Clean separation of read vs write

**Cons:**
- Doesn't satisfy requirement #1 (show all populated fields inline)
- Still feels like a modal/separate editing experience
- Doesn't match the "inline" intent of the request

### Recommendation

**Solution A: Section-Level Inline Editing** is the strongest choice. It provides a clean, predictable editing experience that works well with the existing API (one PUT per section save), keeps enrichment score recalculation efficient, and maps naturally to how the detail page is already organized.

Key implementation details:
- **One section editable at a time** — clicking edit on section B while section A is dirty prompts "Save or discard changes?"
- **Pessimistic saves** — wait for server response before showing updated values (ensures correct enrichment score)
- **Framer Motion `layout` animations** — smooth transitions between read/edit modes as sections expand/contract
- **Escape to cancel, Enter to save** (for single-line inputs; Textarea uses Ctrl+Enter)
- **Edit icon visibility** — show pencil icon on section header hover (desktop) or always visible (mobile)

## 6) Clarification — Decisions

1. **Empty fields:** Show clickable placeholders ("Add a note...", "Add expertise...", etc.) that trigger edit mode when clicked. All sections always visible.

2. **Profile header:** Yes, inline-editable. Name, title, organizationalTitle, company all editable in place.

3. **Keep `/contacts/[id]/edit`:** Keep as fallback for now. Power users may want "edit all at once" mode.

4. **Hidden fields:** Add ALL hidden database fields to the UI:
   - `twitterUrl`, `githubUrl`, `instagramUrl`, `websiteUrl` → Social Links section
   - `lastContactDate`, `referredBy`, `relationshipHistory` → Add to appropriate sections
   - Create "Additional Info" section at bottom for rarely-used fields

5. **Save behavior:** Independent save per section. One PUT per section save.

6. **Mobile:** Optimize for mobile UX (larger touch targets, appropriate spacing) without changing the fundamental section-based inline editing approach.
