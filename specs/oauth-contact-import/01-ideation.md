# OAuth Contact Import - Transform Import Experience

**Slug:** oauth-contact-import
**Author:** Claude Code
**Date:** 2026-01-06
**Branch:** preflight/oauth-contact-import
**Related:** VCF import flow, CSV import flow

---

## 1) Intent & Assumptions

**Task brief:** Transform the import experience from manual file downloads (VCF/CSV) to OAuth-based direct import. Users should be able to authenticate with Google, Microsoft/Outlook, Apple iCloud, and LinkedIn, then import contacts directly from those platforms without leaving the app.

**Assumptions:**
- Users prefer one-click OAuth flow over manual file export/import
- OAuth scopes exist for reading contacts from major providers
- Supabase Auth can be extended with additional OAuth providers
- We can store connected account status in the User model
- Duplicate detection logic from VCF import can be reused

**Out of scope:**
- Bi-directional sync (writing back to providers) - read-only for V1
- Incremental/background sync - one-time import only
- LinkedIn connections (API not publicly accessible)
- Contact photo import
- Calendar/email integration

---

## 2) Pre-reading Log

- `src/app/(dashboard)/contacts/import/page.tsx`: Current import page with source selection (iCloud VCF, Google CSV). Uses `ImportSourceCard` for options. CSV has multi-step mapping flow.
- `src/components/import/VcfImportFlow.tsx`: Multi-step VCF import wizard with duplicate detection and merge review. Pattern to follow.
- `src/components/import/ImportSourceCard.tsx`: Reusable card component for import source selection.
- `src/app/api/contacts/import/vcf/route.ts`: VCF upload analysis with duplicate detection (email + name matching).
- `src/app/api/contacts/import/vcf/commit/route.ts`: Commit import with per-field conflict resolution.
- `prisma/schema.prisma`: User model lacks `*Connected` boolean fields. Has `ContactSource` enum with GOOGLE, LINKEDIN, ICLOUD, OUTLOOK values already.
- `src/lib/auth.ts`: Basic email/password auth via Supabase. No OAuth helpers yet.
- `src/app/auth/callback/route.ts`: Minimal OAuth callback - just exchanges code for session.
- `CLAUDE.md`: Documents planned but unimplemented OAuth fields on User model.

---

## 3) Codebase Map

**Primary components/modules:**
- `src/app/(dashboard)/contacts/import/page.tsx` - Import page container, source selection
- `src/components/import/VcfImportFlow.tsx` - VCF import state machine
- `src/components/import/ImportMergeReview.tsx` - Duplicate conflict resolution UI
- `src/components/import/ImportSourceCard.tsx` - Source selection card
- `src/lib/vcf-parser.ts` - VCF parsing utilities
- `src/app/api/contacts/import/vcf/*` - VCF import API routes

**Shared dependencies:**
- `@/lib/utils` - cn() for class merging
- `@/hooks/use-toast` - Toast notifications
- `@/components/ui/*` - shadcn/ui components
- `prisma` - Database ORM
- `supabase` - Auth provider

**Data flow:**
```
ImportSourceCard (select)
  → OAuth redirect (Google/Microsoft)
  → Provider consent screen
  → Callback with code
  → Exchange for token
  → Fetch contacts via API
  → Duplicate detection
  → Merge review UI
  → Commit to database
```

**Feature flags/config:**
- None currently
- Would need: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`

**Potential blast radius:**
- Import page UI (major restructure)
- User model (add connected account fields)
- Settings page (add "Connected Accounts" section)
- Auth callback route (handle multiple OAuth providers)
- New API routes for Google/Microsoft contact fetch

---

## 4) Root Cause Analysis

N/A - This is a new feature, not a bug fix.

---

## 5) Research

### Provider Feasibility Summary

| Provider | OAuth Available | API Access | Verification | Complexity | V1 Recommendation |
|----------|----------------|------------|--------------|------------|-------------------|
| **Google** | Yes | People API | Required (3-5 days) | Medium | YES - Phase 2 |
| **Microsoft** | Yes | Graph API | None | Easy | YES - Phase 1 |
| **Apple iCloud** | NO | CardDAV only | N/A | Hard (UX friction) | DEFER to V2 |
| **LinkedIn** | Partner-only | Restricted | Partnership | N/A | SKIP entirely |

### Detailed Findings

#### Google People API (FEASIBLE - Medium)
- **Scope:** `https://www.googleapis.com/auth/contacts.readonly`
- **Endpoint:** `GET /v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,organizations,addresses`
- **Response:** JSON with `connections[]` array containing structured contact data
- **Verification required:** Yes - 3-5 business days for sensitive scopes
- **User cap before verification:** 100 users (lifetime)
- **Privacy policy requirement:** Must be prominently linked from homepage
- **Pros:** Large user base, well-documented, incremental sync support
- **Cons:** Verification delay, 100-user dev cap, privacy policy overhead

#### Microsoft Graph API (FEASIBLE - Easy)
- **Scope:** `Contacts.Read`
- **Endpoint:** `GET /me/contacts` with OData query support
- **Response:** JSON with `value[]` array containing contact objects
- **Verification required:** No - immediate access
- **Pros:** No verification, excellent docs, OData filtering, works with personal + business accounts
- **Cons:** Only works for Microsoft/Outlook users

#### Apple iCloud (NOT RECOMMENDED for V1)
- **No OAuth API** - uses CardDAV protocol with app-specific passwords
- User must manually generate password at appleid.apple.com
- No granular permissions (password = full iCloud access)
- **Major UX friction:** Multi-step manual process, security concerns
- **Recommendation:** Keep existing VCF file upload for iCloud users

#### LinkedIn (NOT POSSIBLE)
- API restricted to LinkedIn Partners only since 2015
- Connection data not accessible to third-party apps
- ToS explicitly prohibits connection scraping
- **Recommendation:** Skip entirely

### Potential Solutions

**Solution 1: Full OAuth Integration (Google + Microsoft)**
- Add Google and Microsoft OAuth providers to Supabase
- Create unified OAuth flow component
- Build provider-specific contact adapters
- Reuse existing duplicate detection from VCF import
- **Pros:** Best UX, one-click import
- **Cons:** Google verification delay, more complex auth setup

**Solution 2: Microsoft Only (Quick Win)**
- Implement Microsoft Graph OAuth first
- Defer Google until verification complete
- Keep file upload for iCloud/Google users
- **Pros:** Fast to ship, no verification wait
- **Cons:** Limited reach (Outlook users only)

**Solution 3: Hybrid Approach (Recommended)**
- Phase 1: Microsoft OAuth (immediate)
- Phase 2: Google OAuth (after verification)
- Keep file upload as fallback
- Transform import page to encourage OAuth connection
- **Pros:** Quick win + long-term value, graceful degradation
- **Cons:** More development phases

### Recommendation

**Implement Solution 3 (Hybrid Approach):**

1. **Week 1:** Microsoft Graph OAuth integration
   - Create Azure AD app registration
   - Add `microsoftConnected` field to User model
   - Build OAuth flow + contact import
   - Reuse VcfImportFlow pattern for duplicate review

2. **Week 2:** Google People API integration (parallel with verification)
   - Create Google Cloud project
   - Add `googleConnected` field to User model
   - Build OAuth flow + contact import
   - Submit for app verification
   - Launch after verification approved (~3-5 days)

3. **Keep file upload for:**
   - iCloud users (VCF export)
   - Google users (CSV export) - until OAuth approved
   - Fallback for OAuth failures

---

## 6) Clarification

**Decisions needed from user:**

1. **Privacy Policy:** Google OAuth requires a privacy policy page. Do we have one, or should we create one?

2. **Domain Verification:** Google requires domain verification via Search Console. Is the production domain verified?

3. **Account Linking vs. Import Auth:**
   - Option A: Store OAuth tokens for future re-imports (requires refresh token management)
   - Option B: One-time OAuth for import only (simpler, no token storage)
   - Recommendation: Option A allows "Sync" feature later

4. **Settings Page Integration:** Should connected accounts be managed in Settings, or keep import page self-contained?

5. **Duplicate Handling:** Use existing VCF merge review UI, or streamline for OAuth imports?

6. **iCloud Strategy:**
   - Option A: Keep file upload only (current)
   - Option B: Add CardDAV with app-specific password flow (complex UX)
   - Recommendation: Option A for V1

---

## 7) Proposed UX Flow

### Transformed Import Page

```
┌─────────────────────────────────────────────────────────┐
│  Import Contacts                                        │
│  Connect your accounts for one-click import             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │  [Google Logo]  │  │ [Microsoft Logo]│              │
│  │                 │  │                 │              │
│  │  Google         │  │  Microsoft      │              │
│  │  Contacts       │  │  Outlook        │              │
│  │                 │  │                 │              │
│  │  [Connect]      │  │  [Connect]      │              │
│  │      or         │  │      or         │              │
│  │  ● Connected    │  │  [Import Now]   │              │
│  │  [Import Now]   │  │                 │              │
│  └─────────────────┘  └─────────────────┘              │
│                                                         │
│  ─────────────── or import from file ───────────────   │
│                                                         │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │  [iCloud Logo]  │  │  [CSV Icon]     │              │
│  │                 │  │                 │              │
│  │  iCloud         │  │  CSV File       │              │
│  │  Export .vcf    │  │  Upload         │              │
│  │                 │  │                 │              │
│  │  [Instructions] │  │  [Upload]       │              │
│  └─────────────────┘  └─────────────────┘              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Connected State in Settings

```
┌─────────────────────────────────────────────────────────┐
│  Connected Accounts                                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Google Contacts                                        │
│  ● Connected as john@gmail.com                          │
│  Last imported: 5 days ago (142 contacts)               │
│  [Re-import] [Disconnect]                               │
│                                                         │
│  Microsoft Outlook                                      │
│  ○ Not connected                                        │
│  [Connect]                                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 8) Technical Implementation Notes

### Database Schema Changes

```prisma
model User {
  // ... existing fields

  // Connected accounts
  googleConnected       Boolean   @default(false)
  googleEmail           String?
  googleRefreshToken    String?   // Encrypted
  googleLastImportAt    DateTime?
  googleLastImportCount Int?

  microsoftConnected       Boolean   @default(false)
  microsoftEmail           String?
  microsoftRefreshToken    String?   // Encrypted
  microsoftLastImportAt    DateTime?
  microsoftLastImportCount Int?
}
```

### New API Routes

```
POST /api/auth/google/connect     - Initiate Google OAuth
GET  /api/auth/google/callback    - Handle Google OAuth callback
POST /api/contacts/import/google  - Fetch & import Google contacts
POST /api/auth/google/disconnect  - Remove Google connection

POST /api/auth/microsoft/connect     - Initiate Microsoft OAuth
GET  /api/auth/microsoft/callback    - Handle Microsoft OAuth callback
POST /api/contacts/import/microsoft  - Fetch & import Microsoft contacts
POST /api/auth/microsoft/disconnect  - Remove Microsoft connection
```

### Environment Variables

```bash
# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Microsoft OAuth
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=common  # or specific tenant

# Token encryption
TOKEN_ENCRYPTION_KEY=  # For encrypting refresh tokens at rest
```

### Contact Field Mapping

**Google People API → Contact Model:**
```typescript
{
  firstName: person.names?.[0]?.givenName,
  lastName: person.names?.[0]?.familyName,
  primaryEmail: person.emailAddresses?.[0]?.value,
  secondaryEmail: person.emailAddresses?.[1]?.value,
  primaryPhone: person.phoneNumbers?.[0]?.value,
  title: person.organizations?.[0]?.title,
  company: person.organizations?.[0]?.name,
  location: formatAddress(person.addresses?.[0]),
  linkedinUrl: findLinkedInUrl(person.urls),
  source: 'GOOGLE',
}
```

**Microsoft Graph → Contact Model:**
```typescript
{
  firstName: contact.givenName,
  lastName: contact.surname,
  primaryEmail: contact.emailAddresses?.[0]?.address,
  secondaryEmail: contact.emailAddresses?.[1]?.address,
  primaryPhone: contact.mobilePhone || contact.businessPhones?.[0],
  title: contact.jobTitle,
  company: contact.companyName,
  location: formatAddress(contact.homeAddress || contact.businessAddress),
  source: 'OUTLOOK',
}
```

---

## 9) Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Google verification rejected | Low | High | Prepare thorough privacy policy, clear data usage description |
| Google verification delayed | Medium | Medium | Ship Microsoft first, file upload fallback |
| Rate limiting during bulk import | Medium | Low | Implement pagination, respect rate limits |
| Token refresh failures | Low | Medium | Clear error messages, prompt re-auth |
| User confusion with OAuth permissions | Medium | Low | Clear consent explanation UI |
| Security concerns about token storage | Low | High | Encrypt tokens at rest, use secure storage |

---

## 10) Success Metrics

- **Adoption:** 50%+ of new imports use OAuth (vs file upload)
- **Completion:** 90%+ OAuth import completion rate
- **Speed:** Average import time < 30 seconds for 100 contacts
- **Errors:** < 5% OAuth error rate
- **Satisfaction:** Reduced support tickets about import issues

---

## 11) Next Steps (Pending User Decisions)

1. Confirm privacy policy exists or create one
2. Confirm domain verification status
3. Decide on token storage strategy (persistent vs one-time)
4. Decide on Settings page integration
5. Create Azure AD app registration (Microsoft)
6. Create Google Cloud project + OAuth consent screen
7. Begin Phase 1 implementation (Microsoft OAuth)
