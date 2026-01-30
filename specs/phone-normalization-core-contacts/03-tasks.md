# Task Breakdown: Phone Number Normalization for Core Contacts

**Generated:** 2026-01-29
**Source:** specs/phone-normalization-core-contacts/02-spec.md
**Last Decompose:** 2026-01-29

---

## Overview

Apply M33T's proven phone normalization (`normalizePhone`, `formatPhoneForDisplay`) to all core contact phone capture points. 9 tasks across 3 phases.

## Phase 1: Foundation (Tasks 1.1-1.2)

### Task 1.1: Create shared phone utility module
**Size:** Small
**Priority:** High
**Dependencies:** None

Create `src/lib/phone.ts` with `normalizePhone()`, `formatPhoneForDisplay()`, and `normalizeContactPhones()` extracted from `src/lib/m33t/phone-verification.ts`.

**Files:** `src/lib/phone.ts` (NEW)

### Task 1.2: Update M33T phone-verification to re-export
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.1

Replace `normalizePhone` and `formatPhoneForDisplay` implementations in `src/lib/m33t/phone-verification.ts` with re-exports from `@/lib/phone`. Keep OTP functions and `maskPhone` in place.

**Files:** `src/lib/m33t/phone-verification.ts` (MODIFY)

---

## Phase 2: Server-Side Normalization (Tasks 2.1-2.5)

### Task 2.1: Normalize phones in contact create/update API routes
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.1

Add `normalizeContactPhones()` call in both API routes after Zod parse. Return specific `{ error: "Invalid phone number", details: [...] }` on invalid phones.

**Files:** `src/app/api/contacts/route.ts`, `src/app/api/contacts/[id]/route.ts` (MODIFY)

### Task 2.2: Normalize phones in CSV import
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.1

Add `normalizePhone()` calls after clean step. Invalid phones silently nulled (don't block bulk imports).

**Files:** `src/app/api/contacts/import/csv/route.ts` (MODIFY)

### Task 2.3: Normalize phones in VCF parser
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.1

Normalize in `extractPhones()` after dedup. Re-dedup after normalization. Keep raw value as fallback if normalization fails.

**Files:** `src/lib/vcf-parser.ts` (MODIFY)

### Task 2.4: Normalize phones in VCF commit merge logic
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 1.1

Normalize during phone collection in `mergeContactData()` so different formats of same number deduplicate correctly.

**Files:** `src/app/api/contacts/import/vcf/commit/route.ts` (MODIFY)

### Task 2.5: Update sms.ts to use shared utility
**Size:** Small
**Priority:** Low
**Dependencies:** Task 1.1

Replace redundant `formatPhoneE164()` and `isValidE164()` with imports from `@/lib/phone`.

**Files:** `src/lib/notifications/sms.ts` (MODIFY)

---

## Phase 3: Client-Side Display & UX (Tasks 3.1-3.2)

### Task 3.1: Add format-on-blur to ContactForm
**Size:** Medium
**Priority:** Medium
**Dependencies:** Task 2.1

Add `handlePhoneBlur` that formats valid phones to national format on blur. Handle `"Invalid phone number"` error from API on submit.

**Files:** `src/components/contacts/ContactForm.tsx` (MODIFY)

### Task 3.2: Format phone display in ContactDetail
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 1.1

Use `formatPhoneForDisplay()` for display text while keeping raw value in `tel:` href. Gracefully handles historical non-E.164 data.

**Files:** `src/components/contacts/ContactDetail.tsx` (MODIFY)

---

## Execution Strategy

**Parallel opportunities:**
- Tasks 2.1-2.5 can all run in parallel (all depend only on 1.1)
- Tasks 3.1 and 3.2 can run in parallel

**Critical path:** 1.1 → 1.2 + 2.1 → 3.1

**Total: 9 tasks (2 foundation, 5 server-side, 2 client-side)**
