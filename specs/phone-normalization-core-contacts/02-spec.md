# Phone Number Normalization for Core Contacts — Specification

**Slug:** phone-normalization-core-contacts
**Author:** Claude Code
**Date:** 2026-01-29
**Status:** Draft
**Ideation:** `specs/phone-normalization-core-contacts/01-ideation.md`

---

## Overview

Apply the proven phone number normalization system from M33T RSVP (`normalizePhone()`, `formatPhoneForDisplay()`) to all phone capture points in core Better Connections contacts. Store all phone numbers in E.164 format (`+15125551234`), display in national format (`(512) 555-1234`), and reject unparseable phone values with a validation error.

**Decisions from user:**
- Normalize going forward only (no migration of existing data)
- Reject invalid/unparseable phone numbers with validation error
- Export in E.164 format (industry standard, most portable)
- Apply normalization to VCF conflict detection

---

## Implementation Plan

### Task 1: Create shared phone utility module

**File:** `src/lib/phone.ts` (NEW)

Extract the phone-related functions from `src/lib/m33t/phone-verification.ts` into a shared location. The M33T module will re-export from the shared module.

```typescript
// src/lib/phone.ts
import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from 'libphonenumber-js';

/**
 * Normalize a phone number to E.164 format.
 * Returns null if the phone number is invalid.
 */
export function normalizePhone(
  phone: string,
  defaultCountry: CountryCode = 'US'
): string | null {
  if (!phone || phone.trim().length < 3) {
    return null;
  }
  try {
    if (!isValidPhoneNumber(phone, defaultCountry)) {
      return null;
    }
    const parsed = parsePhoneNumber(phone, defaultCountry);
    if (!parsed) {
      return null;
    }
    return parsed.format('E.164');
  } catch {
    return null;
  }
}

/**
 * Format a phone number for display (national format).
 * Returns the original string if parsing fails.
 */
export function formatPhoneForDisplay(
  phone: string,
  defaultCountry: CountryCode = 'US'
): string {
  if (!phone) {
    return '';
  }
  try {
    const parsed = parsePhoneNumber(phone, defaultCountry);
    if (!parsed) {
      return phone;
    }
    return parsed.formatNational();
  } catch {
    return phone;
  }
}
```

**Tests to verify:**
- `normalizePhone('(512) 555-1234')` → `'+15125551234'`
- `normalizePhone('512-555-1234')` → `'+15125551234'`
- `normalizePhone('+15125551234')` → `'+15125551234'` (idempotent)
- `normalizePhone('5125551234')` → `'+15125551234'`
- `normalizePhone('call my office')` → `null`
- `normalizePhone('')` → `null`
- `normalizePhone('123')` → `null`
- `formatPhoneForDisplay('+15125551234')` → `'(512) 555-1234'`
- `formatPhoneForDisplay('not-a-phone')` → `'not-a-phone'` (passthrough)

---

### Task 2: Update M33T phone-verification to re-export from shared module

**File:** `src/lib/m33t/phone-verification.ts` (MODIFY)

Replace the `normalizePhone`, `formatPhoneForDisplay`, and `maskPhone` implementations with re-exports from the shared module. Keep OTP-specific functions (`generateOTP`, `hashOTP`, etc.) in place.

```typescript
// Replace lines 69-140 with:
export { normalizePhone, formatPhoneForDisplay } from '@/lib/phone';

// Keep maskPhone here since it's M33T-specific (privacy masking for OTP flows)
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) {
    return '****';
  }
  const lastFour = phone.slice(-4);
  return `***-***-${lastFour}`;
}
```

No changes needed to `src/lib/m33t/index.ts` — it already re-exports from `phone-verification.ts`, so the barrel export chain stays intact.

**Verification:** All existing M33T imports of `normalizePhone` and `formatPhoneForDisplay` continue to work unchanged.

---

### Task 3: Normalize phones in API routes (server-side)

**Files:** `src/app/api/contacts/route.ts` (MODIFY), `src/app/api/contacts/[id]/route.ts` (MODIFY)

Rather than using Zod transform chains (which break with `contactUpdateSchema = contactCreateSchema.partial()`), normalize phone numbers directly in the API route handlers after Zod validation. This keeps the Zod schemas simple and avoids `.partial()` incompatibility.

**Do NOT modify `src/lib/validations/contact.ts`** — the existing permissive schema stays as-is.

**3a. Create a shared normalization helper used by both routes:**

```typescript
// Add to src/lib/phone.ts:

/**
 * Normalize phone fields in a contact data object.
 * Returns { data, phoneErrors } — phoneErrors lists any invalid phone values.
 * Invalid phones are set to undefined (not included in update) so they
 * don't overwrite existing valid data.
 */
export function normalizeContactPhones<T extends Record<string, unknown>>(
  data: T
): { data: T; phoneErrors: string[] } {
  const errors: string[] = [];
  const result = { ...data };

  for (const field of ['primaryPhone', 'secondaryPhone'] as const) {
    const value = result[field];
    if (value === null || value === undefined || value === '') {
      (result as Record<string, unknown>)[field] = null;
      continue;
    }
    if (typeof value === 'string') {
      const normalized = normalizePhone(value);
      if (normalized) {
        (result as Record<string, unknown>)[field] = normalized;
      } else {
        errors.push(`Invalid phone number in ${field}: "${value}"`);
        // Remove the invalid field so it doesn't get saved
        delete (result as Record<string, unknown>)[field];
      }
    }
  }

  return { data: result, phoneErrors: errors };
}
```

**3b. Update POST /api/contacts (create) — `src/app/api/contacts/route.ts`:**

```typescript
import { normalizeContactPhones } from '@/lib/phone';

// After Zod parse (line 144):
const data = contactCreateSchema.parse(body);
const { tags, ...contactData } = data;

// Add phone normalization:
const { data: normalizedContactData, phoneErrors } = normalizeContactPhones(contactData);
if (phoneErrors.length > 0) {
  return NextResponse.json(
    { error: 'Invalid phone number', details: phoneErrors },
    { status: 400 }
  );
}

// Use normalizedContactData instead of contactData in the create call
```

**3c. Update PUT /api/contacts/[id] (update) — `src/app/api/contacts/[id]/route.ts`:**

```typescript
import { normalizeContactPhones } from '@/lib/phone';

// After Zod parse (line 76):
const data = contactUpdateSchema.parse(body);
const { tags, ...contactData } = data;

// Add phone normalization:
const { data: normalizedContactData, phoneErrors } = normalizeContactPhones(contactData);
if (phoneErrors.length > 0) {
  return NextResponse.json(
    { error: 'Invalid phone number', details: phoneErrors },
    { status: 400 }
  );
}

// Use normalizedContactData instead of contactData in the update call
```

**Effect:** Both create and update routes now normalize valid phones to E.164 and reject invalid ones with a specific `"Invalid phone number"` error (not the generic `"Invalid contact data"` from Zod). The update schema's `.partial()` behavior is unaffected since we're not changing Zod schemas.

---

### Task 4: Update ContactForm client-side phone handling

**File:** `src/components/contacts/ContactForm.tsx` (MODIFY)

Add format-on-blur behavior and client-side validation feedback for phone inputs.

**4a. Update client-side Zod schema (lines 44-45):**

```typescript
// Before:
primaryPhone: z.string().max(50).optional().or(z.literal('')),
secondaryPhone: z.string().max(50).optional().or(z.literal('')),

// After: (client-side is permissive — server does the real validation)
primaryPhone: z.string().max(50).optional().or(z.literal('')),
secondaryPhone: z.string().max(50).optional().or(z.literal('')),
// Keep same — client schema stays permissive to allow typing
```

**4b. Add import and format-on-blur handler:**

```typescript
import { formatPhoneForDisplay } from '@/lib/phone';
import { isValidPhoneNumber } from 'libphonenumber-js';

// Inside the component, add a blur handler
const handlePhoneBlur = (fieldName: 'primaryPhone' | 'secondaryPhone') => {
  const value = getValues(fieldName);
  if (!value || !value.trim()) return;

  // If valid, format for display
  if (isValidPhoneNumber(value, 'US')) {
    setValue(fieldName, formatPhoneForDisplay(value));
  }
  // If invalid, leave as-is — server will reject on submit
};
```

**4c. Update phone input fields (lines 453-470):**

Add `onBlur` handler to both phone inputs:

```tsx
<Input
  id="primaryPhone"
  {...register('primaryPhone')}
  placeholder="+1 (555) 123-4567"
  className={getFieldClasses('primaryPhone')}
  onBlur={() => handlePhoneBlur('primaryPhone')}
/>

<Input
  id="secondaryPhone"
  {...register('secondaryPhone')}
  placeholder="+1 (555) 987-6543"
  className={getFieldClasses('secondaryPhone')}
  onBlur={() => handlePhoneBlur('secondaryPhone')}
/>
```

**4d. Handle server validation errors on submit:**

Update the `onSubmit` error handling to detect the specific phone validation error returned by the API (see Task 3):

```typescript
// In onSubmit, replace the existing error handling after fetch:
if (!res.ok) {
  const errorData = await res.json().catch(() => null);
  if (errorData?.error === 'Invalid phone number') {
    toast({
      title: 'Invalid phone number',
      description: 'Please check the phone number format and try again.',
      variant: 'destructive',
    });
    return;
  }
  throw new Error('Failed to save contact');
}
```

---

### Task 5: Normalize phones in CSV import

**File:** `src/app/api/contacts/import/csv/route.ts` (MODIFY)

Add normalization after the clean step, before database write. CSV data can contain any format, so we normalize but don't reject (silently null out invalid phones to avoid blocking bulk imports).

```typescript
import { normalizePhone } from '@/lib/phone';

// After cleanContact is built (around line 71), add:
const normalizedPhone = cleanContact.primaryPhone
  ? normalizePhone(cleanContact.primaryPhone)
  : null;
const normalizedSecondaryPhone = cleanContact.secondaryPhone
  ? normalizePhone(cleanContact.secondaryPhone)
  : null;

// Then use in the create call:
primaryPhone: normalizedPhone,
secondaryPhone: normalizedSecondaryPhone,
```

**Note:** For CSV imports, invalid phones are silently nulled out rather than rejecting the entire row. This is intentional — CSV data is messy and we don't want to block an import of 500 contacts because 3 have notes in the phone field.

---

### Task 6: Normalize phones in VCF parser

**File:** `src/lib/vcf-parser.ts` (MODIFY)

Normalize phone numbers at parse time in the `extractPhones()` function (lines 242-281). This ensures all downstream code (conflict detection, commit, display) works with E.164 values.

```typescript
import { normalizePhone } from '@/lib/phone';

// In extractPhones(), after deduplication (line 274), normalize:
const unique = [...new Set(values)];

// Normalize to E.164 (keep raw value as fallback if normalization fails)
const normalized = unique.map(p => normalizePhone(p) || p);
// Deduplicate again after normalization (different raw formats → same E.164)
const deduped = [...new Set(normalized)];

return {
  primaryPhone: deduped[0] || null,
  secondaryPhone: deduped[1] || null,
  overflowPhones: deduped.slice(2),
};
```

**Effect on conflict detection:** Since incoming VCF phones will now be in E.164, `detectConflicts()` string equality comparison works correctly for new-vs-new comparisons. No change needed to `detectConflicts()` itself.

**Note on historical data:** If an existing DB contact has a raw phone like `"(512) 555-1234"` and a VCF import has `"+15125551234"`, these will still register as a conflict since the existing value isn't normalized. This is expected — we're normalizing going forward only. When the user edits that old contact via ContactForm and saves, the API route (Task 3) will normalize it.

**Effect on VCF commit route:** `src/app/api/contacts/import/vcf/commit/route.ts` receives already-normalized phones from the parser, so no additional changes needed there for new imports.

---

### Task 7: Normalize phones in VCF commit merge logic

**File:** `src/app/api/contacts/import/vcf/commit/route.ts` (MODIFY)

The `mergeContactData()` function (line 103) collects phones via `Set<string>`. Since VCF parser now outputs E.164, new imports are handled. But for merges with existing contacts (which may have raw historical data), we should normalize during the merge.

```typescript
import { normalizePhone } from '@/lib/phone';

// In mergeContactData(), replace the phone collection block (lines 149-157):
const phones = new Set<string>();
for (const c of contacts) {
  if (c.primaryPhone) {
    phones.add(normalizePhone(c.primaryPhone) || c.primaryPhone);
  }
  if (c.secondaryPhone) {
    phones.add(normalizePhone(c.secondaryPhone) || c.secondaryPhone);
  }
}
const phoneArray = Array.from(phones);
merged.primaryPhone = phoneArray[0] || null;
merged.secondaryPhone = phoneArray[1] || null;
```

This ensures that when merging an existing contact with raw phone `"(512) 555-1234"` and an incoming VCF with E.164 `"+15125551234"`, they're recognized as the same number and deduplicated.

---

### Task 8: Format phone display in ContactDetail

**File:** `src/components/contacts/ContactDetail.tsx` (MODIFY)

Format stored E.164 phone numbers to national display format. The `tel:` href stays as E.164 (which is correct for `tel:` links).

```typescript
import { formatPhoneForDisplay } from '@/lib/phone';

// Replace lines 374-389:
{contact.primaryPhone && (
  <div className="flex items-center gap-3">
    <Phone className="h-4 w-4 text-text-tertiary" />
    <a href={`tel:${contact.primaryPhone}`} className="text-white hover:text-gold-primary">
      {formatPhoneForDisplay(contact.primaryPhone)}
    </a>
  </div>
)}
{contact.secondaryPhone && (
  <div className="flex items-center gap-3">
    <Phone className="h-4 w-4 text-text-tertiary opacity-50" />
    <a href={`tel:${contact.secondaryPhone}`} className="text-text-tertiary hover:text-gold-primary">
      {formatPhoneForDisplay(contact.secondaryPhone)}
    </a>
  </div>
)}
```

**Note:** `formatPhoneForDisplay` gracefully handles non-E.164 strings (returns them as-is), so historical data that hasn't been normalized still displays correctly.

---

### Task 9: Update sms.ts to use shared utility

**File:** `src/lib/notifications/sms.ts` (MODIFY)

Replace the redundant `formatPhoneE164()` and `isValidE164()` functions with imports from the shared module.

```typescript
import { normalizePhone } from '@/lib/phone';

// Replace formatPhoneE164() usage with normalizePhone()
// Replace isValidE164() with: normalizePhone(phone) !== null
```

Remove the `formatPhoneE164()` and `isValidE164()` function definitions (lines ~112-136) and update callers within the same file to use `normalizePhone()`.

---

## Files Changed Summary

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `src/lib/phone.ts` | CREATE | Shared phone utilities (`normalizePhone`, `formatPhoneForDisplay`, `normalizeContactPhones`) |
| 2 | `src/lib/m33t/phone-verification.ts` | MODIFY | Re-export phone functions from shared module, keep OTP functions |
| 3a | `src/app/api/contacts/route.ts` | MODIFY | Normalize phones + return specific error on create |
| 3b | `src/app/api/contacts/[id]/route.ts` | MODIFY | Normalize phones + return specific error on update |
| 4 | `src/components/contacts/ContactForm.tsx` | MODIFY | Add format-on-blur for phone inputs, handle validation errors |
| 5 | `src/app/api/contacts/import/csv/route.ts` | MODIFY | Normalize phones during CSV import |
| 6 | `src/lib/vcf-parser.ts` | MODIFY | Normalize phones during VCF parsing |
| 7 | `src/app/api/contacts/import/vcf/commit/route.ts` | MODIFY | Normalize during merge to deduplicate across formats |
| 8 | `src/components/contacts/ContactDetail.tsx` | MODIFY | Display formatted phone numbers |
| 9 | `src/lib/notifications/sms.ts` | MODIFY | Replace redundant functions with shared imports |

## Out of Scope

- No database migration of existing data (normalize going forward only)
- No international phone number UI (country picker)
- No phone-based duplicate detection across contacts
- No changes to the database schema
- No changes to `src/lib/validations/contact.ts` Zod schemas (normalization done in API routes to avoid `.partial()` incompatibility with Zod transform chains)
- No changes to ContactForm's client-side Zod schema (kept permissive for typing UX)
- No changes to HometownSuggestion or area-codes.ts (`extractAreaCode` already handles E.164 format correctly — strips non-digits, detects country code `1` prefix)
- No changes to RSVP respond API route (`src/app/api/rsvp/[token]/respond/route.ts`) — already works, could optionally switch from manual regex to shared `normalizePhone()` but not required

## Testing Strategy

1. **Manual: ContactForm** — Add/edit contact with various phone formats, verify format-on-blur and successful save
2. **Manual: CSV import** — Import CSV with mixed phone formats, verify E.164 storage
3. **Manual: VCF import** — Import VCF with multiple phone formats, verify normalization and conflict detection
4. **Manual: ContactDetail** — View contacts with E.164 phones, verify `(512) 555-1234` display
5. **Manual: Invalid phone** — Enter "call my office" in phone field, verify validation error on save
6. **Manual: Historical data** — View contacts with pre-existing raw phone values, verify they still display (graceful fallback)
