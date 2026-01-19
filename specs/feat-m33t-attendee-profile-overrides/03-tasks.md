# Task Breakdown: M33T Attendee Profile Overrides

**Generated:** 2026-01-18
**Source:** specs/feat-m33t-attendee-profile-overrides/02-spec.md
**Feature Slug:** feat-m33t-attendee-profile-overrides
**Last Decompose:** 2026-01-18

---

## Overview

Enable event organizers to customize how individual attendees appear on M33T event landing pages without modifying underlying Better Contacts data. Implements a `profileOverrides` JSON field with merge-at-display logic, dashboard edit modal, and public API integration.

**Total Estimated Effort:** 10-14 hours
**Total Tasks:** 15 tasks across 5 phases

---

## Phase 1: Data Model & Utilities (2-3 hours)

### Task 1.1: Add profileOverrides schema fields to EventAttendee
**Description:** Add `profileOverrides` and `overridesEditedAt` fields to the EventAttendee model in Prisma schema
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** None (foundation task)

**Technical Requirements:**
- Add two new fields to EventAttendee model in `prisma/schema.prisma`
- `profileOverrides` stores sparse JSON with only overridden fields
- `overridesEditedAt` tracks when overrides were last modified

**Implementation:**
```prisma
// Add to prisma/schema.prisma EventAttendee model (around line 513)

model EventAttendee {
  // ... existing fields ...

  // Extracted Profile (inline JSON instead of separate model)
  profile            Json?      // See ProfileSchema
  profileExtractedAt DateTime?

  // NEW: Organizer profile customizations
  profileOverrides   Json?      // Sparse overrides (see ProfileOverridesSchema)
  overridesEditedAt  DateTime?  // Last override edit timestamp

  // ... rest of fields ...
}
```

**Acceptance Criteria:**
- [ ] `profileOverrides` field added to EventAttendee model
- [ ] `overridesEditedAt` field added to EventAttendee model
- [ ] Migration runs successfully without data loss
- [ ] Existing attendee records unaffected (fields default to null)

---

### Task 1.2: Run Prisma migration
**Description:** Generate and apply Prisma migration for the new schema fields
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.1
**Can run parallel with:** None

**Implementation Steps:**
1. Generate migration:
   ```bash
   npx prisma migrate dev --name add-attendee-profile-overrides
   ```
2. Verify migration SQL is correct (should be ALTER TABLE ADD COLUMN)
3. Ensure no data loss warnings
4. Regenerate Prisma client:
   ```bash
   npx prisma generate
   ```

**Acceptance Criteria:**
- [ ] Migration file created in `prisma/migrations/`
- [ ] Migration applies cleanly to database
- [ ] Prisma client regenerated with new types
- [ ] `EventAttendee` TypeScript type includes `profileOverrides` and `overridesEditedAt`

---

### Task 1.3: Add ProfileOverridesSchema and ExpertiseOverrideSchema to schemas.ts
**Description:** Create Zod schemas for validating profile overrides with surgical expertise editing support
**Size:** Medium
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 1.1, Task 1.2

**File:** `src/lib/m33t/schemas.ts`

**Implementation:**
```typescript
// Add to src/lib/m33t/schemas.ts after existing schemas

// ========== PROFILE OVERRIDES SCHEMA ==========

/**
 * Expertise override schema - supports multiple modes:
 * - null: Hide expertise section completely
 * - string[]: Complete replacement of expertise array
 * - { remove: string[], add: string[] }: Surgical modifications
 */
export const ExpertiseOverrideSchema = z.union([
  z.null(), // Hide completely
  z.array(z.string()), // Complete replacement
  z.object({
    remove: z.array(z.string()).default([]), // Tags to remove from base
    add: z.array(z.string()).default([]),    // Tags to add
  }),
]);

/**
 * Profile overrides schema - sparse object containing only overridden fields.
 *
 * Semantics:
 * - Field absent: Use base profile value (inherited)
 * - Field = null: Hide this field completely
 * - Field = value: Display this value instead of base
 */
export const ProfileOverridesSchema = z.object({
  role: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  expertise: ExpertiseOverrideSchema.optional(),
  currentFocus: z.string().nullable().optional(),
}).strict();

export type ProfileOverrides = z.infer<typeof ProfileOverridesSchema>;
export type ExpertiseOverride = z.infer<typeof ExpertiseOverrideSchema>;
```

**Key Design Decisions:**
- `.strict()` on ProfileOverridesSchema prevents unknown fields
- Expertise supports 3 modes: null (hide), array (replace), object (surgical)
- All fields use `.nullable().optional()` pattern for sparse storage

**Acceptance Criteria:**
- [ ] `ExpertiseOverrideSchema` validates all three expertise modes
- [ ] `ProfileOverridesSchema` validates sparse override objects
- [ ] TypeScript types exported for use in other modules
- [ ] Schema rejects unknown fields (strict mode)

---

### Task 1.4: Create profile-utils.ts with merge utilities
**Description:** Create utility functions for merging base profile with overrides and helper functions
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.3
**Can run parallel with:** Task 1.1, Task 1.2

**File:** `src/lib/m33t/profile-utils.ts` (new file)

**Implementation:**
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

/**
 * Resolves a single field override.
 * @returns base value if not overridden, undefined if hidden, override value otherwise
 */
function resolveOverride<T>(base: T, override: T | null | undefined): T | undefined {
  if (override === undefined) return base; // Not overridden, use base
  if (override === null) return undefined; // Explicitly hidden
  return override; // Use override value
}

/**
 * Resolves expertise array override with surgical modification support.
 */
function resolveExpertiseOverride(
  base: string[] | undefined,
  override: ExpertiseOverride | undefined
): string[] | undefined {
  if (override === undefined) return base; // Not overridden
  if (override === null) return undefined; // Hide completely
  if (Array.isArray(override)) return override; // Complete replacement

  // Surgical modification: remove then add
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

/**
 * Creates a clean override object by removing undefined values.
 * Used before saving to database to ensure sparse storage.
 */
export function cleanOverrides(overrides: ProfileOverrides): ProfileOverrides | null {
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }

  return Object.keys(cleaned).length > 0 ? cleaned as ProfileOverrides : null;
}
```

**Acceptance Criteria:**
- [ ] `mergeProfileWithOverrides()` correctly merges all field types
- [ ] Hidden fields (null override) return undefined
- [ ] Surgical expertise modification adds/removes tags correctly
- [ ] `hasOverrides()` returns correct boolean
- [ ] `getOverriddenFields()` returns array of field names
- [ ] `cleanOverrides()` removes undefined values

---

### Task 1.5: Add unit tests for merge logic
**Description:** Create comprehensive unit tests for profile merge utilities
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 1.4
**Can run parallel with:** Phase 2 tasks

**File:** `src/lib/m33t/__tests__/profile-utils.test.ts` (new file)

**Test Cases:**
```typescript
import { describe, it, expect } from 'vitest';
import {
  mergeProfileWithOverrides,
  hasOverrides,
  getOverriddenFields,
  cleanOverrides,
} from '../profile-utils';

describe('mergeProfileWithOverrides', () => {
  const baseProfile = {
    name: 'John Doe',
    role: 'Engineer',
    company: 'Acme Corp',
    location: 'Austin, TX',
    expertise: ['React', 'TypeScript', 'Node.js'],
    currentFocus: 'Building AI tools',
    completeness: 0.8,
  };

  it('returns base profile when no overrides', () => {
    const result = mergeProfileWithOverrides(baseProfile, null);
    expect(result).toEqual(baseProfile);
  });

  it('returns null when base profile is null', () => {
    const result = mergeProfileWithOverrides(null, { role: 'Manager' });
    expect(result).toBeNull();
  });

  it('overrides string field with new value', () => {
    const result = mergeProfileWithOverrides(baseProfile, { role: 'Manager' });
    expect(result?.role).toBe('Manager');
    expect(result?.company).toBe('Acme Corp'); // unchanged
  });

  it('hides field when override is null', () => {
    const result = mergeProfileWithOverrides(baseProfile, { location: null });
    expect(result?.location).toBeUndefined();
  });

  it('replaces expertise array completely', () => {
    const result = mergeProfileWithOverrides(baseProfile, {
      expertise: ['Python', 'ML'],
    });
    expect(result?.expertise).toEqual(['Python', 'ML']);
  });

  it('surgically removes expertise tags', () => {
    const result = mergeProfileWithOverrides(baseProfile, {
      expertise: { remove: ['TypeScript'], add: [] },
    });
    expect(result?.expertise).toEqual(['React', 'Node.js']);
  });

  it('surgically adds expertise tags', () => {
    const result = mergeProfileWithOverrides(baseProfile, {
      expertise: { remove: [], add: ['GraphQL'] },
    });
    expect(result?.expertise).toContain('GraphQL');
    expect(result?.expertise).toHaveLength(4);
  });

  it('surgically adds and removes expertise tags', () => {
    const result = mergeProfileWithOverrides(baseProfile, {
      expertise: { remove: ['TypeScript', 'Node.js'], add: ['Python', 'ML'] },
    });
    expect(result?.expertise).toEqual(['React', 'Python', 'ML']);
  });

  it('hides expertise completely when null', () => {
    const result = mergeProfileWithOverrides(baseProfile, { expertise: null });
    expect(result?.expertise).toBeUndefined();
  });
});

describe('hasOverrides', () => {
  it('returns false for null', () => {
    expect(hasOverrides(null)).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(hasOverrides({})).toBe(false);
  });

  it('returns true when fields present', () => {
    expect(hasOverrides({ role: 'Manager' })).toBe(true);
  });
});

describe('getOverriddenFields', () => {
  it('returns empty array for null', () => {
    expect(getOverriddenFields(null)).toEqual([]);
  });

  it('returns field names', () => {
    expect(getOverriddenFields({ role: 'Manager', company: null })).toEqual([
      'role',
      'company',
    ]);
  });
});

describe('cleanOverrides', () => {
  it('removes undefined values', () => {
    const result = cleanOverrides({ role: 'Manager', company: undefined });
    expect(result).toEqual({ role: 'Manager' });
  });

  it('returns null when all undefined', () => {
    const result = cleanOverrides({ role: undefined, company: undefined });
    expect(result).toBeNull();
  });

  it('preserves null values (for hiding)', () => {
    const result = cleanOverrides({ role: null, company: undefined });
    expect(result).toEqual({ role: null });
  });
});
```

**Acceptance Criteria:**
- [ ] All test cases pass
- [ ] Edge cases covered (null profile, empty overrides, surgical operations)
- [ ] Tests document expected behavior for future reference

---

## Phase 2: API Endpoints (2-3 hours)

### Task 2.1: Create GET endpoint for attendee with overrides
**Description:** Create API endpoint to fetch single attendee with profile, overrides, and pre-merged display profile
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.2, Task 1.4
**Can run parallel with:** Task 2.2, Task 2.3

**File:** `src/app/api/events/[eventId]/attendees/[attendeeId]/route.ts` (new file)

**Implementation:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';
import { mergeProfileWithOverrides, hasOverrides, getOverriddenFields } from '@/lib/m33t/profile-utils';
import type { Profile, ProfileOverrides } from '@/lib/m33t/schemas';

interface RouteParams {
  params: Promise<{ eventId: string; attendeeId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, attendeeId } = await params;

    // Verify event ownership
    const event = await prisma.event.findFirst({
      where: { id: eventId, userId: user.id },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Fetch attendee with contact
    const attendee = await prisma.eventAttendee.findFirst({
      where: { id: attendeeId, eventId },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            company: true,
          },
        },
      },
    });

    if (!attendee) {
      return NextResponse.json({ error: 'Attendee not found' }, { status: 404 });
    }

    const profile = attendee.profile as Profile | null;
    const profileOverrides = attendee.profileOverrides as ProfileOverrides | null;
    const displayProfile = mergeProfileWithOverrides(profile, profileOverrides);

    return NextResponse.json({
      id: attendee.id,
      firstName: attendee.firstName,
      lastName: attendee.lastName,
      email: attendee.email,
      rsvpStatus: attendee.rsvpStatus,

      // Profile data
      profile,
      profileOverrides,
      displayProfile,

      // Override metadata
      overridesEditedAt: attendee.overridesEditedAt?.toISOString() ?? null,
      hasOverrides: hasOverrides(profileOverrides),
      overriddenFields: getOverriddenFields(profileOverrides),

      // Linked contact
      contact: attendee.contact,
    });
  } catch (error) {
    console.error('Error fetching attendee:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Acceptance Criteria:**
- [ ] Returns attendee with base profile, overrides, and merged displayProfile
- [ ] Returns override metadata (hasOverrides, overriddenFields, editedAt)
- [ ] Returns 401 for unauthenticated requests
- [ ] Returns 404 if event doesn't belong to user
- [ ] Returns 404 if attendee not in event

---

### Task 2.2: Create PATCH endpoint to update attendee overrides
**Description:** Create API endpoint to update profile overrides with validation and merge behavior
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.2, Task 1.3, Task 1.4
**Can run parallel with:** Task 2.1, Task 2.3

**File:** `src/app/api/events/[eventId]/attendees/[attendeeId]/route.ts` (add to existing)

**Implementation:**
```typescript
import { ProfileOverridesSchema } from '@/lib/m33t/schemas';
import { cleanOverrides } from '@/lib/m33t/profile-utils';

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, attendeeId } = await params;

    // Verify event ownership
    const event = await prisma.event.findFirst({
      where: { id: eventId, userId: user.id },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Verify attendee exists
    const existingAttendee = await prisma.eventAttendee.findFirst({
      where: { id: attendeeId, eventId },
    });

    if (!existingAttendee) {
      return NextResponse.json({ error: 'Attendee not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate incoming overrides
    const parseResult = ProfileOverridesSchema.safeParse(body.profileOverrides);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid profile overrides', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    // Merge with existing overrides (sparse update)
    const existingOverrides = existingAttendee.profileOverrides as ProfileOverrides | null;
    const mergedOverrides = {
      ...existingOverrides,
      ...parseResult.data,
    };

    // Clean and save
    const cleanedOverrides = cleanOverrides(mergedOverrides);

    const updatedAttendee = await prisma.eventAttendee.update({
      where: { id: attendeeId },
      data: {
        profileOverrides: cleanedOverrides,
        overridesEditedAt: new Date(),
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            company: true,
          },
        },
      },
    });

    const profile = updatedAttendee.profile as Profile | null;
    const profileOverrides = updatedAttendee.profileOverrides as ProfileOverrides | null;
    const displayProfile = mergeProfileWithOverrides(profile, profileOverrides);

    return NextResponse.json({
      id: updatedAttendee.id,
      firstName: updatedAttendee.firstName,
      lastName: updatedAttendee.lastName,
      email: updatedAttendee.email,
      rsvpStatus: updatedAttendee.rsvpStatus,
      profile,
      profileOverrides,
      displayProfile,
      overridesEditedAt: updatedAttendee.overridesEditedAt?.toISOString() ?? null,
      hasOverrides: hasOverrides(profileOverrides),
      overriddenFields: getOverriddenFields(profileOverrides),
      contact: updatedAttendee.contact,
    });
  } catch (error) {
    console.error('Error updating attendee overrides:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Key Behavior:**
- Validates `profileOverrides` against schema
- Merges with existing overrides (sparse update, doesn't replace entirely)
- Cleans undefined values before saving
- Updates `overridesEditedAt` timestamp
- Returns updated attendee with merged displayProfile

**Acceptance Criteria:**
- [ ] Validates profileOverrides against schema
- [ ] Returns 400 with details for invalid input
- [ ] Merges new overrides with existing (sparse update)
- [ ] Sets overridesEditedAt to current timestamp
- [ ] Returns updated attendee with merged displayProfile
- [ ] Returns 401/404 for auth/not found cases

---

### Task 2.3: Create DELETE endpoint to reset all overrides
**Description:** Create API endpoint to clear all profile overrides for an attendee
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 1.2
**Can run parallel with:** Task 2.1, Task 2.2

**File:** `src/app/api/events/[eventId]/attendees/[attendeeId]/overrides/route.ts` (new file)

**Implementation:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';
import { mergeProfileWithOverrides } from '@/lib/m33t/profile-utils';
import type { Profile } from '@/lib/m33t/schemas';

interface RouteParams {
  params: Promise<{ eventId: string; attendeeId: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, attendeeId } = await params;

    // Verify event ownership
    const event = await prisma.event.findFirst({
      where: { id: eventId, userId: user.id },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Reset overrides
    const updatedAttendee = await prisma.eventAttendee.update({
      where: { id: attendeeId },
      data: {
        profileOverrides: null,
        overridesEditedAt: null,
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            company: true,
          },
        },
      },
    });

    const profile = updatedAttendee.profile as Profile | null;

    return NextResponse.json({
      id: updatedAttendee.id,
      firstName: updatedAttendee.firstName,
      lastName: updatedAttendee.lastName,
      email: updatedAttendee.email,
      rsvpStatus: updatedAttendee.rsvpStatus,
      profile,
      profileOverrides: null,
      displayProfile: profile, // No overrides, display equals base
      overridesEditedAt: null,
      hasOverrides: false,
      overriddenFields: [],
      contact: updatedAttendee.contact,
    });
  } catch (error) {
    console.error('Error resetting overrides:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Acceptance Criteria:**
- [ ] Sets profileOverrides to null
- [ ] Sets overridesEditedAt to null
- [ ] Returns attendee with base profile only
- [ ] Returns 401/404 for auth/not found cases

---

## Phase 3: Dashboard Edit UI (3-4 hours)

### Task 3.1: Add edit button to attendee rows on dashboard
**Description:** Add edit button with pencil icon to each attendee row that opens the edit modal
**Size:** Small
**Priority:** High
**Dependencies:** Phase 1 complete
**Can run parallel with:** Task 3.2

**File:** `src/app/(dashboard)/events/[eventId]/page.tsx`

**Implementation:**
```tsx
// Add import
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { AttendeeProfileEditModal } from '@/components/m33t/AttendeeProfileEditModal';

// Add state in component
const [editingAttendee, setEditingAttendee] = useState<AttendeeWithDetails | null>(null);

// Add to attendee row (inside the existing map)
<Button
  variant="ghost"
  size="sm"
  onClick={(e) => {
    e.stopPropagation();
    setEditingAttendee(attendee);
  }}
  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
  title="Edit profile"
>
  <Pencil className="w-4 h-4" />
</Button>

// Add modal at end of component (before closing fragment)
{editingAttendee && (
  <AttendeeProfileEditModal
    isOpen={!!editingAttendee}
    onClose={() => setEditingAttendee(null)}
    eventId={event.id}
    attendeeId={editingAttendee.id}
    onSave={() => {
      setEditingAttendee(null);
      router.refresh();
    }}
  />
)}
```

**Acceptance Criteria:**
- [ ] Edit button appears on hover for each attendee row
- [ ] Clicking button opens AttendeeProfileEditModal
- [ ] Button click doesn't trigger row click/navigation
- [ ] Modal closes and refreshes data on save

---

### Task 3.2: Create AttendeeProfileEditModal component
**Description:** Create modal component for editing attendee profile with field status indicators, reset buttons, and hide checkboxes
**Size:** Large
**Priority:** High
**Dependencies:** Task 2.1, Task 2.2
**Can run parallel with:** Task 3.1

**File:** `src/components/m33t/AttendeeProfileEditModal.tsx` (new file)

**Implementation:**
```tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, X, Plus, Loader2 } from 'lucide-react';
import type { Profile, ProfileOverrides } from '@/lib/m33t/schemas';

interface AttendeeProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  attendeeId: string;
  onSave: () => void;
}

interface AttendeeData {
  id: string;
  firstName: string;
  lastName: string | null;
  profile: Profile | null;
  profileOverrides: ProfileOverrides | null;
  displayProfile: Profile | null;
  overriddenFields: string[];
}

interface FieldState {
  value: string;
  isOverridden: boolean;
  isHidden: boolean;
}

export function AttendeeProfileEditModal({
  isOpen,
  onClose,
  eventId,
  attendeeId,
  onSave,
}: AttendeeProfileEditModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attendee, setAttendee] = useState<AttendeeData | null>(null);

  // Form state for each field
  const [role, setRole] = useState<FieldState>({ value: '', isOverridden: false, isHidden: false });
  const [company, setCompany] = useState<FieldState>({ value: '', isOverridden: false, isHidden: false });
  const [location, setLocation] = useState<FieldState>({ value: '', isOverridden: false, isHidden: false });
  const [currentFocus, setCurrentFocus] = useState<FieldState>({ value: '', isOverridden: false, isHidden: false });

  // Expertise state (special handling for surgical editing)
  const [expertiseTags, setExpertiseTags] = useState<string[]>([]);
  const [removedTags, setRemovedTags] = useState<string[]>([]);
  const [addedTags, setAddedTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [expertiseHidden, setExpertiseHidden] = useState(false);

  // Fetch attendee data
  useEffect(() => {
    if (!isOpen) return;

    const fetchAttendee = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/events/${eventId}/attendees/${attendeeId}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setAttendee(data);

        // Initialize form state from data
        const profile = data.profile as Profile | null;
        const overrides = data.profileOverrides as ProfileOverrides | null;
        const overriddenFields = data.overriddenFields as string[];

        // Role
        const roleOverridden = overriddenFields.includes('role');
        const roleHidden = overrides?.role === null;
        setRole({
          value: roleHidden ? '' : (overrides?.role ?? profile?.role ?? ''),
          isOverridden: roleOverridden,
          isHidden: roleHidden,
        });

        // Company
        const companyOverridden = overriddenFields.includes('company');
        const companyHidden = overrides?.company === null;
        setCompany({
          value: companyHidden ? '' : (overrides?.company ?? profile?.company ?? ''),
          isOverridden: companyOverridden,
          isHidden: companyHidden,
        });

        // Location
        const locationOverridden = overriddenFields.includes('location');
        const locationHidden = overrides?.location === null;
        setLocation({
          value: locationHidden ? '' : (overrides?.location ?? profile?.location ?? ''),
          isOverridden: locationOverridden,
          isHidden: locationHidden,
        });

        // Current Focus
        const focusOverridden = overriddenFields.includes('currentFocus');
        const focusHidden = overrides?.currentFocus === null;
        setCurrentFocus({
          value: focusHidden ? '' : (overrides?.currentFocus ?? profile?.currentFocus ?? ''),
          isOverridden: focusOverridden,
          isHidden: focusHidden,
        });

        // Expertise
        const expertiseOverride = overrides?.expertise;
        if (expertiseOverride === null) {
          setExpertiseHidden(true);
          setExpertiseTags(profile?.expertise ?? []);
          setRemovedTags([]);
          setAddedTags([]);
        } else if (Array.isArray(expertiseOverride)) {
          // Complete replacement
          setExpertiseTags(expertiseOverride);
          setRemovedTags([]);
          setAddedTags([]);
        } else if (expertiseOverride && typeof expertiseOverride === 'object') {
          // Surgical
          const baseTags = profile?.expertise ?? [];
          const displayed = baseTags.filter(t => !expertiseOverride.remove.includes(t));
          displayed.push(...expertiseOverride.add.filter(t => !displayed.includes(t)));
          setExpertiseTags(displayed);
          setRemovedTags(expertiseOverride.remove);
          setAddedTags(expertiseOverride.add);
        } else {
          // No override
          setExpertiseTags(profile?.expertise ?? []);
          setRemovedTags([]);
          setAddedTags([]);
        }
      } catch (error) {
        console.error('Error fetching attendee:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendee();
  }, [isOpen, eventId, attendeeId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build overrides object
      const overrides: ProfileOverrides = {};

      // Role
      if (role.isHidden) {
        overrides.role = null;
      } else if (role.isOverridden && role.value !== (attendee?.profile?.role ?? '')) {
        overrides.role = role.value;
      }

      // Company
      if (company.isHidden) {
        overrides.company = null;
      } else if (company.isOverridden && company.value !== (attendee?.profile?.company ?? '')) {
        overrides.company = company.value;
      }

      // Location
      if (location.isHidden) {
        overrides.location = null;
      } else if (location.isOverridden && location.value !== (attendee?.profile?.location ?? '')) {
        overrides.location = location.value;
      }

      // Current Focus
      if (currentFocus.isHidden) {
        overrides.currentFocus = null;
      } else if (currentFocus.isOverridden && currentFocus.value !== (attendee?.profile?.currentFocus ?? '')) {
        overrides.currentFocus = currentFocus.value;
      }

      // Expertise
      if (expertiseHidden) {
        overrides.expertise = null;
      } else if (removedTags.length > 0 || addedTags.length > 0) {
        overrides.expertise = { remove: removedTags, add: addedTags };
      }

      const res = await fetch(`/api/events/${eventId}/attendees/${attendeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileOverrides: overrides }),
      });

      if (!res.ok) throw new Error('Failed to save');

      onSave();
    } catch (error) {
      console.error('Error saving overrides:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetField = (field: 'role' | 'company' | 'location' | 'currentFocus') => {
    const baseValue = attendee?.profile?.[field] ?? '';
    const setter = {
      role: setRole,
      company: setCompany,
      location: setLocation,
      currentFocus: setCurrentFocus,
    }[field];
    setter({ value: baseValue, isOverridden: false, isHidden: false });
  };

  const removeTag = (tag: string) => {
    const baseTags = attendee?.profile?.expertise ?? [];
    if (baseTags.includes(tag)) {
      // Tag is from base - mark as removed
      setRemovedTags(prev => [...prev, tag]);
    } else {
      // Tag was added - just remove from added
      setAddedTags(prev => prev.filter(t => t !== tag));
    }
    setExpertiseTags(prev => prev.filter(t => t !== tag));
  };

  const addTag = () => {
    const tag = newTagInput.trim();
    if (!tag || expertiseTags.includes(tag)) return;

    const baseTags = attendee?.profile?.expertise ?? [];
    if (baseTags.includes(tag) && removedTags.includes(tag)) {
      // Re-adding a removed base tag
      setRemovedTags(prev => prev.filter(t => t !== tag));
    } else if (!baseTags.includes(tag)) {
      // New tag
      setAddedTags(prev => [...prev, tag]);
    }

    setExpertiseTags(prev => [...prev, tag]);
    setNewTagInput('');
  };

  const resetExpertise = () => {
    setExpertiseTags(attendee?.profile?.expertise ?? []);
    setRemovedTags([]);
    setAddedTags([]);
    setExpertiseHidden(false);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit Attendee Profile
            {attendee && (
              <span className="font-normal text-zinc-400 ml-2">
                {attendee.firstName} {attendee.lastName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Role Field */}
            <FieldEditor
              label="Role"
              value={role.value}
              onChange={(v) => setRole({ ...role, value: v, isOverridden: true })}
              isOverridden={role.isOverridden}
              isHidden={role.isHidden}
              onHideChange={(h) => setRole({ ...role, isHidden: h })}
              onReset={() => resetField('role')}
              baseValue={attendee?.profile?.role}
            />

            {/* Company Field */}
            <FieldEditor
              label="Company"
              value={company.value}
              onChange={(v) => setCompany({ ...company, value: v, isOverridden: true })}
              isOverridden={company.isOverridden}
              isHidden={company.isHidden}
              onHideChange={(h) => setCompany({ ...company, isHidden: h })}
              onReset={() => resetField('company')}
              baseValue={attendee?.profile?.company}
            />

            {/* Location Field */}
            <FieldEditor
              label="Location"
              value={location.value}
              onChange={(v) => setLocation({ ...location, value: v, isOverridden: true })}
              isOverridden={location.isOverridden}
              isHidden={location.isHidden}
              onHideChange={(h) => setLocation({ ...location, isHidden: h })}
              onReset={() => resetField('location')}
              baseValue={attendee?.profile?.location}
            />

            {/* Expertise Tags */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Expertise Tags</Label>
                <Button variant="ghost" size="sm" onClick={resetExpertise}>
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </Button>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  id="hide-expertise"
                  checked={expertiseHidden}
                  onCheckedChange={(checked) => setExpertiseHidden(!!checked)}
                />
                <Label htmlFor="hide-expertise" className="text-sm text-zinc-400">
                  Hide expertise section
                </Label>
              </div>

              {!expertiseHidden && (
                <>
                  <div className="flex flex-wrap gap-2 p-3 border border-zinc-800 rounded-lg min-h-[60px]">
                    {expertiseTags.map((tag) => {
                      const isFromBase = (attendee?.profile?.expertise ?? []).includes(tag);
                      const isAdded = addedTags.includes(tag);
                      return (
                        <Badge
                          key={tag}
                          variant="outline"
                          className={`
                            ${isAdded ? 'border-green-500/50 text-green-400' : ''}
                            ${isFromBase && !isAdded ? 'border-zinc-700' : ''}
                          `}
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="ml-1 hover:text-red-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      );
                    })}
                    {expertiseTags.length === 0 && (
                      <span className="text-sm text-zinc-500">No expertise tags</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Add tag..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm" onClick={addTag}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Current Focus Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Current Focus</Label>
                <Button variant="ghost" size="sm" onClick={() => resetField('currentFocus')}>
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </Button>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  id="hide-focus"
                  checked={currentFocus.isHidden}
                  onCheckedChange={(checked) => setCurrentFocus({ ...currentFocus, isHidden: !!checked })}
                />
                <Label htmlFor="hide-focus" className="text-sm text-zinc-400">
                  Hide this field
                </Label>
              </div>

              {!currentFocus.isHidden && (
                <Textarea
                  value={currentFocus.value}
                  onChange={(e) => setCurrentFocus({ ...currentFocus, value: e.target.value, isOverridden: true })}
                  placeholder="What are they currently working on?"
                  rows={3}
                />
              )}

              <FieldStatusIndicator
                isOverridden={currentFocus.isOverridden}
                baseValue={attendee?.profile?.currentFocus}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Sub-components

interface FieldEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isOverridden: boolean;
  isHidden: boolean;
  onHideChange: (hidden: boolean) => void;
  onReset: () => void;
  baseValue?: string | null;
}

function FieldEditor({
  label,
  value,
  onChange,
  isOverridden,
  isHidden,
  onHideChange,
  onReset,
  baseValue,
}: FieldEditorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Checkbox
          id={`hide-${label.toLowerCase()}`}
          checked={isHidden}
          onCheckedChange={(checked) => onHideChange(!!checked)}
        />
        <Label htmlFor={`hide-${label.toLowerCase()}`} className="text-sm text-zinc-400">
          Hide this field
        </Label>
      </div>

      {!isHidden && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${label.toLowerCase()}...`}
        />
      )}

      <FieldStatusIndicator isOverridden={isOverridden} baseValue={baseValue} />
    </div>
  );
}

interface FieldStatusIndicatorProps {
  isOverridden: boolean;
  baseValue?: string | null;
}

function FieldStatusIndicator({ isOverridden, baseValue }: FieldStatusIndicatorProps) {
  return (
    <div className="text-xs text-zinc-500">
      {isOverridden ? (
        <span className="text-purple-400">● Customized</span>
      ) : (
        <span>○ Inherited from profile{baseValue ? `: "${baseValue}"` : ''}</span>
      )}
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Modal fetches and displays attendee data on open
- [ ] Each field shows inherited vs customized status
- [ ] Reset button reverts field to base profile value
- [ ] Hide checkbox sets field to null in overrides
- [ ] Expertise tag editor supports add/remove with visual distinction
- [ ] Save button sends PATCH request with correct override structure
- [ ] Modal closes and triggers refresh on successful save

---

### Task 3.3: Add "Customized" badge to dashboard attendee list
**Description:** Show subtle indicator when attendee has profile overrides
**Size:** Small
**Priority:** Low
**Dependencies:** Task 3.1
**Can run parallel with:** Phase 4 tasks

**File:** `src/app/(dashboard)/events/[eventId]/page.tsx`

**Implementation:**
```tsx
// In attendee row, after name/email display
{attendee.profileOverrides && Object.keys(attendee.profileOverrides as object).length > 0 && (
  <Badge
    variant="outline"
    className="text-xs text-purple-400 border-purple-400/30 ml-2"
  >
    Customized
  </Badge>
)}
```

**Note:** Requires including `profileOverrides` in the attendee query for the dashboard.

**Acceptance Criteria:**
- [ ] Badge appears only when profileOverrides has fields
- [ ] Badge uses purple color to match customization theme
- [ ] Badge doesn't appear for attendees without overrides

---

## Phase 4: Public Display Integration (1-2 hours)

### Task 4.1: Update public API to merge overrides
**Description:** Modify public event API to apply profile overrides before returning attendee data
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.4
**Can run parallel with:** Phase 3 tasks

**File:** `src/app/api/public/events/[slug]/route.ts`

**Implementation:**
```typescript
// Add import at top
import { mergeProfileWithOverrides } from '@/lib/m33t/profile-utils';
import type { ProfileOverrides } from '@/lib/m33t/schemas';

// In the attendee transformation loop (around line 180):

// BEFORE: Extract from profile directly
// const role = profile?.role;

// AFTER: Merge with overrides first
const profileOverrides = attendee.profileOverrides as ProfileOverrides | null;
const mergedProfile = mergeProfileWithOverrides(
  profile,
  profileOverrides
);

// Then extract from mergedProfile
const role = mergedProfile?.role;
const company = mergedProfile?.company;
const location = mergedProfile?.location;
const expertise = mergedProfile?.expertise;
const currentFocus = mergedProfile?.currentFocus;
```

**Key Points:**
- No changes needed to response structure
- AttendeeCard and ProfileModal receive pre-merged data
- No indicator of customization shown publicly (per spec decision)

**Acceptance Criteria:**
- [ ] Public API returns merged profile data
- [ ] Hidden fields (null overrides) are omitted from response
- [ ] Override text replacements appear in public data
- [ ] Surgical expertise changes reflected correctly
- [ ] No "customized" indicator in public response

---

### Task 4.2: Verify AttendeeCard displays correctly with overrides
**Description:** Test that AttendeeCard component handles merged data correctly
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 4.1
**Can run parallel with:** Task 4.3

**Manual Testing Checklist:**

1. **Text Field Override:**
   - Set custom role via edit modal
   - Verify AttendeeCard shows custom role on public page

2. **Hidden Field:**
   - Hide location field via edit modal
   - Verify location doesn't appear on AttendeeCard

3. **Expertise Override:**
   - Remove a tag via surgical edit
   - Verify removed tag doesn't appear in AttendeeCard tags

4. **Current Focus Override:**
   - Set custom currentFocus text
   - Verify italic text shows custom value

**Acceptance Criteria:**
- [ ] Custom text values display correctly
- [ ] Hidden fields don't render
- [ ] Modified expertise tags show correctly
- [ ] No visual indication of customization

---

### Task 4.3: Verify ProfileModal displays correctly with overrides
**Description:** Test that ProfileModal component handles merged data correctly
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 4.1
**Can run parallel with:** Task 4.2

**Manual Testing Checklist:**

1. **All Fields Override:**
   - Override all fields (role, company, location, expertise, currentFocus)
   - Open ProfileModal and verify all show custom values

2. **Hidden Sections:**
   - Hide expertise section
   - Verify "EXPERTISE" section doesn't appear in modal

3. **Mixed State:**
   - Override some fields, hide others, leave some inherited
   - Verify correct mix of custom, hidden, and base values

**Acceptance Criteria:**
- [ ] ProfileModal shows merged data
- [ ] Hidden sections don't render
- [ ] No visual indication of customization

---

## Phase 5: Polish & Edge Cases (1-2 hours)

### Task 5.1: Handle attendees with no profile
**Description:** Ensure edit modal works for attendees imported without contact/profile data
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 3.2
**Can run parallel with:** Task 5.2

**Edge Case:**
Attendees added manually or imported without a linked contact may have `profile: null`. The edit modal should:
- Allow setting overrides even without base profile
- Display empty fields with ability to add custom values
- Not show "inherited" indicator when no base value exists

**Implementation Update in AttendeeProfileEditModal:**
```typescript
// When initializing fields, handle null profile gracefully
const baseRole = attendee?.profile?.role ?? '';
// This already works because of ?? '' fallbacks
```

**Acceptance Criteria:**
- [ ] Edit modal opens for attendees with null profile
- [ ] All fields are editable even without base values
- [ ] Saved overrides work correctly

---

### Task 5.2: Preserve overrides during questionnaire re-extraction
**Description:** Verify that AI profile extraction doesn't overwrite profileOverrides
**Size:** Small
**Priority:** Medium
**Dependencies:** Phase 1 complete
**Can run parallel with:** Task 5.1

**Verification:**
The extraction code in `src/lib/m33t/extraction.ts` only updates the `profile` field, not `profileOverrides`. This is correct by design - overrides are separate.

**Test Scenario:**
1. Add attendee with profile
2. Edit profile via override modal
3. Submit questionnaire response
4. Trigger re-extraction
5. Verify overrides still present and working

**Acceptance Criteria:**
- [ ] Questionnaire re-extraction only updates `profile` field
- [ ] `profileOverrides` field unchanged after extraction
- [ ] Merged display shows override taking precedence

---

### Task 5.3: Add "Reset all overrides" action to modal
**Description:** Add button to clear all overrides at once with confirmation
**Size:** Small
**Priority:** Low
**Dependencies:** Task 2.3, Task 3.2
**Can run parallel with:** Task 5.4

**Implementation in AttendeeProfileEditModal:**
```tsx
// Add to modal header or footer
<Button
  variant="destructive"
  size="sm"
  onClick={async () => {
    if (!confirm('Reset all customizations? This will revert to the original profile.')) return;

    await fetch(`/api/events/${eventId}/attendees/${attendeeId}/overrides`, {
      method: 'DELETE',
    });

    onSave();
  }}
>
  Reset All Customizations
</Button>
```

**Acceptance Criteria:**
- [ ] Button calls DELETE endpoint
- [ ] Confirmation dialog prevents accidental resets
- [ ] Modal closes and refreshes after reset

---

### Task 5.4: Manual end-to-end testing
**Description:** Complete manual testing of the full feature flow
**Size:** Medium
**Priority:** High
**Dependencies:** All previous tasks
**Can run parallel with:** None (final verification)

**Test Scenarios:**

1. **Happy Path:**
   - Create event with attendees
   - Edit attendee profile via dashboard
   - Override role, hide location, add/remove expertise tags
   - Save and verify changes on dashboard
   - View public landing page
   - Verify changes appear correctly
   - Click attendee card, verify ProfileModal shows changes

2. **Reset Flows:**
   - Reset individual field (verify reverts to base)
   - Reset all overrides (verify all revert)

3. **Edge Cases:**
   - Attendee with no profile
   - Attendee with no expertise tags
   - Multiple attendees with different override states

4. **Performance:**
   - Load public page with 20+ attendees
   - Verify no noticeable slowdown from merge logic

**Acceptance Criteria:**
- [ ] All happy path scenarios work correctly
- [ ] Reset flows work as expected
- [ ] Edge cases handled gracefully
- [ ] No performance regression on public page

---

## Dependency Graph

```
Phase 1 (Foundation)
├── 1.1 Schema Changes
│   └── 1.2 Run Migration
├── 1.3 Zod Schemas ─────────────┐
└── 1.4 Merge Utilities ─────────┼─→ 1.5 Unit Tests
                                 │
Phase 2 (API)                    │
├── 2.1 GET Endpoint ←───────────┤
├── 2.2 PATCH Endpoint ←─────────┤
└── 2.3 DELETE Endpoint          │
                                 │
Phase 3 (Dashboard UI)           │
├── 3.1 Edit Button              │
├── 3.2 Edit Modal ←─────────────┘
└── 3.3 Customized Badge

Phase 4 (Public Integration)
├── 4.1 Public API Merge
├── 4.2 AttendeeCard Verify
└── 4.3 ProfileModal Verify

Phase 5 (Polish)
├── 5.1 No Profile Edge Case
├── 5.2 Re-extraction Verify
├── 5.3 Reset All Action
└── 5.4 E2E Testing
```

## Parallel Execution Opportunities

**Can run in parallel:**
- Tasks 1.1 + 1.3 (schema change + Zod schema - independent files)
- Tasks 2.1 + 2.2 + 2.3 (all API endpoints - independent routes)
- Tasks 3.1 + 3.2 (edit button + modal - can develop in parallel)
- Tasks 4.2 + 4.3 (verification tasks - independent)
- Tasks 5.1 + 5.2 + 5.3 (edge cases - independent)

**Must be sequential:**
- 1.1 → 1.2 (schema before migration)
- 1.3 → 1.4 (schemas before utilities that use them)
- 1.4 → 1.5 (utilities before tests)
- Phase 1 → Phase 2 (data model before API)
- Phase 2 → Phase 3 (API before UI that uses it)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Complex modal state management | Medium | Medium | Use react-hook-form for form state |
| Expertise surgical edit UX confusion | Low | Low | Color-code base vs added tags |
| Performance on large attendee lists | Low | Low | Merge is O(1) per attendee |
| Migration data loss | Low | High | Backup database before migration |

---

**Total Tasks:** 15
**Estimated Effort:** 10-14 hours
**Critical Path:** 1.1 → 1.2 → 2.2 → 3.2 → 4.1 → 5.4
