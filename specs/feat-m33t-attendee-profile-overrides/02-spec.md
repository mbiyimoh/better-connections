# M33T Attendee Profile Overrides — Specification

**Slug:** feat-m33t-attendee-profile-overrides
**Author:** Claude Code
**Date:** 2026-01-17
**Status:** Draft
**Ideation:** [01-ideation.md](./01-ideation.md)

---

## 1. Overview

### 1.1 Problem Statement
Event organizers need the ability to customize how individual attendees appear on their M33T event landing pages without modifying the underlying Better Contacts data. Currently, attendee profiles are populated from contact imports and questionnaire extraction with no way to make event-specific adjustments.

### 1.2 Solution Summary
Add a `profileOverrides` JSON field to the EventAttendee model that stores organizer customizations. At display time, merge overrides with the base profile. Provide a modal UI on the dashboard for editing individual attendee profiles with surgical control over each field.

### 1.3 User Decisions
| Question | Decision |
|----------|----------|
| Field hiding behavior | Hide completely (null = invisible) |
| Expertise editing | Surgical tag removal (granular control) |
| Matching impact | Display only (don't affect matching algorithm) |
| Edit UI location | Modal over dashboard attendee list |
| Public indicator | No visible indicator |

---

## 2. Data Model

### 2.1 Schema Changes

**File:** `prisma/schema.prisma`

Add to EventAttendee model:
```prisma
model EventAttendee {
  // ... existing fields ...

  profile           Json?      // Base profile (from import + extraction)
  profileOverrides  Json?      // Organizer customizations (sparse)
  overridesEditedAt DateTime?  // Last edit timestamp

  // ... rest of fields ...
}
```

### 2.2 ProfileOverrides Schema

**File:** `src/lib/m33t/schemas.ts`

```typescript
import { z } from 'zod';

/**
 * Profile overrides schema - sparse object containing only overridden fields.
 *
 * Semantics:
 * - Field absent: Use base profile value (inherited)
 * - Field = null: Hide this field completely
 * - Field = value: Display this value instead of base
 *
 * For expertise array:
 * - absent: Use base profile expertise
 * - null: Hide expertise section completely
 * - { remove: string[], add: string[] }: Surgical modifications
 * - string[]: Complete replacement (legacy/simple mode)
 */
export const ExpertiseOverrideSchema = z.union([
  z.null(), // Hide completely
  z.array(z.string()), // Complete replacement
  z.object({
    remove: z.array(z.string()).default([]), // Tags to remove from base
    add: z.array(z.string()).default([]),    // Tags to add
  }),
]);

export const ProfileOverridesSchema = z.object({
  role: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  expertise: ExpertiseOverrideSchema.optional(),
  currentFocus: z.string().nullable().optional(),
  // Extensible: add more fields as needed
}).strict();

export type ProfileOverrides = z.infer<typeof ProfileOverridesSchema>;
export type ExpertiseOverride = z.infer<typeof ExpertiseOverrideSchema>;
```

### 2.3 Merge Utility

**File:** `src/lib/m33t/profile-utils.ts`

```typescript
import type { Profile } from './schemas';
import type { ProfileOverrides, ExpertiseOverride } from './schemas';

/**
 * Merges base profile with organizer overrides.
 *
 * Rules:
 * - Override absent → use base value
 * - Override null → hide field (return undefined)
 * - Override value → use override value
 */
export function mergeProfileWithOverrides(
  profile: Profile | null,
  overrides: ProfileOverrides | null
): Profile | null {
  if (!profile) return null;
  if (!overrides) return profile;

  return {
    ...profile,
    role: resolveOverride(profile.role, overrides.role),
    company: resolveOverride(profile.company, overrides.company),
    location: resolveOverride(profile.location, overrides.location),
    expertise: resolveExpertiseOverride(profile.expertise, overrides.expertise),
    currentFocus: resolveOverride(profile.currentFocus, overrides.currentFocus),
  };
}

function resolveOverride<T>(base: T, override: T | null | undefined): T | undefined {
  if (override === undefined) return base; // Not overridden, use base
  if (override === null) return undefined; // Explicitly hidden
  return override; // Use override value
}

function resolveExpertiseOverride(
  base: string[] | undefined,
  override: ExpertiseOverride | undefined
): string[] | undefined {
  if (override === undefined) return base;
  if (override === null) return undefined; // Hide completely
  if (Array.isArray(override)) return override; // Complete replacement

  // Surgical modification
  const baseSet = new Set(base || []);
  override.remove.forEach(tag => baseSet.delete(tag));
  override.add.forEach(tag => baseSet.add(tag));
  return Array.from(baseSet);
}

/**
 * Checks if a profile has any active overrides.
 */
export function hasOverrides(overrides: ProfileOverrides | null): boolean {
  if (!overrides) return false;
  return Object.keys(overrides).length > 0;
}

/**
 * Gets list of overridden field names.
 */
export function getOverriddenFields(overrides: ProfileOverrides | null): string[] {
  if (!overrides) return [];
  return Object.keys(overrides);
}
```

---

## 3. API Design

### 3.1 Get Attendee with Overrides

**Endpoint:** `GET /api/events/{eventId}/attendees/{attendeeId}`

**Response:**
```typescript
interface AttendeeDetailResponse {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  rsvpStatus: RSVPStatus;

  // Profile data
  profile: Profile | null;           // Base profile
  profileOverrides: ProfileOverrides | null;  // Current overrides
  displayProfile: Profile | null;    // Pre-merged for convenience

  // Override metadata
  overridesEditedAt: string | null;
  hasOverrides: boolean;
  overriddenFields: string[];

  // Linked contact (for reference)
  contact: {
    id: string;
    firstName: string;
    lastName: string | null;
    title: string | null;
    company: string | null;
  } | null;
}
```

### 3.2 Update Attendee Overrides

**Endpoint:** `PATCH /api/events/{eventId}/attendees/{attendeeId}`

**Request Body:**
```typescript
interface UpdateAttendeeOverridesBody {
  profileOverrides: ProfileOverrides;
}
```

**Behavior:**
- Validates `profileOverrides` against schema
- Merges with existing overrides (doesn't replace entirely)
- To remove an override, set field to `undefined` explicitly
- Sets `overridesEditedAt` to current timestamp
- Returns updated attendee with merged display profile

**Response:** Same as GET endpoint

### 3.3 Reset All Overrides

**Endpoint:** `DELETE /api/events/{eventId}/attendees/{attendeeId}/overrides`

**Behavior:**
- Sets `profileOverrides` to null
- Sets `overridesEditedAt` to null
- Returns attendee with base profile only

---

## 4. UI Components

### 4.1 Edit Button on Dashboard

**File:** `src/app/(dashboard)/events/[eventId]/page.tsx`

Add edit button to each attendee row:
```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => setEditingAttendee(attendee)}
  className="opacity-0 group-hover:opacity-100 transition-opacity"
>
  <Pencil className="w-4 h-4" />
</Button>
```

### 4.2 AttendeeProfileEditModal

**File:** `src/components/m33t/AttendeeProfileEditModal.tsx`

**Props:**
```typescript
interface AttendeeProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendee: AttendeeDetailResponse;
  onSave: (overrides: ProfileOverrides) => Promise<void>;
}
```

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Edit Attendee Profile                              [×] │
│  {Attendee Name}                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Role                                    [↺ Reset]      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Founder & Investor                              │   │
│  └─────────────────────────────────────────────────┘   │
│  ○ Inherited from profile  ● Customized                │
│                                                         │
│  Company                                 [↺ Reset]      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Acme Ventures                                   │   │
│  └─────────────────────────────────────────────────┘   │
│  ● Inherited from profile  ○ Customized                │
│                                                         │
│  Location                                [↺ Reset]      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Austin, TX                                      │   │
│  └─────────────────────────────────────────────────┘   │
│  ☐ Hide this field                                     │
│                                                         │
│  Expertise Tags                          [↺ Reset]      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [Productivity ×] [Finance ×] [Leadership ×]    │   │
│  │ [+ Add tag]                                     │   │
│  └─────────────────────────────────────────────────┘   │
│  ☐ Hide expertise section                              │
│                                                         │
│  Current Focus                           [↺ Reset]      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Building AI tools for investor relations...    │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│  ☐ Hide this field                                     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                          [Cancel]  [Save Changes]       │
└─────────────────────────────────────────────────────────┘
```

**Component Features:**
1. **Field Status Indicator:** Shows "Inherited" vs "Customized" for each field
2. **Reset Button:** Clears override for individual field (reverts to inherited)
3. **Hide Checkbox:** Sets override to null (hides field on public page)
4. **Expertise Tag Editor:** Add/remove individual tags with chips
5. **Textarea for currentFocus:** Multi-line editable text
6. **Save Button:** Calls PATCH API with accumulated overrides

### 4.3 Override Indicator on Dashboard

Show subtle indicator when attendee has overrides:

```tsx
{attendee.hasOverrides && (
  <Badge variant="outline" className="text-xs text-purple-400 border-purple-400/30">
    Customized
  </Badge>
)}
```

---

## 5. Public Display Integration

### 5.1 Public API Changes

**File:** `src/app/api/public/events/[slug]/route.ts`

Update attendee transformation to merge overrides:

```typescript
import { mergeProfileWithOverrides } from '@/lib/m33t/profile-utils';

// In the attendee transformation loop:
const mergedProfile = mergeProfileWithOverrides(
  attendee.profile as Profile | null,
  attendee.profileOverrides as ProfileOverrides | null
);

// Extract fields from merged profile instead of base profile
const role = mergedProfile?.role;
const company = mergedProfile?.company;
const location = mergedProfile?.location;
const expertise = mergedProfile?.expertise;
const currentFocus = mergedProfile?.currentFocus;
```

### 5.2 No Visual Changes to Public Components

AttendeeCard and ProfileModal continue to work as-is — they receive pre-merged data from the API. No indicator of customization is shown to the public.

---

## 6. Implementation Tasks

### Phase 1: Data Model & Utilities (2-3 hours)
- [ ] Add `profileOverrides`, `overridesEditedAt` to EventAttendee schema
- [ ] Run migration
- [ ] Add `ProfileOverridesSchema` and `ExpertiseOverrideSchema` to schemas.ts
- [ ] Create `src/lib/m33t/profile-utils.ts` with merge utilities
- [ ] Add unit tests for merge logic

### Phase 2: API Endpoints (2-3 hours)
- [ ] Create/update `GET /api/events/{eventId}/attendees/{attendeeId}`
- [ ] Create `PATCH /api/events/{eventId}/attendees/{attendeeId}`
- [ ] Create `DELETE /api/events/{eventId}/attendees/{attendeeId}/overrides`
- [ ] Add validation with Zod schemas
- [ ] Add error handling

### Phase 3: Dashboard Edit UI (3-4 hours)
- [ ] Add edit button to attendee rows on event detail page
- [ ] Create `AttendeeProfileEditModal` component
- [ ] Implement field status indicators (inherited/customized)
- [ ] Implement expertise tag editor with surgical add/remove
- [ ] Implement hide checkbox for each field
- [ ] Implement reset button per field
- [ ] Wire up save functionality

### Phase 4: Public Display Integration (1-2 hours)
- [ ] Update public API to merge overrides
- [ ] Verify AttendeeCard displays correctly with overrides
- [ ] Verify ProfileModal displays correctly with overrides
- [ ] Test hiding fields (null overrides)

### Phase 5: Polish & Edge Cases (1-2 hours)
- [ ] Handle attendees with no profile (import without contact)
- [ ] Preserve overrides during questionnaire re-extraction
- [ ] Add "Customized" badge to dashboard attendee list
- [ ] Add "Reset all overrides" action
- [ ] Manual testing of full flow

---

## 7. Testing Strategy

### 7.1 Unit Tests
- `mergeProfileWithOverrides()` with various override combinations
- `resolveExpertiseOverride()` surgical add/remove logic
- Schema validation for ProfileOverridesSchema

### 7.2 Integration Tests
- PATCH endpoint creates/updates overrides correctly
- GET endpoint returns merged displayProfile
- DELETE endpoint clears overrides
- Public API returns merged data

### 7.3 E2E Tests
- Open edit modal, modify field, save, verify on dashboard
- Hide a field, verify it doesn't appear on public page
- Add/remove expertise tags, verify changes
- Reset individual field, verify reverts to inherited
- Reset all overrides, verify all fields revert

---

## 8. Success Criteria

1. **Organizers can customize any attendee profile field** from the dashboard
2. **Changes only affect the specific event** — other events and Better Contacts data unchanged
3. **Overrides persist** through questionnaire re-extraction
4. **Hidden fields don't appear** on public landing page
5. **Expertise tags can be surgically edited** (add/remove individual tags)
6. **Dashboard shows which attendees have customizations**
7. **No performance regression** on public page load

---

## 9. Future Considerations

- **Bulk editing:** Select multiple attendees and apply same override
- **Override templates:** Save common customizations for reuse
- **Audit history:** Track who changed what and when
- **Preview mode:** See how changes look on public page before saving
- **Attendee self-editing:** Let attendees customize their own profiles (different permissions)
