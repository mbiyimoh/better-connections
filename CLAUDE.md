# Better Connections - Claude Code Project Documentation

## Overview

**Better Connections** is a personal CRM / contact enrichment tool. Core insight: most contact management is "flat" (names/emails) while relationships need rich context about *why* someone matters *right now*.

**Tagline:** *Your contacts are flat. Give them some depth.*
**Target User:** Founders, investors, networkers (100-500+ contacts), tech-literate but not engineers.

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

**Dedicated Port: 3333**

This project uses port 3333 to avoid conflicts with other local applications (port 3001 is reserved for another project).

**Starting the dev server:**
```bash
PORT=3333 npm run dev
```

**Restarting the dev server (CRITICAL - port-specific kill):**
```bash
# Kill ONLY processes on port 3333, then restart
lsof -ti:3333 | xargs kill -9 2>/dev/null || true
rm -rf .next
PORT=3333 npm run dev
```

**NEVER use these commands (kills other apps):**
```bash
# WRONG - kills ALL Next.js servers across all projects
pkill -f "next dev"

# WRONG - kills by process name, not port
killall node
```

**Prisma Studio:** Runs on port 5555 (default)

**ABSOLUTE PROHIBITIONS (require EXPLICIT approval):**
- NEVER reset/modify passwords or credentials
- NEVER delete user accounts or data
- NEVER modify auth tokens or sessions
- NEVER send emails on behalf of users
- NEVER access/modify billing information
- NEVER change third-party service configs (Supabase, Stripe, etc.)
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
- **Dark theme** - mandatory for 33 Strategies brand
- **Gold accent (#d4a54a)** - primary brand color
- **Glassmorphism** - backdrop-blur with rgba backgrounds
- **No emojis** - use Lucide React icons
- **Framer Motion** - all animations

---

## Key Design Decisions (V1 Non-Negotiable)

1. Dark theme (33 Strategies brand)
2. Gold accent (#d4a54a)
3. "Why Now" as core differentiator (20 points in enrichment score)
4. Four tag categories: relationship, opportunity, expertise, interest (color-coded)
5. 4-level relationship strength: Weak, Casual, Good, Strong
6. Gamified enrichment with 30-second timer (voice-first)
7. Chat-first exploration (natural language)
8. Source tracking for contacts
9. Single-user product (no team/sharing)

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

### Contact Research & Apply Workflow Pattern

**Purpose:** Autonomous web research to enrich contact profiles with verified, sourced information.

**Key Files:**
- `src/app/api/contacts/[id]/research/[runId]/apply/route.ts` - Applies approved recommendations, generates human-readable summaries
- `src/components/research/ResearchApplyCelebration.tsx` - Post-apply celebration with score improvement
- `src/components/research/ResearchRunHistory.tsx` - Accordion history of past research runs
- `src/components/research/RecommendationCard.tsx` - Individual recommendation with approve/reject/edit actions
- `src/lib/research/types.ts` - Shared type definitions including `RESEARCH_FIELD_LABELS`

**User Flow:**
1. Click "Research" button on contact detail page
2. AI performs web search → generates structured recommendations
3. User reviews, edits, approves/rejects each recommendation
4. Click "Apply" → celebrates with animation showing:
   - Score improvement (previous → new)
   - Rank change (#5 → #3 of 47 contacts)
   - Human-readable changes list ("Added job role", "Updated company")
5. User dismisses celebration → research collapses into history tile

**Critical Patterns:**

**Per-item async loading state:**
```typescript
// Track which specific item is loading
const [loadingRecommendation, setLoadingRecommendation] = useState<{
  id: string;
  action: 'approve' | 'reject';
} | null>(null);

// In async handler
setLoadingRecommendation({ id, action });
try {
  await fetch(...);
} finally {
  setLoadingRecommendation(null);
}

// Pass to child
<RecommendationCard
  isLoading={loadingRecommendation?.id === rec.id}
  loadingAction={loadingRecommendation?.action}
/>
```

**Client state reset after router.refresh():**
```typescript
// Problem: router.refresh() updates server props but client state persists
// Solution: Watch props with useEffect and reset state

const [expandedId, setExpandedId] = useState(getDefaultExpandedId());

useEffect(() => {
  setExpandedId(getDefaultExpandedId());
  // Use JSON.stringify for stable comparison of object arrays
}, [JSON.stringify(sortedRuns.map(r => ({ id: r.id, appliedAt: r.appliedAt })))]);
```

**Gotchas:**
- **ALWAYS** call `router.refresh()` after applying recommendations to fetch updated data
- Use `JSON.stringify` in `useEffect` dependencies for object array comparisons
- Store loading state as `{id, action}` object, not boolean, for multi-item lists
- Celebration must be dismissed manually - no auto-dismiss after async operations
- Research history auto-collapses tiles when `appliedAt` is set (marks as "already applied")

**Extending this:**
- Add new researchable fields by updating `RESEARCH_FIELD_LABELS` in `src/lib/research/types.ts`
- Customize celebration duration by adjusting timing constants in `ResearchApplyCelebration.tsx`
- Add new recommendation sources by extending the apply route's data flow

**Location:** `src/components/research/` (all research UI components), `src/app/api/contacts/[id]/research/` (API routes)

---

### What's New Update Notifications Pattern

**Purpose:** Show users a modal popup when new features are released, with expandable bullet summaries and cross-device tracking.

**Files:**
- `src/lib/updates/types.ts` - Type definitions (Update, UpdateSummaryItem)
- `src/lib/updates/parser.ts` - Parse markdown files into Update objects
- `src/lib/updates/index.ts` - getLatestUpdate(), getAllUpdates() helpers
- `src/components/whats-new/WhatsNewModal.tsx` - Modal with accordion items
- `src/components/whats-new/WhatsNewProvider.tsx` - Client wrapper for layout integration
- `src/app/api/user/seen-update/route.ts` - PATCH endpoint to mark update as seen
- `updates/*.md` - Update content files (YYYY-MM-DD-slug.md)

**Update File Format:**
```markdown
---
version: "2026-01-11"
title: "AI-Powered Contact Research"
published: true
---

## Summary

- **Feature Title** - Brief description (under 100 chars)

## Details

### Feature Title

Detailed explanation with full markdown support...
```

**Creating Updates:**
Use the slash command: `/create-product-update <description of changes>`

**User Flow:**
1. User logs into dashboard
2. Layout fetches `lastSeenUpdateVersion` from DB + localStorage
3. If latestUpdate.version > lastSeen, show WhatsNewModal
4. User reads update, clicks "Got it!" or dismisses
5. Version saved to localStorage (instant) + database (cross-device)

**Critical Patterns:**

**Server Component + Client Modal:**
```typescript
// Dashboard layout is Server Component (async)
// Pass data as props to client wrapper
<WhatsNewProvider
  latestUpdate={getLatestUpdate()}
  userLastSeenVersion={dbUser?.lastSeenUpdateVersion ?? null}
/>
```

**Hybrid localStorage + Database:**
```typescript
// Check both sources for instant feedback
const localLastSeen = localStorage.getItem('lastSeenUpdateVersion');
const lastSeen = userLastSeenVersion || localLastSeen;

// On dismiss, update both
localStorage.setItem('lastSeenUpdateVersion', version);
await fetch('/api/user/seen-update', { method: 'PATCH', body: { version } });
```

**Gotchas:**
- Version comparison uses string comparison (ISO dates are lexicographically sortable)
- Always check both localStorage AND database for lastSeenVersion
- Summary bullet titles MUST match Details H3 headings exactly
- Set `published: false` in frontmatter to hide draft updates

**Location:** `src/components/whats-new/`, `src/lib/updates/`, `updates/`

---

### VCF Import Pattern

**Purpose:** Import .vcf files with duplicate detection and per-field conflict resolution.

**Files:** `src/lib/vcf-parser.ts`, `src/app/api/contacts/import/vcf/route.ts`, `src/app/api/contacts/import/vcf/commit/route.ts`, `src/components/import/VcfImportFlow.tsx`, `src/components/import/ImportMergeReview.tsx`

**Gotchas:**
```typescript
// vcard4-ts types - use named properties
const name = vcard.N.value.familyNames?.[0];  // NOT vcard.N.value[0]

// Hooks before returns in modals
useEffect(() => { ... });
if (!data) return null;  // AFTER hooks

// Case-insensitive email matching
where: { OR: emails.map(email => ({ primaryEmail: { equals: email, mode: 'insensitive' } })) }
```

**Notes:** Phone priority: cell > mobile > work > home. Auto-merge fills empty fields, appends notes.

**Bulk Actions:** Use dropdown menus for bulk duplicate handling:
- `Skip All Remaining` - marks all as skipped (no import)
- `Merge All (fill empty)` - fills only empty fields from incoming data
- `Replace All (overwrite)` - shows confirmation dialog, then overwrites all fields

```typescript
type BulkAction = 'skip' | 'merge' | 'replace-empty' | 'replace-all';
```

**Files:** `src/components/import/ImportMergeReview.tsx` (bulk actions bar at top)

---

### Enrichment Mentioned Contacts Pattern

**Purpose:** Extract person mentions from notes and match to existing contacts.

**Files:** `src/lib/schemas/mentionExtraction.ts`, `src/app/api/enrichment/extract-mentions/route.ts`, `src/app/api/contacts/match-mentions/route.ts`, `src/components/enrichment/completion/MentionedPeopleSection.tsx`

**Gotchas:** Exclude primary contact from suggestions. Handle partial name matches. Deduplicate same person mentioned differently.

---

### Voice Enrichment Pattern

**Purpose:** Voice-first input with Web Speech API and AI extraction.

**Files:** `src/app/(dashboard)/enrichment/session/page.tsx` (150-250), `src/app/api/enrichment/extract/route.ts`, `src/lib/schemas/enrichmentInsight.ts`

```typescript
const { transcript, listening, resetTranscript } = useSpeechRecognition();
SpeechRecognition.startListening({ continuous: true });
```

**Gotchas:** Chrome needs HTTPS (localhost OK). Safari needs permission. AI cleans noisy transcripts.

---

### Alphabet Quick-Jump Navigation

**Purpose:** A-Z letter strip for instant filtering.

**Files:** `src/components/ui/AlphabetSlider.tsx`, `src/app/(dashboard)/enrichment/page.tsx` (~200-220)

```typescript
<AlphabetSlider items={contacts} selectedLetter={letterFilter} onLetterSelect={setLetterFilter} />
```

**Behavior:** "All" button clears filter. Disabled letters have no contacts. Hidden on mobile. Auto-clears on search.

---

### Phone Area Code Hometown Suggestion

**Purpose:** Suggest location from US phone area code.

**Files:** `src/lib/area-codes.ts` (160 codes), `src/components/contacts/HometownSuggestion.tsx`, `src/components/contacts/ContactForm.tsx` (242-246)

```typescript
<HometownSuggestion phone={primaryPhone} currentLocation={location} onAccept={(s) => setValue('location', s)} />
```

**Behavior:** Shows only if area code valid AND location empty. Dismissal persists until phone changes.

---

### Enrichment Completion Gamification

**Purpose:** Celebration UI with animations/sounds after enrichment.

**Files:** `src/components/enrichment/completion/CompletionCelebration.tsx`, `RankCelebration.tsx`, `useCelebrationSounds.ts`, `BubbleTagSuggestions.tsx`, `src/app/api/enrichment/completion-data/route.ts`

**Ranks:** 0-25 Getting Started, 26-50 Building Depth, 51-75 Well Connected, 76-100 Fully Enriched

**Category case conversion:**
```typescript
// Bubbles: lowercase ('relationship') → Tags: UPPERCASE ('RELATIONSHIP')
bubbleCategoryToTagCategory(category) => category.toUpperCase() as TagCategory
```

**Tag Editing:** Users can edit tag text/category before adding via `TagEditModal`.

**Files:** `src/components/enrichment/completion/TagEditModal.tsx`, `BubbleTagSuggestions.tsx`

**Pattern:**
```typescript
// Edit button opens modal, onSave updates suggestion in list
<TagEditModal
  isOpen={!!editingTag}
  initialText={editingTag.text}
  initialCategory={editingTag.category}
  onSave={(newText, newCategory) => {
    setSuggestions(prev => prev.map(s =>
      s.bubbleId === editingTag.bubbleId
        ? { ...s, text: newText, category: newCategory }
        : s
    ));
  }}
/>
```

**Gotchas:**
- Guard `addSelectedTags` with `|| isAdding` to prevent race conditions from rapid clicks
- Category legend with tooltips explains each category type

---

### Contact Details Gamification & AI Tag Suggestions

**Purpose:** Display enrichment score with ranking, missing field suggestions, AI tag recommendations.

**Files:** `src/components/contacts/EnrichmentScoreCard.tsx`, `TagsSection.tsx`, `ContactDetail.tsx`, `src/app/api/contacts/[id]/ranking/route.ts`, `src/app/api/contacts/[id]/suggest-tags/route.ts`, `src/lib/enrichment.ts`

**Features:** Color-coded score circle, "#3 of 47" ranking, top 3 missing fields with points, "Enrich Now" button.

**AI suggestions require:** 3+ fields filled OR whyNow OR notes OR (expertise AND interests).

**CRITICAL:** Import `TAG_CATEGORY_COLORS` from `@/lib/design-system` - never duplicate locally.

**Gotchas:** Ranking fetches all contacts (O(n)). TagCategory uses UPPERCASE. Call `router.refresh()` after tag add.

---

### Chat Contact Reference Pattern (Explore)

**Purpose:** Parse AI responses for `[CONTACT: id] Name - Reason`, render as interactive chips, sync to panel.

**Files:** `src/lib/chat-parser.ts`, `src/components/chat/MessageContent.tsx`, `ContactChip.tsx`, `src/app/(dashboard)/explore/page.tsx`, `src/app/api/chat/explore/route.ts`

**Data Flow:** Query → GPT → `[CONTACT: id]` tags → parse → 3-tier match (ID → email → name) → chips + panel

**Regex:** `/\[CONTACT:\s*([a-zA-Z0-9_.@+-]+)\]\s*([^-\n]+)\s*-\s*([^\n\[]+)/g`

**Critical Gotchas:**
1. Create fresh regex per parse (global flag has stateful lastIndex)
2. Don't clear identifierToIdMap (breaks old chips) - accumulate mappings
3. System prompt must be EXPLICIT about using exact ID field
4. Validate identifiers before use

**Chip interactions:** Hover highlights panel card. Click scrolls and highlights 2s.

---

### Onboarding Story Slides Pattern

**Purpose:** Instagram-style story slides for first-time users.

**Files:** `src/app/(dashboard)/onboarding/page.tsx`, `src/components/onboarding/StoryOnboarding.tsx`, `DotIndicator.tsx`, `slides/SlideLayout.tsx`, `Slide3MagicMoment.tsx`, `Slide5EnrichmentPreview.tsx`, `Slide6AIResearch.tsx`, `src/app/api/user/complete-onboarding/route.ts`

**Flow:** Login → check `hasCompletedOnboarding` → redirect if false → 7 slides → click anywhere to advance → CTA → set flag → redirect to `/contacts`

**Slides:**
1. Pain Point - "You have the perfect connection..."
2. Frustration - "Scrolling through names doesn't work"
3. Magic Moment - Chat query → contact suggestions (Explore)
4. How It Works - "Because you told it—in 30 seconds"
5. Enrichment Preview - Timer + bubbles + Why Now
6. AI Research - "Add what you know. Discover what you don't."
7. CTA - "Get Started"

**Navigation:** Click-to-advance (not auto-timed). Dot indicators show progress. Arrow keys and swipe gestures also work.

**Gotchas:** Use `x-pathname` header for server route detection. CTA needs `e.stopPropagation()`. Click handler on slide container advances to next slide.

---

### E2E Testing Pattern (Quick-Check)

**Purpose:** Ephemeral Playwright tests for quick verification (auto-deleted).

**Files:** `.quick-checks/playwright.config.ts`, `auth-helper.ts`, `setup-test-user.ts`, `test-*.spec.ts`

```bash
cd .quick-checks && npx playwright test test-name.spec.ts --headed
```

**Gotchas:**
- Avoid `.or()` with strict mode - check visibility individually
- Use exact labels for similar fields ("Primary Phone" not `/Phone/i`)
- Handle VCF dual-flow (first import vs duplicate review)
- Add `waitForTimeout(2000)` after async state changes

---

### Mobile Viewport UX Pattern

**Purpose:** Mobile-first design (<768px) with cards, bottom nav, swipe gestures.

**Files:** `src/hooks/useMediaQuery.ts`, `src/components/layout/BottomNav.tsx`, `src/components/contacts/ContactCard.tsx`, `ContactCardList.tsx`, `ContactsView.tsx`, `src/components/ui/SwipeableCard.tsx`, `PullToRefresh.tsx`, `FAB.tsx`, `FilterDrawer.tsx`

**Dependencies:** react-window v2.2.3 (different API from v1), use-debounce, framer-motion

**Critical Gotchas:**
```typescript
// react-window v2 API
import { List, type ListImperativeAPI } from 'react-window';
<List<ContactRowProps> rowComponent={ContactRow} rowHeight={CARD_HEIGHT + CARD_GAP} />

// Touch null safety
const touch = e.touches[0];
if (!touch) return;

// SSR-safe media query
if (isMobile === undefined) return <Skeleton />;

// Tag categories are UPPERCASE: 'RELATIONSHIP' not 'relationship'
```

**Touch targets:** Minimum 44px × 44px. Use `h-11 w-11 md:h-10 md:w-10`.

---

### Design System Color Standardization

**Purpose:** Consistent gold (#d4a54a) usage via Tailwind and constants.

**Files:** `tailwind.config.ts`, `src/lib/design-system.ts`, `src/app/globals.css`

```typescript
// Tailwind (preferred)
text-gold-primary, bg-gold-primary, hover:bg-gold-light, bg-gold-subtle

// JS constants
import { BRAND_GOLD } from '@/lib/design-system';
BRAND_GOLD.primary  // "#d4a54a"
```

**Gotchas:** Gradients/SVGs need hex directly. Search `grep -r "#C9A227" src/` for old refs.

---

### Contact Deep Research Pattern

**Purpose:** AI-powered research to find publicly available information about contacts and generate profile enrichment recommendations.

**Files:**
- `src/lib/research/` - Core research logic (orchestrator, prompts, schemas, types)
- `src/components/research/` - UI components (ResearchButton, ResearchResultsPanel, RecommendationCard, InlineDiff)
- `src/app/api/contacts/[id]/research/route.ts` - Initiate research
- `src/app/api/contacts/[id]/research/[runId]/apply/route.ts` - Apply approved recommendations

**Flow:**
1. User clicks "Research" on contact detail page
2. Selects focus areas (professional, expertise, interests, news)
3. System builds search query → Tavily API → GPT-4o synthesis → Recommendations
4. User reviews recommendations with inline diff view
5. Approve/reject/edit each → Apply approved changes

**Key Types:**
```typescript
// src/lib/research/types.ts
interface ContactContext {
  firstName, lastName, primaryEmail, title, organizationalTitle, company, location, linkedinUrl, expertise, interests, whyNow, notes
}

type FocusArea = 'professional' | 'expertise' | 'interests' | 'news';

interface GeneratedRecommendation {
  fieldName: 'expertise' | 'interests' | 'whyNow' | 'notes' | 'title' | 'organizationalTitle' | 'company' | 'location' | 'tags';
  action: 'ADD' | 'UPDATE';
  proposedValue: string;
  confidence: number;
  sourceUrls: string[];
}
```

**Title vs OrganizationalTitle:**
- `title` = Job Role (what they do): "Venture Capitalist", "Software Engineer"
- `organizationalTitle` = Position (rank in org): "President", "VP of Engineering", "Managing Partner"

**Inline Diff for UPDATE:**
```typescript
// src/components/research/InlineDiff.tsx
import { diffWords } from 'diff';
// Shows: strikethrough (red) for deletions, bold-italic (green) for additions
```

**Duplicate Filtering:**
```typescript
// src/lib/research/orchestrator.ts - Post-generation filter
.filter((r) => {
  if (!r.currentValue) return true;
  const current = r.currentValue.trim().toLowerCase();
  const proposed = r.proposedValue.trim().toLowerCase();
  return current !== proposed && !current.includes(proposed);
})
```

**Markdown Rendering:**
- `@tailwindcss/typography` plugin required for prose classes to work
- Wrap ReactMarkdown in div with `prose prose-invert prose-sm max-w-none` classes
- Full report shows proper paragraph spacing, headers, lists when plugin installed

**Notes Field Formatting Protocol:**
- AI prompt enforces bullet-point format for all Notes recommendations
- If >6 bullets, organize into sections with `## Headers`
- Never use bracketed metadata like `[Field: Value]`
- See `src/lib/research/prompts.ts` NOTES FIELD FORMATTING PROTOCOL section

**Gotchas:**
- ReactMarkdown doesn't accept className prop - wrap in div with prose classes
- Confidence threshold is 0.5 (MIN_CONFIDENCE_THRESHOLD in orchestrator.ts)
- Use `whitespace-pre-wrap` for multi-line content display
- Apply route must include `organizationalTitle` in allowed fields Pick<>

---

### Delete All Contacts Pattern

**Purpose:** Bulk delete all contacts with confirmation dialog requiring "DELETE" text.

**Files:** `src/components/contacts/DeleteAllContactsDialog.tsx`, `src/app/api/contacts/delete-all/route.ts`

**Usage locations:**
- Settings page → Data Management → "Delete All Contacts" button
- Import page → "Start Fresh" card (shown when user has existing contacts)

**Pattern:**
```typescript
<DeleteAllContactsDialog
  isOpen={showDeleteAllDialog}
  onClose={() => {
    setShowDeleteAllDialog(false);
    fetchContactCount(); // Refresh count after deletion
  }}
  contactCount={contactCount}
/>
```

**API:** `DELETE /api/contacts/delete-all` - deletes all contacts for authenticated user, returns `{ success: true, deleted: count }`.

**Gotchas:** Prisma `deleteMany` cascades to tags due to schema relations. Dialog resets `confirmText` state on close.

---

### M33T Public Event Landing Page Pattern

**Purpose:** Public-facing event landing page showing event details, attendees by RSVP status, profile modals, and scrollytelling for NO EDGES events.

**URL Structure:**
- `/events/[slug]` → Public landing page (no auth required)
- `/api/events/[slug]` → Public API endpoint

**Files:**
- `src/app/events/[slug]/page.tsx` — Server Component (data fetching)
- `src/app/events/[slug]/not-found.tsx` — 404 page
- `src/app/events/[slug]/EventLandingClient.tsx` — Client Component (interactions)
- `src/app/events/[slug]/types.ts` — Shared types
- `src/app/events/[slug]/components/` — All UI components
- `src/app/api/events/[slug]/route.ts` — Public API endpoint
- `src/lib/m33t/slug.ts` — Slug generation utility

**Components:**
- `EventHero` — Event name, tagline, date/time, primary CTA
- `VenueSection` — Venue details with image placeholder
- `AttendeeCarousel` — Horizontal scrollable attendee list with nav buttons
- `AttendeeCard` — Individual attendee card with status dot
- `ProfileModal` — Full attendee profile with trading card data
- `FullGuestListModal` — Grid view with status tabs
- `ScheduleSection` — Event agenda timeline
- `HostSection` — Organizer profile
- `FooterCTA` — Bottom call-to-action
- `ScrollytellingSection` — Scroll-based story slides (NO EDGES only)

**RSVPStatus Mapping:**
```typescript
// Database enum → Display string
PENDING → 'invited'
CONFIRMED → 'confirmed'
MAYBE → 'maybe'
DECLINED → not displayed
```

**Slug Generation:**
```typescript
import { generateSlug, generateUniqueSlug } from '@/lib/m33t';

// Basic slug
const slug = generateSlug("NO EDGES – 33 Strategies Launch");
// → "no-edges-33-strategies-launch"

// With collision handling
const uniqueSlug = await generateUniqueSlug(name, async (slug) => {
  const existing = await prisma.event.findFirst({ where: { slug } });
  return !!existing;
});
// → "no-edges-33-strategies-launch-a7b2" (if collision)
```

**Design System (33 Strategies Brand):**
- Background: `bg-zinc-950`
- Gold accent: `text-amber-500`, `bg-amber-500`
- Font: Georgia serif for headings
- Status colors: emerald (confirmed), amber (maybe), zinc (invited)

**Scrollytelling Behavior:**
- Only enabled for events with "NO EDGES" in name
- 5 slides occupying 500vh total
- Active slide determined by: `floor((scrollY + vh * 0.4) / vh)`
- Fade transitions between slides (700ms)

**Privacy Filtering (API):**
- Public endpoint, no authentication
- Excludes: email, phone, questionnaireResponses
- Includes: name, title, company, tradingCard (background, whyMatch, conversationStarters)
- DECLINED attendees excluded entirely

**Gotchas:**
- Company/title extracted from `tradingCard` or `profile` JSON, not direct fields
- Use `Cache-Control: no-store` header for fresh data
- Mobile: All carousels support touch/swipe scrolling
- Empty states: Hide carousels with no attendees, show "Be the first to RSVP!"

**Location:** `src/app/events/[slug]/`, `src/app/api/events/[slug]/`, `src/lib/m33t/slug.ts`

---

### M33T Scrollytelling Animation Patterns

**Purpose:** Advanced animation techniques for the "If Statement Sequence" scrollytelling component on NO EDGES event landing pages.

**Comprehensive Guide:** See `developer-guides/10-m33t-scrollytelling-animations-guide.md` for full documentation.

**Key File:** `src/app/m33t/[slug]/components/IfStatementSequence.tsx`

**Core Patterns:**

1. **Coordinate System Architecture**
   - Main container establishes coordinate origin (center)
   - OrbControl ref API for imperative child→parent communication
   - `getBoundingClientRect()` for relative positioning calculations

2. **lagFactor for Erase Alignment**
   - Erase effect trails orb by `lagFactor` segments (tuned to 1.2)
   - Per-frame position updates synced to animation progress
   - CSS mask for progressive text erasing effect

3. **Volatile Isotope Vibration**
   - Programmatic keyframe generation: 24 rapid micro-oscillations
   - Random variation (75-125% intensity) for organic instability
   - Linear easing for mechanical vibration feel

4. **Magnetic Collapse Animation**
   - Extreme ease-in curve: `[0.99, 0, 1, 1]` (frozen then instant snap)
   - Short duration (0.35s) for magnetic pull effect
   - Scale to 0.1 for complete collapse

5. **Particle Explosion with Organic Falling**
   - Per-particle properties: fallDelay, fallDuration, driftX
   - Semicircle explosion (upward only) prevents floor penetration
   - Three phases: explode (0.4s) → linger (2.4s) → fall (staggered 1.5-3.5s)

**Key Techniques:**
- Relative positioning with shared coordinate systems
- Phase-based state management (AnimationPhase enum)
- Race condition prevention (phaseRef checks)
- GPU acceleration (`willChange: 'transform, opacity'`)
- Spring physics for organic orb migrations

**Easing Curves:**
- Smooth drift: `[0.25, 0.46, 0.45, 0.94]`
- Magnetic resistance: `[0.99, 0, 1, 1]`
- Fast emergence: `[0.16, 1, 0.3, 1]`
- Particle falling: `[0.4, 0.0, 0.2, 1]`

**Common Gotchas:**
- Orb glow extends ~15-20px beyond core center (account for in positioning)
- Always convert viewport coords to component-relative coords
- Use refs for timers that persist across phase changes
- Phase check before executing delayed animations (prevent race conditions)

**Location:** `src/app/m33t/[slug]/components/IfStatementSequence.tsx`, see guide for full patterns

---

### M33T Multi-Organizer Collaboration Pattern

**Purpose:** Allow event owners to add co-organizers with granular permission levels for collaborative event management.

**Key Files:**
- `src/lib/m33t/auth.ts` - `checkEventAccess()` authorization helper
- `src/app/api/events/[eventId]/organizers/route.ts` - Organizer CRUD (owner-only for mutations)
- `src/app/api/events/route.ts` - Event list includes co-organizer events
- `src/components/events/wizard/steps/OrganizersStep.tsx` - Wizard UI for adding co-organizers

**Permission Hierarchy:**
```typescript
type EventPermission = 'view' | 'curate' | 'edit' | 'manage';

// Owner ALWAYS has all permissions
// Co-organizers checked against EventOrganizer record:
// - view: Any co-organizer can see event
// - curate: canCurate = true (edit attendee profiles, manage matches)
// - edit: canEdit = true (modify event details)
// - manage: canManage = true OR owner (add/remove organizers)
```

**Authorization Helper Pattern:**
```typescript
// src/lib/m33t/auth.ts
import { checkEventAccess, type EventPermission } from '@/lib/m33t';

// In API route handlers:
const access = await checkEventAccess(eventId, user.id, 'curate');
if (!access) {
  return NextResponse.json(
    { error: 'Event not found or insufficient permissions', code: 'FORBIDDEN' },
    { status: 403 }
  );
}

// Owner always returns full permissions
// Co-organizer returns their specific permissions
// Returns null if no access
```

**Co-Organizer Events in List Query:**
```typescript
// src/app/api/events/route.ts
// CRITICAL: Include BOTH owner AND co-organizer events
const events = await prisma.event.findMany({
  where: {
    OR: [
      { userId: user.id }, // Owner
      { organizers: { some: { userId: user.id } } }, // Co-organizer
    ],
  },
  include: {
    // Include organizer permissions for UI to distinguish role
    organizers: {
      where: { userId: user.id },
      select: { canInvite: true, canCurate: true, canEdit: true, canManage: true }
    }
  }
});
```

**EventOrganizer Model:**
```prisma
model EventOrganizer {
  id         String   @id @default(cuid())
  eventId    String
  userId     String
  canInvite  Boolean  @default(true)  // Add attendees from contacts
  canCurate  Boolean  @default(true)  // Edit profiles, manage matches
  canEdit    Boolean  @default(false) // Modify event details
  canManage  Boolean  @default(false) // Add/remove organizers
  createdAt  DateTime @default(now())

  event      Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [userId], references: [id])

  @@unique([eventId, userId])
}
```

**Audit Trail for Attendee Changes:**
```prisma
model EventAttendee {
  // ... other fields
  addedById           String?   // Who added this attendee
  addedBy             User?     @relation("AttendeeAddedBy", ...)
  overridesEditedById String?   // Who last edited profile overrides
  overridesEditedBy   User?     @relation("AttendeeOverridesEditedBy", ...)
  overridesEditedAt   DateTime? // When last edited
}
```

**API Route Permission Matrix:**

| Route | Method | Required Permission |
|-------|--------|---------------------|
| `/api/events` | GET | (includes co-organizer events) |
| `/api/events/[id]` | GET | `view` |
| `/api/events/[id]` | PUT | `edit` |
| `/api/events/[id]/matches/*` | GET/POST/PUT/DELETE | `curate` |
| `/api/events/[id]/notify` | POST | `curate` |
| `/api/events/[id]/organizers` | GET | (owner or organizer) |
| `/api/events/[id]/organizers` | POST/PUT/DELETE | **owner-only** |

**Critical Gotchas:**
- **Event list must use OR clause** - without it, co-organizers can't see events they're added to
- **Organizer mutations are owner-only** - even `canManage` doesn't allow adding other organizers (security)
- **Always import from barrel**: `import { checkEventAccess } from '@/lib/m33t'`
- **Run `npx prisma generate`** after schema changes for new relation fields
- **Use `formatDistanceToNow`** for "edited X hours ago" display

**UI Display for Audit Trail:**
```tsx
// In AttendeeProfileEditModal header
{attendee?.overridesEditedBy && (
  <p className="text-xs text-text-tertiary mt-1">
    Last edited by {attendee.overridesEditedBy.name}
    {attendee.overridesEditedAt && (
      <> {formatDistanceToNow(new Date(attendee.overridesEditedAt))} ago</>
    )}
  </p>
)}
```

**Location:** `src/lib/m33t/auth.ts`, `src/app/api/events/[eventId]/organizers/`, `src/components/events/wizard/steps/OrganizersStep.tsx`

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
- name/email/title/company: 10 each
- location/linkedinUrl/tags: 5 each
- howWeMet: 15, **whyNow: 20**, notes: 10

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

## AI Prompt Templates

### Chat Exploration
```
You are an AI assistant helping explore a professional network.
User's contacts: {serialized_contacts}
Query: {user_message}
When suggesting contacts: [CONTACT: {contact_id}] {name} - {reason}
```

### Draft Intro
```
Contact: {name}, {title} at {company}
How we met: {how_we_met}
Why now: {why_now}
Write 2-3 sentences: personal, references context, soft ask, professional but warm.
```

---

## Prototype Files

JSX with inline styles (no Tailwind), Framer Motion, Lucide React icons.

| File | Purpose |
|------|---------|
| BetterConnectionsPrototype.jsx | Gamified enrichment + chat |
| AppShellContactsTable.jsx | Sidebar + table |
| AppShellWithContactDetail.jsx | Shell + detail |
| ContactDetailPage.jsx | Single contact |
| AddContactImportPage.jsx | Add/import |
| AuthPages.jsx | Login/signup/forgot |
| EnrichmentQueuePage.jsx | Queue |
| SettingsPage.jsx | Settings |

---

## Implementation Phases

1. **Core:** DB, auth, CRUD, search/filter
2. **Contacts:** Detail view, tags, CSV import, export
3. **Enrichment:** Score calc, queue, basic flow, gamified voice flow
4. **AI:** Chat exploration, draft intros, tag suggestions
5. **Polish:** OAuth, settings, notifications, performance

---

## V1 Success Metrics

- Sign up/login working
- Add contacts manually
- Import from CSV
- View/edit/delete contacts
- Search and filter
- Enrich via guided flow
- Explore via chat
- Export contacts
- Performs well with 500+ contacts

---

## Quick Reference

| Item | Value |
|------|-------|
| Project | Better Connections (Personal CRM) |
| Stack | Next.js 14 + Supabase PostgreSQL + Prisma + OpenAI GPT-4o-mini + shadcn/ui + Tavily AI Search |
| Auth | Supabase (email/password) |
| Design | Dark theme, gold (#d4a54a), glassmorphism |
| Core Feature | "Why Now" contextual relevance + AI-powered contact research |
| Last Updated | 2026-01-18 |
