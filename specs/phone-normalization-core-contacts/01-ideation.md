# Phone Number Normalization for Core Contacts

**Slug:** phone-normalization-core-contacts
**Author:** Claude Code
**Date:** 2026-01-29
**Branch:** preflight/phone-normalization-core-contacts
**Related:** M33T RSVP phone normalization (`src/lib/m33t/phone-verification.ts`)

---

## 1) Intent & Assumptions

- **Task brief:** Apply the phone number normalization system built for the M33T RSVP flow to all phone number capture points in the core Better Connections contact management system. Currently, core contacts store phone numbers as raw user input with no validation or normalization, while M33T already has a robust `normalizePhone()` / `formatPhoneForDisplay()` system using `libphonenumber-js`.
- **Assumptions:**
  - E.164 format (`+15125551234`) is the correct storage standard (matches M33T pattern)
  - US default country code is acceptable (user base is US-centric)
  - Existing phone data in the database may be in inconsistent formats and will need a migration
  - `libphonenumber-js` is already installed and used in the M33T flow
  - The `normalizePhone()` and `formatPhoneForDisplay()` functions in `src/lib/m33t/phone-verification.ts` are production-tested and can be reused
- **Out of scope:**
  - International phone number UI (country selector dropdown)
  - Phone number deduplication across contacts (finding contacts with same phone)
  - SMS/messaging features for core contacts
  - Changing the database schema (fields remain `String?`)

---

## 2) Pre-reading Log

- `src/lib/m33t/phone-verification.ts`: Production-ready `normalizePhone()` (E.164), `formatPhoneForDisplay()` (national), `maskPhone()` utilities using `libphonenumber-js`. These are the gold standard to reuse.
- `src/lib/m33t/index.ts`: Barrel export includes phone utilities. Currently namespaced under m33t.
- `src/lib/notifications/sms.ts`: Contains a separate `formatPhoneE164()` using regex (not libphonenumber-js). Redundant with `normalizePhone()`.
- `src/lib/validations/contact.ts`: Contact Zod schemas have `primaryPhone: z.string().max(50)` with NO format validation.
- `src/components/contacts/ContactForm.tsx`: Phone inputs are plain text with no onBlur formatting or validation feedback. Sends raw string to API.
- `src/app/api/contacts/route.ts`: Create contact API passes phone through unchanged.
- `src/app/api/contacts/[id]/route.ts`: Update contact API passes phone through unchanged.
- `src/app/api/contacts/import/csv/route.ts`: CSV import stores raw CSV values with no normalization.
- `src/lib/vcf-parser.ts`: VCF import extracts raw TEL values from vCards with phone type priority sorting but no format normalization.
- `src/app/api/contacts/import/vcf/commit/route.ts`: VCF commit stores raw parsed phone values.
- `src/components/contacts/ContactDetail.tsx`: Displays raw phone value in `tel:` links. E.164 would actually improve `tel:` link reliability.
- `src/components/contacts/HometownSuggestion.tsx`: Extracts area code from phone string. Needs to handle E.164 format as input.
- `src/lib/area-codes.ts`: 160 US area code mappings. Area code extraction logic may need to parse E.164.
- `src/components/m33t/RSVPForm.tsx`: Reference implementation of client-side phone validation with live formatting feedback.

---

## 3) Codebase Map

- **Primary components/modules:**
  - `src/components/contacts/ContactForm.tsx` — Add/edit contact form (phone input UI)
  - `src/lib/validations/contact.ts` — Zod schemas for contact create/update
  - `src/app/api/contacts/route.ts` — Create contact API
  - `src/app/api/contacts/[id]/route.ts` — Update contact API
  - `src/app/api/contacts/import/csv/route.ts` — CSV import API
  - `src/lib/vcf-parser.ts` — VCF file parser
  - `src/app/api/contacts/import/vcf/commit/route.ts` — VCF import commit API
  - `src/components/contacts/ContactDetail.tsx` — Contact detail display

- **Shared dependencies:**
  - `src/lib/m33t/phone-verification.ts` — Existing phone utilities (to be promoted to shared)
  - `src/lib/notifications/sms.ts` — Has redundant `formatPhoneE164()` (to be replaced)
  - `libphonenumber-js` — Already installed, used in M33T flow
  - `src/components/contacts/HometownSuggestion.tsx` — Reads phone for area code lookup

- **Data flow:**
  - Manual entry: `ContactForm` → `POST/PUT /api/contacts` → Prisma → DB
  - CSV import: CSV file → `POST /api/contacts/import/csv` → Prisma → DB
  - VCF import: VCF file → `vcf-parser.ts` → analysis API → commit API → Prisma → DB
  - Display: DB → Prisma → `ContactDetail.tsx` → raw string rendered

- **Feature flags/config:** None

- **Potential blast radius:**
  - ContactForm phone inputs (UI behavior changes with formatting)
  - HometownSuggestion area code extraction (must handle E.164 input)
  - ContactDetail tel: links (will now use E.164, which is actually better)
  - VCF conflict detection (string comparison of phones — normalization would fix false conflicts)
  - Existing database phone values (need one-time migration)
  - Export functionality (passes through DB values — will now export E.164)

---

## 4) Root Cause Analysis

N/A — This is a feature enhancement, not a bug fix.

---

## 5) Research

### Potential Solutions

**Solution 1: Shared phone utility + server-side normalization only**

Promote `normalizePhone()` / `formatPhoneForDisplay()` to a shared location (`src/lib/phone.ts`), then normalize in all API routes before writing to DB. No client-side changes.

- **Pros:** Minimal UI changes, server is the single source of truth, simple to implement
- **Cons:** No user feedback when they enter an invalid number, phone appears raw in form until saved and reloaded

**Solution 2: Server-side normalization + client-side display formatting**

Same as Solution 1, but also format phone numbers for display in `ContactDetail.tsx` and format on blur in `ContactForm.tsx`.

- **Pros:** Good UX — user sees formatted number after typing, display is clean, server ensures correctness
- **Cons:** Slightly more work on the client side, but uses patterns already proven in RSVPForm

**Solution 3: Full client + server normalization with validation feedback**

Full RSVPForm-style experience: live validation indicator on phone fields, format-on-blur, server-side normalization as safety net, display formatting everywhere.

- **Pros:** Best UX, matches M33T quality, catches invalid numbers immediately
- **Cons:** Most implementation effort, adds complexity to ContactForm which is already large

### Recommendation

**Solution 2** strikes the right balance. Server-side normalization is the critical piece (ensures data consistency regardless of entry path — form, CSV, VCF, API). Client-side formatting on blur gives nice UX feedback without the complexity of live validation indicators. The key changes:

1. **Promote phone utilities** from `src/lib/m33t/phone-verification.ts` to `src/lib/phone.ts` (shared)
2. **Server-side normalization** in all write APIs (create, update, CSV import, VCF commit)
3. **Client-side format-on-blur** in ContactForm phone inputs
4. **Display formatting** in ContactDetail using `formatPhoneForDisplay()`
5. **One-time data migration** to normalize existing phone values
6. **Update HometownSuggestion** to handle E.164 input for area code extraction

---

## 6) Clarification

1. **Data migration approach:** Should we run a one-time migration script to normalize all existing phone numbers in the database to E.164? Or only normalize going forward (new entries/edits)? A migration ensures consistency but could surface invalid historical data.

2. **Invalid phone handling:** If a user enters an un-parseable phone number (e.g., "call my office"), should we:
   - (a) Reject it with a validation error (stricter, cleaner data)
   - (b) Store it as-is but log a warning (more permissive, no data loss)
   - (c) Store it as-is with no warning (current behavior, least disruptive)

3. **Export format:** When contacts are exported, should phone numbers be in E.164 (`+15125551234`) or national display format (`(512) 555-1234`)? E.164 is more portable; national is more readable.

4. **Secondary phone in VCF conflicts:** Currently VCF conflict detection uses exact string comparison (`"(512) 555-1234" !== "+15125551234"`). Normalizing both sides would eliminate false conflicts. Should we apply this to the conflict detection logic too?

---

## Files Affected (Implementation Inventory)

| # | File | Change Type | Description |
|---|------|-------------|-------------|
| 1 | `src/lib/phone.ts` | **NEW** | Shared phone utilities (extracted from m33t) |
| 2 | `src/lib/m33t/phone-verification.ts` | MODIFY | Re-export from shared, keep OTP-specific code |
| 3 | `src/lib/m33t/index.ts` | MODIFY | Update barrel exports |
| 4 | `src/lib/notifications/sms.ts` | MODIFY | Replace `formatPhoneE164()` with shared `normalizePhone()` |
| 5 | `src/lib/validations/contact.ts` | MODIFY | Add optional phone format validation to Zod schema |
| 6 | `src/components/contacts/ContactForm.tsx` | MODIFY | Add format-on-blur for phone inputs |
| 7 | `src/app/api/contacts/route.ts` | MODIFY | Normalize phones before create |
| 8 | `src/app/api/contacts/[id]/route.ts` | MODIFY | Normalize phones before update |
| 9 | `src/app/api/contacts/import/csv/route.ts` | MODIFY | Normalize phones during CSV import |
| 10 | `src/app/api/contacts/import/vcf/commit/route.ts` | MODIFY | Normalize phones during VCF commit |
| 11 | `src/lib/vcf-parser.ts` | MODIFY | Normalize phones during VCF parsing |
| 12 | `src/components/contacts/ContactDetail.tsx` | MODIFY | Use `formatPhoneForDisplay()` for display |
| 13 | `src/components/contacts/HometownSuggestion.tsx` | MODIFY | Handle E.164 input for area code extraction |
| 14 | Migration script | **NEW** | One-time normalization of existing DB phone data |
