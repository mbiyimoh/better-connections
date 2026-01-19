# M33T Attendee Profile Overrides

**Slug:** feat-m33t-attendee-profile-overrides
**Author:** Claude Code
**Date:** 2026-01-17
**Branch:** preflight/feat-m33t-attendee-profile-overrides
**Related:** M33T Event System, AttendeeCard, ProfileModal

---

## 1) Intent & Assumptions

**Task brief:** Enable event organizers to directly edit/customize attendee profile fields at the M33T layer without modifying the underlying Better Contacts data. Changes would be event-specific, allowing organizers to hide, reword, or customize how each attendee appears for that particular event (e.g., hiding certain expertise tags, rewording their current focus, etc.).

**Assumptions:**
- Organizers should be able to override any displayable profile field (role, company, location, expertise, currentFocus)
- Overrides are scoped to a single event — the same contact at different events can have different customizations
- The underlying Contact record in Better Contacts remains untouched
- Overrides take precedence over both imported data AND questionnaire-extracted data
- Organizers need visibility into which fields are customized vs inherited

**Out of scope:**
- Bulk editing of multiple attendees at once (could be Phase 2)
- Attendee self-editing of their own profiles (different feature)
- Syncing overrides back to Better Contacts
- Version history / audit trail (could be Phase 2)
- Override templates or presets across events

---

## 2) Pre-reading Log

| File | Takeaway |
|------|----------|
| `prisma/schema.prisma:489-545` | EventAttendee has `profile: Json?` field storing full ProfileSchema, plus denormalized indexed columns for matching |
| `src/lib/m33t/schemas.ts:4-35` | ProfileSchema defines all profile fields: name, role, company, location, expertise[], seekingKeywords[], currentFocus, etc. |
| `src/app/api/events/[eventId]/attendees/import/route.ts:132-166` | Import maps Contact fields to ProfileSchema, sets completeness=0.3 |
| `src/app/(dashboard)/events/[eventId]/page.tsx:340-405` | Dashboard displays attendees with fallback chain: profile → contact |
| `src/app/m33t/[slug]/components/AttendeeCard.tsx` | Public card shows name, title, company, location, expertise (3), currentFocus |
| `src/app/m33t/[slug]/components/ProfileModal.tsx` | Modal shows full details including expertise section, currentFocus, tradingCard data |
| `src/app/api/public/events/[slug]/route.ts:140-226` | Public API extracts profile fields with tradingCard fallback |
| `src/lib/m33t/extraction.ts` | AI extracts profile from questionnaire responses, overwrites profile JSON |

---

## 3) Codebase Map

**Primary components/modules:**
- `prisma/schema.prisma` — EventAttendee model (add `profileOverrides` field)
- `src/app/(dashboard)/events/[eventId]/page.tsx` — Dashboard attendee list (add edit button)
- `src/app/(dashboard)/events/[eventId]/attendees/[attendeeId]/edit/page.tsx` — NEW: Edit page
- `src/app/api/events/[eventId]/attendees/[attendeeId]/route.ts` — PATCH endpoint for overrides
- `src/app/m33t/[slug]/components/AttendeeCard.tsx` — Apply overrides to display
- `src/app/m33t/[slug]/components/ProfileModal.tsx` — Apply overrides to display
- `src/app/api/public/events/[slug]/route.ts` — Merge overrides into public response

**Shared dependencies:**
- `src/lib/m33t/schemas.ts` — ProfileSchema (add ProfileOverridesSchema)
- `src/lib/m33t/types.ts` — Type definitions
- `src/lib/design-system.ts` — Colors for override indicators

**Data flow:**
```
Contact → Import → EventAttendee.profile (base)
                         ↓
Questionnaire → AI Extraction → EventAttendee.profile (enriched)
                         ↓
Organizer Edit → EventAttendee.profileOverrides (overrides)
                         ↓
Display Layer: merge(profile, profileOverrides) → AttendeeCard/ProfileModal
```

**Feature flags/config:** None currently

**Potential blast radius:**
- Dashboard event detail page (attendee list)
- Public landing page (AttendeeCard, ProfileModal)
- Public API response transformation
- Matching algorithm (if keywords are overridden — need to consider)

---

## 4) Root Cause Analysis

N/A — This is a new feature, not a bug fix.

---

## 5) Research

### Potential Solutions

#### Option A: Merge overrides into `profile` field
- **Approach:** When organizer edits, merge changes directly into `profile` JSON
- **Pros:** Simple query, no merge logic needed at display time
- **Cons:**
  - Loses track of what was customized vs inherited
  - Questionnaire re-extraction would wipe overrides
  - Can't "reset to original" easily
  - No visibility into customizations

#### Option B: Separate `profileOverrides` JSON field (RECOMMENDED)
- **Approach:** Add new `profileOverrides: Json?` field, merge at display time
- **Pros:**
  - Clear separation of base data vs customizations
  - Can track which fields are overridden
  - Easy "reset" by setting field to null
  - Questionnaire extraction doesn't affect overrides
  - Can show inherited vs customized in UI
- **Cons:**
  - Requires merge logic at query/display time
  - Slightly more complex data model

#### Option C: Per-field override columns
- **Approach:** Add `roleOverride`, `companyOverride`, etc. as separate columns
- **Pros:** Type-safe, queryable
- **Cons:**
  - Schema bloat (10+ new columns)
  - Inflexible if new fields added
  - Migration overhead

### Recommendation: Option B — Separate `profileOverrides` Field

**Data Model:**
```prisma
model EventAttendee {
  // ... existing fields ...

  profile           Json?     // Base profile (from import + extraction)
  profileOverrides  Json?     // Organizer customizations (partial, sparse)
  overridesEditedAt DateTime? // When last edited

  // ... rest of fields ...
}
```

**Override Schema (sparse — only overridden fields present):**
```typescript
// Only include fields that are being overridden
interface ProfileOverrides {
  role?: string | null;           // null = hidden, string = replacement
  company?: string | null;
  location?: string | null;
  expertise?: string[] | null;    // null = hidden, array = replacement
  currentFocus?: string | null;
  // Can expand to include more fields as needed
}
```

**Merge Strategy:**
```typescript
function getDisplayProfile(profile: Profile | null, overrides: ProfileOverrides | null): DisplayProfile {
  if (!profile) return null;
  if (!overrides) return profile;

  return {
    ...profile,
    // Override wins if present (even if null — null means "hide this field")
    role: overrides.role !== undefined ? overrides.role : profile.role,
    company: overrides.company !== undefined ? overrides.company : profile.company,
    location: overrides.location !== undefined ? overrides.location : profile.location,
    expertise: overrides.expertise !== undefined ? overrides.expertise : profile.expertise,
    currentFocus: overrides.currentFocus !== undefined ? overrides.currentFocus : profile.currentFocus,
  };
}
```

**UI Pattern:**
- Edit button on each attendee row in dashboard
- Modal or page with form showing current values
- Each field shows:
  - Current effective value (editable)
  - "Inherited from profile" indicator if not overridden
  - "Customized" badge + reset button if overridden
- Save button → PATCH `/api/events/{eventId}/attendees/{attendeeId}`

**API Design:**
```typescript
// PATCH /api/events/{eventId}/attendees/{attendeeId}
interface UpdateAttendeeBody {
  profileOverrides: ProfileOverrides;
}

// Response includes merged display data
interface UpdateAttendeeResponse {
  id: string;
  profile: Profile;
  profileOverrides: ProfileOverrides;
  displayProfile: DisplayProfile; // Pre-merged for convenience
}
```

---

## 6) Clarification

The following decisions would be helpful for the user to clarify:

1. **Field hiding behavior:** When an organizer sets a field to `null` in overrides, should it:
   - A) Hide the field completely from display (don't show at all)
   - B) Show as empty/blank
   - C) Not allow null — only replacement values allowed

2. **Expertise tag granularity:** For expertise overrides, should organizers be able to:
   - A) Replace the entire array (all or nothing)
   - B) Remove individual tags while keeping others (surgical edits)
   - C) Both — toggle between modes

3. **Matching algorithm impact:** If expertise/keywords are overridden, should this:
   - A) Only affect display (matching uses original profile data)
   - B) Affect both display AND matching (override propagates to indexed columns)
   - Recommendation: Option A (display only) to avoid unintended matching consequences

4. **Edit access location:** Where should the edit UI live?
   - A) Inline edit on dashboard attendee list (quick edits)
   - B) Separate edit page (`/events/{id}/attendees/{id}/edit`)
   - C) Modal over the attendee list
   - D) Edit button on public ProfileModal (for organizers only)

5. **Bulk operations (future):** Should we design the data model to support future bulk override operations?
   - A) Yes — ensure API supports batch updates
   - B) No — keep it simple for now, refactor later if needed

6. **Visual indicator on public page:** Should attendees with customizations show any indicator?
   - A) No — customizations are invisible to attendees
   - B) Yes — subtle "curated profile" badge (builds trust)

---

## 7) Implementation Phases (Proposed)

### Phase 1: Data Model & API (Foundation)
- Add `profileOverrides` and `overridesEditedAt` to EventAttendee schema
- Create migration
- Add ProfileOverridesSchema to schemas.ts
- Create utility function `mergeProfileWithOverrides()`
- Create PATCH endpoint for attendee overrides

### Phase 2: Dashboard Edit UI
- Add edit button to attendee rows on event detail page
- Create AttendeeProfileEditModal component
- Form with fields showing inherited vs overridden state
- Reset button for individual fields
- Save functionality calling PATCH endpoint

### Phase 3: Public Display Integration
- Update public API to merge overrides before response
- Update AttendeeCard to use merged profile
- Update ProfileModal to use merged profile
- No visual indicator of customization (invisible to public)

### Phase 4: Polish & Edge Cases
- Handle questionnaire re-extraction (preserve overrides)
- Handle contact re-import (preserve overrides)
- Add "Reset all overrides" action
- Consider adding override timestamp display

---

## 8) Open Questions for Spec Phase

1. Should there be role-based permissions for who can edit attendee profiles?
2. Should we add a "preview" mode to see how changes look on public page?
3. Should we track which user made override changes (audit)?
4. How should we handle the case where an attendee hasn't been imported yet (manual add)?
