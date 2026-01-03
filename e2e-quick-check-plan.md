# E2E Quick Check Plan: Core Feature Validation

**Purpose:** High-level verification that 4 major feature areas work correctly using ephemeral tests
**Approach:** Quick-check-expert pattern (tests auto-delete after execution)
**Scope:** Happy path validation only - not comprehensive edge case testing

---

## Prerequisites

### 1. Install Playwright

```bash
npm install -D @playwright/test
npx playwright install chromium
```

### 2. Create Test User

**Option A: Via Supabase Dashboard**
1. Go to Supabase Dashboard → Authentication → Users
2. Create user: `e2e-test@betterconnections.dev` / `TestPassword123!`
3. Note the user UUID for reference

**Option B: Via SQL (faster)**
```sql
-- Run in Supabase SQL Editor
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  'e2e-test@betterconnections.dev',
  crypt('TestPassword123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"E2E Test User"}',
  'authenticated',
  'authenticated'
);
```

### 3. Create Quick-Checks Infrastructure

```bash
mkdir -p .quick-checks/results
echo -e "\n# Quick checks (ephemeral tests)\n.quick-checks/" >> .gitignore
```

### 4. Create Playwright Config

**File:** `.quick-checks/playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './',
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:3003',
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], headless: false },
    },
  ],
});
```

### 5. Create Auth Helper

**File:** `.quick-checks/auth-helper.ts`

```typescript
import { Page } from '@playwright/test';

const TEST_USER = {
  email: 'e2e-test@betterconnections.dev',
  password: 'TestPassword123!',
};

export async function loginViaUI(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(TEST_USER.email);
  await page.getByLabel('Password').fill(TEST_USER.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('/contacts');
}

export async function loginViaAPI(page: Page) {
  // Programmatic login via Supabase REST API
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey!,
    },
    body: JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password,
    }),
  });

  const session = await response.json();

  // Inject session into browser localStorage
  await page.goto('/');
  await page.evaluate((sessionData) => {
    localStorage.setItem(
      `sb-${new URL(sessionData.url).hostname.split('.')[0]}-auth-token`,
      JSON.stringify(sessionData.session)
    );
  }, { url: supabaseUrl, session });

  await page.reload();
}
```

---

## Test Plan Overview

| # | Feature Area | Test File | What We're Verifying |
|---|--------------|-----------|---------------------|
| 1 | VCF Import | `test-vcf-import.spec.ts` | Upload VCF → contacts created with correct source |
| 2 | Mentioned Contacts | `test-mentioned-contacts.spec.ts` | Enrichment notes → people extracted and matched |
| 3 | Completion Gamification | `test-gamification.spec.ts` | Enrichment → score increases → celebration shows |
| 4 | Navigation & Discovery | `test-navigation.spec.ts` | Alphabet slider filters + hometown suggestion appears |

**Skipped:** Voice Enrichment (requires Web Speech API mocking)

---

## Test 1: VCF Import

**File:** `.quick-checks/test-vcf-import.spec.ts`

**Test Data:** 3-contact VCF inline in test file

```
BEGIN:VCARD
VERSION:3.0
N:Smith;John;;;
FN:John Smith
EMAIL;TYPE=INTERNET:john.smith@example.com
TEL;TYPE=CELL:+1-415-555-1234
END:VCARD
BEGIN:VCARD
VERSION:3.0
N:Johnson;Sarah;;;
FN:Sarah Johnson
EMAIL;TYPE=INTERNET:sarah.j@example.com
TEL;TYPE=CELL:+1-212-555-5678
END:VCARD
BEGIN:VCARD
VERSION:3.0
N:Williams;Mike;;;
FN:Mike Williams
EMAIL;TYPE=INTERNET:mike.w@example.com
END:VCARD
```

**Steps:**
1. Login
2. Navigate to `/contacts/import`
3. Click "iCloud Contacts" import option
4. Upload VCF file (create Blob from string)
5. Verify 3 contacts detected
6. Click "Import All"
7. Verify success message
8. Navigate to `/contacts`
9. Verify 3 new contacts visible with `source: ICLOUD`

**Success Criteria:**
- All 3 contacts imported
- Names, emails, phones correctly parsed
- Source shows as iCloud

---

## Test 2: Mentioned Contacts

**File:** `.quick-checks/test-mentioned-contacts.spec.ts`

**Prerequisites:** At least 2 contacts exist (one to enrich, one to match against)

**Setup Data:**
- Contact A: "Alice Anderson" (to be enriched)
- Contact B: "Bob Builder" (to be mentioned and matched)

**Steps:**
1. Login
2. Create Contact B ("Bob Builder") via `/contacts/new` if not exists
3. Navigate to `/enrichment`
4. Select Contact A for enrichment
5. In "How We Met" field, type: "Met through Bob Builder at the tech conference"
6. In "Why Now" field, type: "Bob mentioned she's raising a Series A"
7. Save enrichment
8. Verify completion celebration appears
9. Verify "Mentioned People" section shows "Bob Builder"
10. Verify "Bob Builder" shows as "Matched" to existing contact

**Success Criteria:**
- AI extracts "Bob Builder" from notes
- Fuzzy matching finds existing contact
- UI shows matched contact with link

---

## Test 3: Completion Gamification

**File:** `.quick-checks/test-gamification.spec.ts`

**Prerequisites:** At least 1 contact with low enrichment score exists

**Steps:**
1. Login
2. Create a minimal contact (first name only, score ~10)
3. Navigate to `/enrichment`
4. Select the contact
5. Fill in multiple fields:
   - Title: "CEO"
   - Company: "Acme Corp"
   - How We Met: "Met at a conference"
   - Why Now: "Looking to partner on AI project"
6. Save enrichment
7. Verify completion celebration modal appears
8. Verify score improvement bar shows increase (e.g., 10 → 65)
9. Verify rank badge shows (e.g., "Building Depth")
10. Close celebration
11. Verify contact now shows higher enrichment score in queue

**Success Criteria:**
- Score increases after adding fields
- Celebration UI displays with animation
- Correct rank tier shown based on new score

---

## Test 4: Navigation & Discovery

**File:** `.quick-checks/test-navigation.spec.ts`

**Prerequisites:** Multiple contacts with different first name letters

**Setup Data:**
- Create contacts: "Alice A", "Bob B", "Charlie C", "David D"

**Part A: Alphabet Slider**
1. Login
2. Navigate to `/enrichment`
3. Verify alphabet slider visible on right edge (desktop only)
4. Click letter "B"
5. Verify only "Bob B" contact visible
6. Click letter "C"
7. Verify only "Charlie C" visible
8. Click "All" button
9. Verify all contacts visible again

**Part B: Hometown Suggestion**
1. Navigate to `/contacts/new`
2. Enter first name: "Test Contact"
3. Enter phone: "+1-415-555-0000"
4. Verify hometown suggestion appears: "San Francisco, CA"
5. Leave location field empty
6. Verify suggestion shows "Based on area code (415)"
7. Click "Use This"
8. Verify location field now contains "San Francisco, CA"

**Success Criteria:**
- Alphabet slider filters contacts correctly
- Area code 415 suggests San Francisco
- "Use This" populates location field

---

## Execution Workflow

### Run Tests

```bash
# Ensure dev server is running on port 3003
PORT=3003 npm run dev

# Run individual tests (in separate terminal)
cd .quick-checks

# Test 1: VCF Import
npx playwright test test-vcf-import.spec.ts --headed

# Test 2: Mentioned Contacts
npx playwright test test-mentioned-contacts.spec.ts --headed

# Test 3: Gamification
npx playwright test test-gamification.spec.ts --headed

# Test 4: Navigation
npx playwright test test-navigation.spec.ts --headed
```

### After Each Test

Tests auto-cleanup per quick-check-expert protocol:
```bash
rm -f .quick-checks/test-*.spec.ts
rm -rf .quick-checks/results/*
```

---

## Test Data Cleanup (Optional)

If you want to clean up test data after verification:

```sql
-- Delete test user's contacts (preserves user for future tests)
DELETE FROM "Contact" WHERE "userId" = (
  SELECT id FROM auth.users WHERE email = 'e2e-test@betterconnections.dev'
);
```

Or delete everything including test user:
```sql
DELETE FROM auth.users WHERE email = 'e2e-test@betterconnections.dev';
```

---

## Expected Results Summary

| Test | Expected Outcome |
|------|------------------|
| VCF Import | 3 contacts imported with iCloud source |
| Mentioned Contacts | "Bob Builder" extracted and matched |
| Gamification | Score increases, celebration shows with correct rank |
| Navigation | Alphabet filters work, 415 suggests SF |

---

## Notes

- **Voice enrichment skipped** - Would require Web Speech API mocking
- **Test isolation** - All data tied to test user, won't affect production data
- **Ephemeral tests** - Following quick-check-expert pattern, tests deleted after execution
- **Headed mode** - Tests run with visible browser for manual observation
- **No CI/CD** - These are local verification tests only
