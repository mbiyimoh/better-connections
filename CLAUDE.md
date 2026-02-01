# Better Connections - Claude Code Project Documentation

## Overview

**Better Connections** is a single-user personal CRM / contact enrichment tool. Core insight: most contact management is "flat" (names/emails) while relationships need rich context about *why* someone matters *right now*.

**Tagline:** *Your contacts are flat. Give them some depth.*
**Target User:** Founders, investors, networkers (100-500+ contacts), tech-literate but not engineers.
**Core UX:** Gamified 30-second voice-first enrichment sessions, chat-first exploration (natural language).

---

## Working with This User

**User Profile:** Technically literate product owner, NOT an engineer. Claude handles 100% of technical operations.

**Critical Rules:**
- NEVER ask user to run CLI commands - execute directly via Bash
- NEVER ask user to check database - use Prisma CLI or SQL
- Run ALL commands proactively (npm, git, docker, prisma, etc.)
- Handle errors autonomously; only escalate when user input truly needed

---

## Dev Server Configuration

**Port: 3333** (port 3001 reserved for another project)

```bash
# Start
PORT=3333 npm run dev

# Restart (CRITICAL - port-specific kill only)
lsof -ti:3333 | xargs kill -9 2>/dev/null || true
rm -rf .next
PORT=3333 npm run dev

# NEVER use: pkill -f "next dev" or killall node (kills other apps)
```

**Prisma Studio:** port 5555

**ABSOLUTE PROHIBITIONS (require EXPLICIT approval):**
- NEVER reset/modify passwords, credentials, auth tokens, or sessions
- NEVER delete user accounts or data
- NEVER send emails on behalf of users
- NEVER access/modify billing or third-party service configs (Supabase, Stripe, etc.)
- Auth issues: DIAGNOSE and RECOMMEND only, never fix credentials

---

## Design System (33 Strategies Brand)

### Colors
```javascript
const colors = {
  bg: { primary: '#0D0D0F', secondary: '#1A1A1F', tertiary: '#252529', glass: 'rgba(26, 26, 31, 0.85)' },
  text: { primary: '#FFFFFF', secondary: '#A0A0A8', tertiary: '#606068' },
  gold: { primary: '#d4a54a', light: '#e5c766', subtle: 'rgba(212, 165, 74, 0.15)' },
  category: { relationship: '#3B82F6', opportunity: '#22C55E', expertise: '#A855F7', interest: '#F59E0B' },
  border: 'rgba(255, 255, 255, 0.08)',
  success: '#4ADE80', error: '#EF4444', warning: '#FBBF24',
};
```

### Typography & Spacing
- **Font:** -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- **Sizes:** H1: 32px/700, H2: 24px/600, H3: 18px/600, Body: 14px/400, Small: 13px/400, Caption: 11px/600/uppercase
- **Spacing:** 4, 8, 12, 16, 24, 32, 48, 64px
- **Border Radius:** Small: 6px, Medium: 8px, Large: 12px, Cards: 16px

### Key Patterns
- **Dark theme** mandatory, **gold accent (#d4a54a)** primary brand color
- **Glassmorphism** - backdrop-blur with rgba backgrounds
- **No emojis** - use Lucide React icons
- **Framer Motion** for all animations

### Color Standardization

Use Tailwind tokens: `text-gold-primary`, `bg-gold-primary`, `hover:bg-gold-light`, `bg-gold-subtle`

JS constants: `import { BRAND_GOLD } from '@/lib/design-system'` (use hex directly only for gradients/SVGs)

**Files:** `tailwind.config.ts`, `src/lib/design-system.ts`, `src/app/globals.css`

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14+ (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, Lucide React |
| Backend | Next.js API routes, Supabase PostgreSQL, Prisma ORM, Supabase Auth |
| AI | OpenAI GPT-4o-mini via Vercel AI SDK |
| Special | react-speech-recognition, react-resizable-panels, react-countdown-circle-timer, vcard4-ts, react-window v2.2.3, use-debounce, @tailwindcss/typography, diff, react-markdown |

---

## Agent Protocols & Patterns

### Contact Research & Apply Workflow

**Purpose:** Web research to enrich contact profiles with verified, sourced information.

**Files:** `src/components/research/` (UI), `src/app/api/contacts/[id]/research/` (API), `src/lib/research/types.ts` (types incl. `RESEARCH_FIELD_LABELS`)

**Flow:** Research button → AI web search → structured recommendations → user reviews/edits/approves → Apply → celebration (score improvement, rank change, changes list) → collapses into history

**Critical Patterns:**
- Store loading state as `{id, action}` object (not boolean) for per-item async loading in multi-item lists
- After `router.refresh()`, client state persists -- use `useEffect` with `JSON.stringify` deps to reset
- **ALWAYS** call `router.refresh()` after applying recommendations
- Celebration must be dismissed manually (no auto-dismiss)
- History auto-collapses tiles when `appliedAt` is set

---

### Contact Deep Research

**Purpose:** AI-powered web research via Tavily API + GPT-4o synthesis for profile enrichment.

**Files:** `src/lib/research/` (orchestrator, prompts, schemas, types), `src/components/research/` (UI), `src/app/api/contacts/[id]/research/` (API)

**Key Types:**
- `ContactContext`: firstName, lastName, primaryEmail, title, organizationalTitle, company, location, linkedinUrl, expertise, interests, whyNow, notes
- `FocusArea`: 'professional' | 'expertise' | 'interests' | 'news'
- `GeneratedRecommendation`: fieldName, action (ADD|UPDATE), proposedValue, confidence, sourceUrls

**Title vs OrganizationalTitle:**
- `title` = Job Role: "Venture Capitalist", "Software Engineer"
- `organizationalTitle` = Position in org: "President", "VP of Engineering"

**Gotchas:**
- Confidence threshold: 0.5 (`MIN_CONFIDENCE_THRESHOLD` in orchestrator.ts)
- Duplicate filtering: skip if current value contains proposed value (case-insensitive)
- ReactMarkdown: wrap in div with `prose prose-invert prose-sm max-w-none` (doesn't accept className)
- Notes recommendations: bullet-point format, sections with `## Headers` if >6 bullets
- Apply route must include `organizationalTitle` in allowed fields `Pick<>`
- Inline diff uses `diffWords` from `diff` package

---

### What's New Update Notifications

**Files:** `src/lib/updates/`, `src/components/whats-new/`, `updates/*.md`, `src/app/api/user/seen-update/route.ts`

**Creating updates:** `/create-product-update <description>`

**File format:** Frontmatter with `version` (ISO date), `title`, `published`. Body has `## Summary` (bullets) and `## Details` (h3 per feature). Summary titles MUST match Details h3 headings.

**Tracking:** Hybrid localStorage (instant) + database (cross-device). Version comparison is lexicographic (ISO dates).

---

### VCF Import

**Files:** `src/lib/vcf-parser.ts`, `src/app/api/contacts/import/vcf/` (route + commit), `src/components/import/VcfImportFlow.tsx`, `ImportMergeReview.tsx`

**Gotchas:**
- vcard4-ts: use named properties (`vcard.N.value.familyNames?.[0]`, NOT `vcard.N.value[0]`)
- Hooks must come before conditional returns in modals
- Case-insensitive email matching: `{ equals: email, mode: 'insensitive' }`
- Phone priority: cell > mobile > work > home
- Bulk actions: skip, merge (fill empty), replace-empty, replace-all

---

### Voice Enrichment

**Files:** `src/app/(dashboard)/enrichment/session/page.tsx`, `src/app/api/enrichment/extract/route.ts`, `src/lib/schemas/enrichmentInsight.ts`

**Gotchas:** Chrome needs HTTPS (localhost OK). Safari needs permission. AI cleans noisy transcripts.

---

### Enrichment Completion Gamification

**Files:** `src/components/enrichment/completion/` (CompletionCelebration, RankCelebration, useCelebrationSounds, BubbleTagSuggestions, TagEditModal)

**Ranks:** 0-25 Getting Started, 26-50 Building Depth, 51-75 Well Connected, 76-100 Fully Enriched

**Gotchas:**
- Category case: Bubbles use lowercase ('relationship'), Tags use UPPERCASE ('RELATIONSHIP')
- Guard `addSelectedTags` with `|| isAdding` to prevent race conditions from rapid clicks

---

### Contact Details Gamification & AI Tag Suggestions

**Files:** `src/components/contacts/EnrichmentScoreCard.tsx`, `TagsSection.tsx`, `ContactDetail.tsx`, `src/app/api/contacts/[id]/ranking/route.ts`, `src/app/api/contacts/[id]/suggest-tags/route.ts`

**AI suggestions require:** 3+ fields filled OR whyNow OR notes OR (expertise AND interests).

**CRITICAL:** Import `TAG_CATEGORY_COLORS` from `@/lib/design-system` -- never duplicate locally. TagCategory uses UPPERCASE. Call `router.refresh()` after tag add.

---

### Chat Contact Reference (Explore)

**Files:** `src/lib/chat-parser.ts`, `src/components/chat/MessageContent.tsx`, `ContactChip.tsx`, `src/app/(dashboard)/explore/page.tsx`, `src/app/api/chat/explore/route.ts`

**Data Flow:** Query → GPT → `[CONTACT: id]` tags → parse → 3-tier match (ID → email → name) → chips + panel

**Regex:** `/\[CONTACT:\s*([a-zA-Z0-9_.@+-]+)\]\s*([^-\n]+)\s*-\s*([^\n\[]+)/g`

**Gotchas:**
1. Create fresh regex per parse (global flag has stateful lastIndex)
2. Don't clear identifierToIdMap (breaks old chips) -- accumulate mappings
3. System prompt must explicitly specify using exact ID field

---

### E2E Testing (Quick-Check)

**Files:** `.quick-checks/playwright.config.ts`, `auth-helper.ts`, `setup-test-user.ts`

```bash
cd .quick-checks && npx playwright test test-name.spec.ts --headed
```

**Gotchas:** Avoid `.or()` with strict mode. Use exact labels for similar fields. Add `waitForTimeout(2000)` after async state changes.

---

### Mobile Viewport UX

**Files:** `src/hooks/useMediaQuery.ts`, `src/components/layout/BottomNav.tsx`, `src/components/contacts/ContactCard.tsx`, `ContactCardList.tsx`, `ContactsView.tsx`, `src/components/ui/SwipeableCard.tsx`, `PullToRefresh.tsx`, `FAB.tsx`, `FilterDrawer.tsx`

**Gotchas:**
- react-window v2.2.3 API: `<List<T> rowComponent={Row} rowHeight={H} />` (different from v1)
- Touch null safety: `const touch = e.touches[0]; if (!touch) return;`
- SSR-safe: `if (isMobile === undefined) return <Skeleton />;`
- Tag categories are UPPERCASE
- Touch targets: min 44px x 44px (`h-11 w-11 md:h-10 md:w-10`)

---

### M33T Public Event Landing Page

**URL:** `/events/[slug]` (public, no auth) | **API:** `/api/events/[slug]`

**Files:** `src/app/events/[slug]/` (page, EventLandingClient, types, components/), `src/app/api/events/[slug]/route.ts`, `src/lib/m33t/slug.ts`

**Components:** EventHero, VenueSection, AttendeeCarousel, AttendeeCard, ProfileModal, FullGuestListModal, ScheduleSection, HostSection, FooterCTA, ScrollytellingSection (NO EDGES only)

**RSVPStatus:** PENDING→'invited', CONFIRMED→'confirmed', MAYBE→'maybe', DECLINED→not displayed

**Slug:** `import { generateSlug, generateUniqueSlug } from '@/lib/m33t'` (collision adds random suffix)

**Scrollytelling:** Only for "NO EDGES" events. 5 slides at 500vh. Active slide: `floor((scrollY + vh * 0.4) / vh)`.

**Privacy:** Public endpoint excludes email, phone, questionnaireResponses. DECLINED attendees excluded entirely.

**Gotchas:**
- Company/title from `tradingCard` or `profile` JSON, not direct fields
- Use `Cache-Control: no-store` for fresh data
- M33T brand uses `bg-zinc-950`, `text-amber-500`, Georgia serif, status colors: emerald/amber/zinc

---

### M33T Scrollytelling Animations

**Comprehensive guide:** `developer-guides/10-m33t-scrollytelling-animations-guide.md`

**Key File:** `src/app/m33t/[slug]/components/IfStatementSequence.tsx`

---

### OG Images for Link Sharing

**Comprehensive guide:** `developer-guides/11-og-images-link-sharing-guide.md`

**Files:** `src/app/api/og/m33t/route.tsx` (generic), `src/app/api/og/m33t/rsvp/route.tsx` (personalized), `src/app/m33t/[slug]/page.tsx` (metadata)

**Gotchas:**
- Use `runtime = 'nodejs'` for routes with Prisma (Edge incompatible)
- System fonts only (Georgia, monospace, system-ui) -- custom fonts unreliable in ImageResponse
- Test at: `http://localhost:3333/api/og/m33t?slug=event-slug`

---

### M33T Multi-Organizer Collaboration

**Files:** `src/lib/m33t/auth.ts`, `src/app/api/events/[eventId]/organizers/route.ts`, `src/app/api/events/route.ts`, `src/components/events/wizard/steps/OrganizersStep.tsx`

**Permissions:** `'view' | 'curate' | 'edit' | 'manage'`. Owner always has all. Co-organizers checked via EventOrganizer record.

**Authorization:**
```typescript
import { checkEventAccess } from '@/lib/m33t';
const access = await checkEventAccess(eventId, user.id, 'curate');
// Returns null if no access
```

**Event list MUST use OR clause** to include both owner and co-organizer events:
```typescript
where: { OR: [{ userId: user.id }, { organizers: { some: { userId: user.id } } }] }
```

**EventOrganizer permissions:** canInvite (default true), canCurate (default true), canEdit (default false), canManage (default false). Organizer mutations are **owner-only**.

**Audit trail:** `addedById`, `overridesEditedById`, `overridesEditedAt` on EventAttendee.

**API Permission Matrix:**

| Route | Method | Permission |
|-------|--------|------------|
| `/api/events/[id]` | GET/PUT | `view`/`edit` |
| `/api/events/[id]/matches/*` | * | `curate` |
| `/api/events/[id]/notify` | POST | `curate` |
| `/api/events/[id]/organizers` | POST/PUT/DELETE | **owner-only** |

---

### M33T Personalized RSVP Invite URLs

**Files:** `src/lib/m33t/rsvp-paths.ts`, `src/lib/m33t/tokens.ts`, `src/app/m33t/[slug]/page.tsx`

**Routing:** Base invite links go to landing page (`/m33t/{slug}?token={token}`) for brand experience. Deep links (`/matches`, `/question-sets`) route directly via `/m33t/{slug}/rsvp/{token}/subpath`.

**Always use `buildRsvpUrl()`** for URL generation. Token verification must check event slug match (prevent cross-event reuse). Client routing uses `getRsvpBasePath(pathname)`.

**OG personalization:** Token present → `/api/og/m33t/rsvp?token=...` (shows "John, You're Invited"). No token → `/api/og/m33t?slug=...` (generic).

---

### M33T Phone Normalization

**File:** `src/lib/phone-normalization.ts` -- uses `libphonenumber-js` (not `libphonenumber`).

Normalize to E.164 (`+1XXXXXXXXXX`) **before** saving to database. Invalid numbers return `null`. Used in RSVPForm, contact import, manual creation, attendee management.

---

### M33T 33 Strategies Questionnaire Styling

**Files:** `src/components/m33t/RSVPForm.tsx`, `src/components/m33t/questions/` (SingleSelect, MultiSelect, Slider, Ranking, OpenText)

**Tokens:** `text-gold-primary`, `bg-gold-primary`, `bg-gold-subtle`, `border-gold-primary` (never hardcode `#D4A84B` except in CSS gradients)

**Fonts:** `font-display` (Instrument Serif) for headings, `font-body` (DM Sans) for labels, `font-mono` (JetBrains Mono) for counters

**Patterns:** Custom `motion.button` radio/checkbox controls (replace shadcn). Gold rank badges. Native range slider with inline gradient style. Always add `focus-visible:ring-2 focus-visible:ring-gold-primary/50`.

---

### M33T Questionnaire Response Viewer

**Purpose:** Organizer-facing viewer for attendee responses to published question sets. Dual-view architecture: by-question (aggregated) and by-attendee (individual).

**Route:** `/events/[eventId]/question-sets/[setId]/responses`

**API:** `GET /api/events/[eventId]/question-sets/[setId]/responses` -- returns `{ questionSet, summary, responsesByQuestion, responsesByAttendee }` in a single call. Auth: `checkEventAccess(eventId, userId, 'view')`.

**Files:**
- `src/app/(dashboard)/events/[eventId]/question-sets/[setId]/responses/` (page.tsx, ResponsesPageClient.tsx)
- `src/components/events/question-sets/responses/` (ResponsesSummaryHeader, ResponsesViewToggle, ByQuestionView, QuestionResponseCard, AggregationDisplay, ByAttendeeView, AttendeeList, AttendeeDetail)
- `src/app/api/events/[eventId]/question-sets/[setId]/responses/route.ts`
- `src/lib/m33t/response-aggregation.ts`

**Aggregation types (discriminated union `QuestionAggregation`):**
- `single_select` / `multi_select`: `counts: Record<string, number>` + percentage bars
- `slider`: `average`, `min`, `max`
- `ranking`: `averageRanks` sorted by average rank position
- `open_text`: total count only, first 5 responses shown with "Show all" expander

**Entry point:** "View Responses" dropdown item on `QuestionSetCard` (PUBLISHED sets only). Wired via `onViewResponses` prop through `QuestionSetsManager`.

**Gotchas:**
- Both view groupings fetched in single API call, no re-fetch on view toggle
- DRAFT sets return 404 from API (no responses to view)
- Only CONFIRMED attendees counted in `totalAttendees`
- `Cache-Control: no-store` on API response

---

## Data Models

### Contact
```typescript
interface Contact {
  id: string; userId: string;
  // Basic: name, email?, title?, company?, location?, linkedinUrl?, phone?
  // Relationship: howWeMet?, relationshipStrength (1-4), lastContactDate?, relationshipHistory?
  // Why Now: whyNow? (20 points - key differentiator)
  // Profile: expertise?, interests?
  // Organization: tags: Tag[], notes?
  // Metadata: enrichmentScore (0-100), source, createdAt, updatedAt, lastEnrichedAt?
}
```

### Enrichment Score (max 100)
name/email/title/company: 10 each | location/linkedinUrl/tags: 5 each | howWeMet: 15, **whyNow: 20**, notes: 10

### Tag
```typescript
interface Tag { id: string; text: string; category: 'relationship' | 'opportunity' | 'expertise' | 'interest'; }
```

---

## API Endpoints

| Category | Endpoints |
|----------|-----------|
| Auth | `POST /api/auth/{signup,login,logout,forgot,reset,google,apple}` |
| Contacts | `GET,POST /api/contacts`, `GET,PUT,DELETE /api/contacts/:id`, `DELETE /api/contacts/bulk`, `DELETE /api/contacts/delete-all`, `POST /api/contacts/import/{csv,vcf,google}`, `POST /api/contacts/import/vcf/commit`, `GET /api/contacts/export`, `POST /api/contacts/match-mentions`, `GET /api/contacts/mentions/:id` |
| Tags | `GET /api/tags`, `POST,DELETE /api/contacts/:id/tags/:tagId?` |
| Enrichment | `GET /api/enrichment/{queue,stats,completion-data}`, `POST /api/enrichment/{:id/skip,extract,extract-mentions,refine-notes}` |
| AI/Chat | `POST /api/chat/{explore,draft-intro,suggest-tags}` |
| User | `GET,PUT,DELETE /api/user`, `PUT /api/user/password` |

---

## Page Architecture

```
/                  → /login or /contacts
/login, /signup, /forgot-password
/contacts          → Main table (default after auth)
/contacts/new      → Add contact
/contacts/import   → Import (CSV, integrations)
/contacts/:id      → Detail/edit
/enrich            → Enrichment queue
/explore           → Chat exploration
/settings          → Account settings
```

**App Shell:** Sidebar 240px (expanded) / 64px (collapsed). Active nav: gold left border + subtle gold bg.

---

## Quick Reference

| Item | Value |
|------|-------|
| Project | Better Connections (Personal CRM, single-user) |
| Stack | Next.js 14 + Supabase PostgreSQL + Prisma + OpenAI GPT-4o-mini + shadcn/ui + Tavily AI Search |
| Auth | Supabase (email/password) |
| Design | Dark theme, gold (#d4a54a), glassmorphism |
| Core Feature | "Why Now" contextual relevance + AI-powered contact research |
| Last Updated | 2026-02-01 |
