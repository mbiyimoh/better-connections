# Better Connections - Claude Code Project Documentation

## Overview

**Better Connections** is a personal CRM / contact enrichment tool that helps users maintain deeper context about their professional network. The core insight is that most contact management is "flat" — just names and emails — while valuable relationships require rich context about *why* someone matters *right now*.

**Tagline:** *Your contacts are flat. Give them some depth.*

**Target User:** Founders, investors, networkers with 100-500+ professional contacts who are tech-literate but not engineers.

---

## Working with This User

**User Profile:** Technically literate product owner but NOT an engineer. Claude handles 100% of technical operations.

**Critical Rules:**
- NEVER ask user to run CLI commands - execute them directly via Bash
- NEVER ask user to check database - use Prisma CLI or SQL via Bash
- Run ALL commands proactively (npm, git, docker, prisma, etc.)
- Handle errors autonomously; only escalate when user input truly needed

**ABSOLUTE PROHIBITIONS (require EXPLICIT user approval BEFORE action):**
- NEVER reset, change, or modify user passwords or credentials
- NEVER delete user accounts or user data
- NEVER modify authentication tokens or sessions
- NEVER send emails on behalf of users
- NEVER access or modify billing/payment information
- NEVER make changes to third-party service configurations (Supabase, Stripe, etc.) without explicit approval
- When investigating auth issues: DIAGNOSE and RECOMMEND, never unilaterally FIX credentials

---

## Design System (33 Strategies Brand)

**When modifying ANY frontend/UI code, follow the Better Connections design system.**

### Colors
```javascript
const colors = {
  bg: {
    primary: '#0D0D0F',    // Main background
    secondary: '#1A1A1F',  // Cards, surfaces
    tertiary: '#252529',   // Elevated elements
    glass: 'rgba(26, 26, 31, 0.85)', // Glassmorphism
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#A0A0A8',
    tertiary: '#606068',
  },
  gold: {
    primary: '#d4a54a',    // Primary accent
    light: '#e5c766',      // Hover states
    subtle: 'rgba(212, 165, 74, 0.15)', // Backgrounds
  },
  category: {
    relationship: '#3B82F6', // Blue
    opportunity: '#22C55E',  // Green
    expertise: '#A855F7',    // Purple
    interest: '#F59E0B',     // Amber
  },
  border: 'rgba(255, 255, 255, 0.08)',
  success: '#4ADE80',
  error: '#EF4444',
  warning: '#FBBF24',
};
```

### Typography
```
Font Family:    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
Heading 1:      32px / 700
Heading 2:      24px / 600
Heading 3:      18px / 600
Body:           14px / 400
Small:          13px / 400
Caption:        11px / 600 / uppercase / letter-spacing: 1px
```

### Spacing Scale
```
4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px
```

### Border Radius
```
Small:    6px
Medium:   8px
Large:    12px
Cards:    16px
```

### Key Patterns
- **Dark theme is mandatory** - matches 33 Strategies brand
- **Gold accent (#d4a54a)** - Primary brand color throughout
- **Glassmorphism** - Use backdrop-blur with rgba backgrounds for elevated surfaces
- **No emojis in UI** - Use Lucide React icons instead
- **Framer Motion** - All animations use Framer Motion

---

## Key Design Decisions (Non-Negotiable for V1)

1. **Dark theme** — Not negotiable for V1, matches 33 Strategies brand
2. **Gold accent** (#d4a54a) — Primary brand color throughout
3. **"Why Now" as core differentiator** — Most weighted field in enrichment score (20 points)
4. **Four tag categories** — relationship, opportunity, expertise, interest (color-coded)
5. **4-level relationship strength** — Weak, Casual, Good, Strong (visual dots)
6. **Gamified enrichment** — Not a form, a guided conversation flow with 30-second timer
7. **Chat-first exploration** — Natural language queries, not just search
8. **Source tracking** — Know where each contact came from
9. **No team/sharing in V1** — Single-user product first

---

## Tech Stack (Actual)

### Core
- **Frontend:** Next.js 14+ (App Router) + React + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui components
- **Animation:** Framer Motion (physics-based, gesture support)
- **Icons:** Lucide React

### Backend
- **API:** Next.js API routes
- **Database:** Supabase PostgreSQL (hosted at `pooler.supabase.com`)
- **ORM:** Prisma
- **Auth:** Supabase Auth (email/password)

### AI Integration
- **Enrichment Extraction:** OpenAI GPT-4o-mini (via Vercel AI SDK)
- **Notes Merging:** OpenAI GPT-4o-mini
- **Chat/Exploration:** OpenAI GPT-4o-mini

### Special Features
- **Speech-to-Text:** react-speech-recognition (Web Speech API)
- **Split Panels:** react-resizable-panels
- **Countdown Timer:** react-countdown-circle-timer (for enrichment flow)
- **VCF Parsing:** vcard4-ts (TypeScript-first vCard 3.0/4.0 parser)
- **Mobile Virtualization:** react-window v2.2.3 (NOTE: v2 API differs from v1)
- **Debounced Hooks:** use-debounce (for scroll handlers)

---

## Agent Protocols & Patterns

### VCF Import Pattern

**What it does:** Imports contacts from .vcf files (iCloud, Outlook exports) with smart duplicate detection and per-field conflict resolution.

**Key files:**
- `src/lib/vcf-parser.ts` - VCF parsing with field extraction
- `src/app/api/contacts/import/vcf/route.ts` - Upload and duplicate detection
- `src/app/api/contacts/import/vcf/commit/route.ts` - Apply merge decisions
- `src/components/import/VcfImportFlow.tsx` - Multi-step import wizard
- `src/components/import/ImportMergeReview.tsx` - Conflict resolution modal

**Dependencies:**
- `vcard4-ts` - TypeScript vCard parser (complex nested types)

**Critical Gotchas:**

1. **vcard4-ts Type Complexity**
   ```typescript
   // WRONG - vCard types are objects with nested arrays
   const name = vcard.N.value[0]; // Type error!

   // CORRECT - Use named properties
   const name = vcard.N.value.familyNames?.[0];
   ```

2. **React Hooks Rules in Modals**
   ```typescript
   // WRONG - Hooks called after early return
   if (!data) return null;
   useEffect(() => { ... }); // Violation!

   // CORRECT - All hooks before any returns
   useEffect(() => { ... });
   if (!data) return null;
   ```

3. **Case-Insensitive Email Matching**
   ```typescript
   // CORRECT - Prisma mode for case-insensitive
   where: {
     OR: emails.map(email => ({
       primaryEmail: { equals: email, mode: 'insensitive' }
     }))
   }
   ```

**Extending this:**
- Phone priority: cell > mobile > work > home (in `extractPhones()`)
- Email priority: Uses vCard PREF parameter
- Auto-merge: Empty fields filled, notes appended (never replaced)

---

### Enrichment Mentioned Contacts Pattern

**What it does:** Discovers network connections by extracting person mentions from enrichment notes and matching them to existing contacts.

**Key files:**
- `src/lib/schemas/mentionExtraction.ts` - Zod schemas for GPT-4o extraction
- `src/app/api/enrichment/extract-mentions/route.ts` - AI mention extraction
- `src/app/api/contacts/match-mentions/route.ts` - Fuzzy matching to contacts
- `src/components/enrichment/completion/MentionedPeopleSection.tsx` - UI display

**Database models:**
```prisma
model MentionedPerson {
  id          String   @id @default(cuid())
  contactId   String   // Primary contact being enriched
  name        String   // Extracted mention
  context     String?  // How they're related
  matchedContactId String? // FK to matched Contact
  isConfirmed Boolean @default(false)
}
```

**Integration points:**
- Triggered after enrichment completion
- Uses GPT-4o-mini with structured outputs (Zod schemas)
- Fuzzy matching with similarity scoring
- Creates bidirectional relationship suggestions

**Gotchas:**
- Exclude primary contact from mention suggestions
- Handle partial name matches (first name only)
- Deduplication: Same person mentioned multiple ways

---

### Voice Enrichment Pattern

**What it does:** Voice-first enrichment input using Web Speech API with real-time transcription and AI extraction.

**Key files:**
- `src/app/(dashboard)/enrichment/session/page.tsx` - Voice UI (lines 150-250)
- `src/app/api/enrichment/extract/route.ts` - GPT-4o extraction from transcript
- `src/lib/schemas/enrichmentInsight.ts` - Structured output schema

**Dependencies:**
- `react-speech-recognition` - Web Speech API wrapper
- Browser support: Chrome, Edge, Safari (webkit)

**Integration pattern:**
```typescript
const {
  transcript,
  listening,
  resetTranscript,
  browserSupportsSpeechRecognition
} = useSpeechRecognition();

// Start/stop listening
SpeechRecognition.startListening({ continuous: true });
SpeechRecognition.stopListening();
```

**AI Extraction:**
```typescript
// Uses GPT-4o-mini with structured outputs
const extraction = await generateObject({
  model: openai('gpt-4o-mini'),
  schema: enrichmentInsightSchema,
  prompt: `Extract structured data from: ${transcript}`
});
```

**Gotchas:**
- Chrome requires HTTPS (localhost OK for dev)
- Safari needs user permission
- Transcripts can be noisy - AI extraction cleans them
- No built-in profanity filter - handle in extraction

---

### Alphabet Quick-Jump Navigation

**What it does:** Vertical A-Z letter strip on the right edge of contact lists for instant filtering by first letter.

**Key files:**
- `src/components/ui/AlphabetSlider.tsx` - Reusable alphabet navigation component
- `src/app/(dashboard)/enrichment/page.tsx` - Integrated into enrichment queue (lines ~200-220)
- `src/lib/area-codes.ts` - US area code data (160 codes)

**Integration pattern:**
```typescript
const [letterFilter, setLetterFilter] = useState<string | null>(null);

// Clear letter filter when search is used
useEffect(() => {
  if (searchQuery) setLetterFilter(null);
}, [searchQuery]);

// Filter logic
const matchesLetter = !letterFilter ||
  contact.firstName[0]?.toUpperCase() === letterFilter;

<AlphabetSlider
  items={contacts}
  selectedLetter={letterFilter}
  onLetterSelect={setLetterFilter}
/>
```

**UI Behavior:**
- Shows "All" button at top to clear filter
- Letters with contacts are highlighted, others dimmed/disabled
- Shows count on hover (e.g., "A (12 contacts)")
- Clicking same letter again clears filter
- Hidden on mobile (`hidden md:flex`) to avoid cramped UI
- Auto-clears when search query is entered

**Gotchas:**
- Component uses `useMemo` for performance with large contact lists
- Letter availability and counts are computed from items array
- Expects `firstName` property on items (configurable via `useLastName` prop)

**Extending this:**
- To use on contacts page: Import and add state management
- To filter by lastName: Pass `useLastName={true}` prop
- To customize styling: Pass `className` prop

---

### Phone Area Code Hometown Suggestion

**What it does:** Suggests hometown location based on US phone number area code when adding/editing contacts.

**Key files:**
- `src/lib/area-codes.ts` - 160 US area codes mapped to city/state
- `src/components/contacts/HometownSuggestion.tsx` - Suggestion UI with accept/dismiss
- `src/components/contacts/ContactForm.tsx` - Integrated below location field (lines 242-246)

**Integration pattern:**
```typescript
// In ContactForm
const primaryPhone = watch('primaryPhone');
const location = watch('location');

<HometownSuggestion
  phone={primaryPhone}
  currentLocation={location}
  onAccept={(suggested) => setValue('location', suggested)}
/>
```

**Area Code Parsing:**
```typescript
// Handles various phone formats
extractAreaCode('+1 (415) 555-1234') → '415'
extractAreaCode('415-555-1234')      → '415'
extractAreaCode('4155551234')        → '415'

// Returns city, state
getAreaCodeInfo('+1-415-555-1234')   → {
  code: '415',
  city: 'San Francisco',
  state: 'California',
  stateAbbr: 'CA'
}
```

**UI Behavior:**
- Only shows if phone has valid area code AND location is empty
- Displays: "Based on area code (415), this might be: San Francisco, CA"
- Two buttons: "Use This" (fills location) or "Dismiss" (hides suggestion)
- Uses Framer Motion for smooth appear/disappear animation
- Resets dismissed state when phone number changes

**Coverage:**
- 160 major US metro areas across all 50 states
- Includes: NYC, LA, SF, Chicago, Houston, Seattle, Boston, Austin, etc.

**Gotchas:**
- Only works for US/Canada phone numbers (+1 country code)
- Won't show if location field already has a value
- User dismissal persists until phone number changes
- Accuracy varies by area code (some cover large regions)

**Extending this:**
- To add more area codes: Update `US_AREA_CODES` in `area-codes.ts`
- To support international: Add country code detection logic
- To use elsewhere: Import `HometownSuggestion` component (reusable)

---

### Enrichment Completion Gamification

**What it does:** Celebration UI with animations, sounds, and score improvements after enrichment.

**Key files:**
- `src/components/enrichment/completion/CompletionCelebration.tsx` - Main celebration
- `src/components/enrichment/completion/RankCelebration.tsx` - Rank-up animations
- `src/components/enrichment/completion/useCelebrationSounds.ts` - Sound effects
- `src/app/api/enrichment/completion-data/route.ts` - Score calculation

**Integration points:**
- Triggered after enrichment save
- Compares before/after enrichment scores
- Shows rank promotions (0-25, 26-50, 51-75, 76-100)
- Plays sound effects (optional, user-controlled)

**Rank Thresholds:**
```typescript
const ranks = [
  { min: 0, max: 25, name: 'Getting Started', color: '#A0A0A8' },
  { min: 26, max: 50, name: 'Building Depth', color: '#3B82F6' },
  { min: 51, max: 75, name: 'Well Connected', color: '#A855F7' },
  { min: 76, max: 100, name: 'Fully Enriched', color: '#d4a54a' }
];
```

**Sound effects:**
- Rank up: Triumph sound
- Score increase: Success chime
- Streaks: Achievement unlock

---

### Onboarding Story Slides Pattern

**What it does:** Instagram-style story slides for first-time user onboarding. Communicates the core value proposition ("describe what you need → right people appear instantly") with animated demos.

**Key files:**
- `src/app/(dashboard)/onboarding/page.tsx` - Full-screen onboarding route
- `src/components/onboarding/StoryOnboarding.tsx` - Main container with auto-advance timer and tap navigation
- `src/components/onboarding/StoryProgressBar.tsx` - 6-segment progress bar with gold fill
- `src/components/onboarding/slides/SlideLayout.tsx` - Reusable visual/headline/subline layout
- `src/components/onboarding/slides/Slide3MagicMoment.tsx` - Animated typewriter + contact cards (THE MONEY SHOT)
- `src/components/onboarding/slides/Slide5EnrichmentPreview.tsx` - Animated timer + bubbles demo
- `src/app/api/user/complete-onboarding/route.ts` - POST endpoint to mark completion

**Database:**
```prisma
model User {
  hasCompletedOnboarding  Boolean   @default(false)
}
```

**Flow:**
1. New user logs in → `layout.tsx` checks `hasCompletedOnboarding`
2. If false → redirect to `/onboarding`
3. 6 slides auto-advance (~6.6s each), pause on final CTA
4. Tap right → advance, tap left → go back
5. CTA button calls API → sets flag true → redirects to `/contacts/new`

**Integration points:**
- `src/app/(dashboard)/layout.tsx` - Checks onboarding status, redirects if needed
- `src/lib/supabase/middleware.ts` - Adds `x-pathname` header for server components
- Onboarding page renders WITHOUT AppShell (full-screen experience)

**Animation patterns used:**
```typescript
// Typewriter effect (Slide 3)
const typeInterval = setInterval(() => {
  setTypedText(QUERY.slice(0, charIndex + 1));
  charIndex++;
}, 25); // ~2s for full query

// Spring animations for contact cards
transition={{ type: "spring", stiffness: 400, damping: 25 }}

// Staggered bubble appearance (Slide 5)
setTimeout(() => setVisibleBubbles(1), 1500);
setTimeout(() => setVisibleBubbles(2), 2500);
setTimeout(() => setVisibleBubbles(3), 3500);
```

**Gotchas:**
- Use `x-pathname` header (set in middleware) to detect current route in server components
- Onboarding route must be in protected paths array in middleware
- CTA button needs `e.stopPropagation()` to prevent tap navigation interference
- Default `hasCompletedOnboarding` to `true` in error cases to avoid redirect loops

**Extending this:**
- To add new slides: Create component in `slides/`, add to `StoryOnboarding.tsx` switch
- To adjust timing: Modify `prev + 1.5` in setInterval (1.5 = ~6.6s per slide)
- To change slide count: Update `TOTAL_SLIDES` constant

---

### E2E Testing Pattern (Quick-Check)

**What it does:** Ephemeral Playwright E2E tests that validate feature functionality and auto-delete after execution. Used for quick verification, not persistent test suites.

**Key files:**
- `.quick-checks/playwright.config.ts` - Playwright config (baseURL, timeout, headless settings)
- `.quick-checks/auth-helper.ts` - Login helper with test user credentials
- `.quick-checks/setup-test-user.ts` - Script to create Supabase test user programmatically
- `.quick-checks/test-*.spec.ts` - Ephemeral test files (auto-deleted after run)

**Test Infrastructure:**
```typescript
// Test user credentials (in auth-helper.ts)
export const TEST_USER = {
  email: 'e2e-test@betterconnections.dev',
  password: 'TestPassword123!',
};

// Login helper pattern
export async function loginViaUI(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(TEST_USER.email);
  await page.getByLabel('Password').fill(TEST_USER.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/contacts', { timeout: 10000 });
}
```

**Creating Test User:**
```typescript
// Uses Supabase Admin API (requires service role key)
const { data, error } = await supabase.auth.admin.createUser({
  email: TEST_USER.email,
  password: TEST_USER.password,
  email_confirm: true, // Skip email verification
  user_metadata: { name: TEST_USER.name },
});
```

**Running Tests:**
```bash
cd .quick-checks
npx playwright test test-name.spec.ts --headed  # Visual debugging
npx playwright test --ui                        # Interactive mode
```

**Critical Gotchas:**

1. **Strict Mode Locator Violations**
   ```typescript
   // WRONG - .or() can match multiple elements (strict mode error)
   const btn = page.getByRole('button', { name: /Submit/ }).or(page.getByText('Submit'));

   // CORRECT - Check visibility individually
   const submitBtn = page.getByRole('button', { name: /Submit/i });
   const isVisible = await submitBtn.isVisible().catch(() => false);
   ```

2. **Multiple Fields with Similar Labels**
   ```typescript
   // WRONG - Matches both "Primary Phone" and "Secondary Phone"
   const phone = page.getByLabel(/Phone/i);

   // CORRECT - Use exact label
   const phone = page.getByLabel('Primary Phone');
   ```

3. **VCF Import Dual-Flow Testing**
   - First run: Auto-imports new contacts (no duplicates)
   - Subsequent runs: Shows duplicate review flow
   - Solution: Make tests handle both scenarios gracefully
   ```typescript
   const isComplete = await page.getByText(/Import Complete/i).isVisible().catch(() => false);
   const isReview = await page.getByText(/Review Import Conflicts/i).isVisible().catch(() => false);

   if (isReview) {
     // Handle duplicate review...
   } else if (isComplete) {
     // Handle completion...
   }
   ```

4. **Async UI Updates**
   - Enrichment completion triggers async score calculation
   - Mentioned contacts extraction happens after enrichment save
   - Solution: Add explicit waits with `.waitForTimeout(2000)` after state changes

**Test Coverage (Validated Features):**
- ✅ VCF file upload with duplicate detection and merge review
- ✅ Mentioned contacts extraction and matching
- ✅ Enrichment completion gamification (celebration UI)
- ✅ Alphabet slider navigation (A-Z filtering)
- ✅ Phone area code → hometown suggestion

**Extending this:**
- To add new test: Create `.quick-checks/test-feature.spec.ts`
- To create test data: Use factories or inline test objects
- To debug: Use `--headed` flag to see browser
- To skip cleanup: Manually save test file outside `.quick-checks/`

---

### Mobile Viewport UX Pattern

**What it does:** Mobile-first responsive design for viewports under 768px, replacing desktop table view with touch-optimized contact cards, bottom navigation, swipe gestures, and progressive disclosure.

**Key files:**
- `src/hooks/useMediaQuery.ts` - SSR-safe media query hook with undefined initial state
- `src/components/layout/BottomNav.tsx` - Fixed bottom navigation with safe area support
- `src/components/contacts/ContactCard.tsx` - Expandable contact card with progressive disclosure
- `src/components/contacts/ContactCardList.tsx` - Virtualized list with expansion state management
- `src/components/contacts/ContactsView.tsx` - Viewport-aware switcher (mobile cards vs desktop table)
- `src/components/ui/SwipeableCard.tsx` - Native Touch API swipe gesture wrapper
- `src/components/ui/PullToRefresh.tsx` - Pull-to-refresh gesture with resistance feel
- `src/components/ui/FAB.tsx` - Floating action button with scroll-aware visibility
- `src/components/ui/FilterDrawer.tsx` - Bottom sheet drawer component

**Dependencies:**
- `react-window` v2.2.3 - Virtualized list rendering (NOTE: v2 has different API than v1)
- `use-debounce` - Debounced scroll handling for FAB
- `framer-motion` - Animations (expand/collapse, scroll transitions)

**Critical Gotchas:**

1. **react-window v2 API Differences**
   ```typescript
   // WRONG - v1 API (FixedSizeList class doesn't exist in v2)
   import { FixedSizeList } from 'react-window';
   <FixedSizeList />

   // CORRECT - v2 API (List function with generic typing)
   import { List, type ListImperativeAPI } from 'react-window';

   <List<ContactRowProps>
     listRef={listRef}
     rowComponent={ContactRow}
     rowProps={{ contacts, expandedId, onExpand }}
     rowHeight={CARD_HEIGHT + CARD_GAP}
   />
   ```

2. **Touch Event Null Safety**
   ```typescript
   // WRONG - TypeScript error: Object is possibly undefined
   const x = e.touches[0].clientX;

   // CORRECT - Check for undefined touch
   const touch = e.touches[0];
   if (!touch) return;
   const x = touch.clientX;
   ```

3. **SSR-Safe Media Queries**
   ```typescript
   // useMediaQuery returns undefined during SSR/initial hydration
   const isMobile = useMediaQuery();

   // MUST handle undefined state to avoid hydration mismatch
   if (isMobile === undefined) {
     return <Skeleton />; // Show skeleton during hydration
   }

   return isMobile ? <MobileView /> : <DesktopView />;
   ```

4. **Tag Category Enum Values**
   ```typescript
   // WRONG - Lowercase values don't match TagCategory type
   tag.category === 'relationship'  // Type error!

   // CORRECT - Use uppercase enum values
   tag.category === 'RELATIONSHIP'  // RELATIONSHIP | OPPORTUNITY | EXPERTISE | INTEREST
   ```

5. **Fixed Row Heights in Virtualized Lists**
   - react-window v2 uses fixed row heights for performance
   - Expanded cards can exceed allocated height (clipping issue)
   - Solution: Constrain expanded content maxHeight to fit within row height
   ```typescript
   // Collapsed card: 100px + 12px gap = 112px per row
   // Expanded card: Limited to 200px maxHeight to avoid clipping
   <motion.div
     animate={{ maxHeight: isExpanded ? 200 : 0 }}
     className="overflow-hidden"
   >
   ```

**Integration Pattern:**
```typescript
// 1. Create viewport-aware view switcher
export function ContactsView() {
  const isMobile = useMediaQuery(); // Returns undefined during SSR

  if (isMobile === undefined) {
    return <Skeleton />; // Prevent hydration mismatch
  }

  if (isMobile) {
    return (
      <>
        <ContactCardList contacts={contacts} />
        <FAB onClick={() => router.push('/contacts/new')} />
      </>
    );
  }

  return <ContactsTable />;
}

// 2. Wrap card in SwipeableCard for gestures
<SwipeableCard
  onSwipeRight={handleEnrich}
  disabled={isExpanded}  // Disable swipe when expanded
>
  <ContactCard
    contact={contact}
    isExpanded={isExpanded}
    onExpand={handleToggle}
  />
</SwipeableCard>
```

**Mobile-Specific Tailwind Utilities:**
```javascript
// tailwind.config.ts additions
padding: {
  safe: 'env(safe-area-inset-bottom)',  // iPhone notch support
},
zIndex: {
  '45': '45',  // Between FAB (40) and modals (50)
},
colors: {
  'bg-oled': '#121212',  // OLED-optimized blacks
}
```

**Touch Target Requirements:**
- Minimum 44px × 44px for all interactive elements
- Icon buttons: `className="h-11 w-11 md:h-10 md:w-10"` (44px on mobile)
- Hamburger menu: Fixed to 44px minimum
- Card tap area: Entire card surface

**Accessibility:**
```typescript
// Cards support both tap and keyboard navigation
<div
  role="button"
  tabIndex={0}
  onClick={handleTap}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {  // Space key too
      e.preventDefault();
      handleTap();
    }
  }}
  aria-expanded={isExpanded}
  aria-label={`${name}. ${isExpanded ? 'Collapse' : 'Expand'} for details`}
>
```

**Performance Optimizations:**
- `React.memo` on ContactCard to prevent unnecessary re-renders
- `useCallback` for event handlers to maintain referential equality
- Virtualization limits DOM nodes (only renders visible cards + overscan)
- Debounced scroll handler for FAB visibility (100ms delay)

**Extending this:**
- To add swipe gestures to other components: Wrap with `<SwipeableCard />`
- To change expanded content height: Update `maxHeight` in ContactCard animation
- To customize FAB position: Modify `bottom-20` class (accounts for BottomNav height)
- To add haptic feedback: Use `navigator.vibrate()` in swipe handlers

**Related Documentation:**
- Spec: `specs/mobile-viewport-ux-audit/02-spec.md`
- Tasks: `specs/mobile-viewport-ux-audit/03-tasks.md`
- Implementation: `specs/mobile-viewport-ux-audit/04-implementation.md`

---

### Design System Color Standardization

**What it does:** Ensures consistent use of the 33 Strategies brand gold color (#d4a54a) across all UI components through Tailwind utility classes and design system constants.

**Key files:**
- `tailwind.config.ts` - Gold color definitions (gold-primary, gold-light, gold-subtle, gold-glow)
- `src/lib/design-system.ts` - BRAND_GOLD constants for JS usage
- `src/app/globals.css` - CSS custom properties (--gold-primary, --gold-light, etc.)

**Color System:**
```typescript
// Tailwind classes (preferred)
text-gold-primary      // #d4a54a
bg-gold-primary        // #d4a54a
border-gold-primary    // #d4a54a
hover:bg-gold-light    // #e5c766
bg-gold-subtle         // rgba(212, 165, 74, 0.15)

// JS constants (for inline styles)
import { BRAND_GOLD } from '@/lib/design-system';
BRAND_GOLD.primary     // "#d4a54a"
BRAND_GOLD.light       // "#e5c766"
BRAND_GOLD.subtle      // "rgba(212, 165, 74, 0.15)"
BRAND_GOLD.glow        // "rgba(212, 165, 74, 0.3)"
```

**Integration pattern:**
```typescript
// CORRECT - Use Tailwind classes
<Button className="bg-gold-primary hover:bg-gold-light text-black">

// CORRECT - Use design system constants for inline styles
<div style={{ background: BRAND_GOLD.glow }}>

// WRONG - Hardcoded hex values
<Button className="bg-[#d4a54a]">  // Avoid, use gold-primary instead
```

**Critical Gotchas:**

1. **Inline gradients need hex values** - Tailwind classes don't work in `style` props:
   ```typescript
   // For gradients, use hex directly or extract to design system
   style={{
     background: "linear-gradient(90deg, #d4a54a, #e5c766)"
   }}
   ```

2. **SVG stroke/fill colors** - Use hex values directly for SVG attributes:
   ```typescript
   <svg>
     <circle stroke="#d4a54a" fill="rgba(212, 165, 74, 0.15)" />
   </svg>
   ```

3. **Search for old color references** - When updating colors:
   ```bash
   # Find all hardcoded old gold color references
   grep -r "#C9A227\|rgba(201.*162.*39" src/
   ```

**Extending this:**
- New gold variants: Add to `tailwind.config.ts` theme.extend.colors.gold
- Gradient utilities: Add to `tailwind.config.ts` theme.extend.backgroundImage
- Other color families: Follow same pattern (category colors, success/error states)

**Location:** Design system defined in `tailwind.config.ts:43-48`, `src/lib/design-system.ts:1-8`, `src/app/globals.css:17-21`

---

## Data Models

### Contact
```typescript
interface Contact {
  id: string;
  userId: string;

  // Basic Info
  name: string;
  email?: string;
  title?: string;
  company?: string;
  location?: string;
  linkedinUrl?: string;
  phone?: string;

  // Relationship Context
  howWeMet?: string;
  relationshipStrength: 1 | 2 | 3 | 4; // Weak, Casual, Good, Strong
  lastContactDate?: Date;
  relationshipHistory?: string;

  // Why Now (Key Differentiator - 20 points in enrichment score)
  whyNow?: string;

  // Profile
  expertise?: string;
  interests?: string;

  // Organization
  tags: Tag[];
  notes?: string;

  // Metadata
  enrichmentScore: number; // 0-100, calculated from field completeness
  source: 'manual' | 'csv' | 'google' | 'linkedin' | 'icloud' | 'outlook';
  createdAt: Date;
  updatedAt: Date;
  lastEnrichedAt?: Date;
}
```

### Enrichment Score Calculation
```typescript
function calculateEnrichmentScore(contact: Contact): number {
  let score = 0;

  if (contact.name) score += 10;
  if (contact.email) score += 10;
  if (contact.title) score += 10;
  if (contact.company) score += 10;
  if (contact.location) score += 5;
  if (contact.linkedinUrl) score += 5;
  if (contact.howWeMet) score += 15;
  if (contact.whyNow) score += 20;  // Most valuable field
  if (contact.tags.length > 0) score += 5;
  if (contact.notes) score += 10;

  return score; // Max 100
}
```

### Tag
```typescript
interface Tag {
  id: string;
  text: string;
  category: 'relationship' | 'opportunity' | 'expertise' | 'interest';
}
```

### User
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;

  // Connected Accounts
  googleConnected: boolean;
  googleEmail?: string;
  linkedinConnected: boolean;
  icloudConnected: boolean;
  outlookConnected: boolean;

  // Preferences
  emailNotifications: boolean;
  weeklyDigest: boolean;
  enrichmentReminders: boolean;

  // Metadata
  createdAt: Date;
  lastLoginAt: Date;
}
```

---

## API Endpoints

### Auth
```
POST /api/auth/signup        - Create account
POST /api/auth/login         - Login (returns JWT)
POST /api/auth/logout        - Logout
POST /api/auth/forgot        - Request password reset
POST /api/auth/reset         - Reset password with token
POST /api/auth/google        - OAuth with Google
POST /api/auth/apple         - OAuth with Apple
```

### Contacts
```
GET    /api/contacts                       - List contacts (with search, filter, sort, pagination)
GET    /api/contacts/:id                   - Get single contact
POST   /api/contacts                       - Create contact
PUT    /api/contacts/:id                   - Update contact
DELETE /api/contacts/:id                   - Delete contact
DELETE /api/contacts/bulk                  - Bulk delete

POST   /api/contacts/import/csv            - Import from CSV
POST   /api/contacts/import/vcf            - Upload VCF, analyze duplicates
POST   /api/contacts/import/vcf/commit     - Commit VCF import with merge decisions
POST   /api/contacts/import/google         - Import from Google Contacts
GET    /api/contacts/export                - Export all contacts as CSV

POST   /api/contacts/match-mentions        - Match mentioned people to contacts
GET    /api/contacts/mentions/:id          - Get mentioned people for contact
```

### Tags
```
GET    /api/tags                    - List all tags for user
POST   /api/contacts/:id/tags       - Add tag to contact
DELETE /api/contacts/:id/tags/:tagId - Remove tag from contact
```

### Enrichment
```
GET    /api/enrichment/queue             - Get prioritized queue
GET    /api/enrichment/stats             - Get enrichment stats
POST   /api/enrichment/:id/skip          - Skip contact in queue
POST   /api/enrichment/extract           - Extract structured data from voice transcript
POST   /api/enrichment/extract-mentions  - Extract mentioned people from notes
POST   /api/enrichment/refine-notes      - Refine/clean notes with AI
GET    /api/enrichment/completion-data   - Get before/after scores for celebration
```

### AI / Chat (Claude Integration)
```
POST   /api/chat/explore            - Send exploration query, get response + contact suggestions
POST   /api/chat/draft-intro        - Generate intro draft for contact
POST   /api/chat/suggest-tags       - Get AI tag suggestions for contact
```

### User / Settings
```
GET    /api/user                    - Get current user
PUT    /api/user                    - Update user profile
PUT    /api/user/password           - Change password
DELETE /api/user                    - Delete account
```

---

## Page Architecture

```
/                       → Redirect to /login or /contacts
/login                  → Login page
/signup                 → Signup page
/forgot-password        → Password reset request
/contacts               → Main contacts table (default landing after auth)
/contacts/new           → Add contact manually
/contacts/import        → Import contacts (CSV, integrations)
/contacts/:id           → Contact detail/edit page
/enrich                 → Enrichment queue page
/explore                → Chat-based network exploration
/settings               → Account settings
```

### App Shell
- Sidebar width: 240px (expanded), 64px (collapsed)
- Background: #0D0D0F
- Border-right: 1px solid rgba(255,255,255,0.08)
- Active nav state: Gold left border + subtle gold background

---

## Claude AI Integration

### Chat Exploration Prompt Template
```
You are an AI assistant helping a user explore their professional network.
You have access to their contact database.

User's contacts: {serialized_contacts}

User query: {user_message}

Respond conversationally and suggest relevant contacts from their network.
When suggesting contacts, format them as:
[CONTACT: {contact_id}] {name} - {reason_for_suggestion}

Be helpful, concise, and focus on actionable insights about their network.
```

### Draft Intro Prompt Template
```
Write a brief, warm introduction message for the following context:

Contact: {contact_name}
Their role: {contact_title} at {contact_company}
How we know each other: {how_we_met}
Why reaching out now: {why_now}
User's goal: {user_intent if provided}

Write a 2-3 sentence intro that:
- Feels personal, not templated
- References shared context
- Has a clear but soft ask
- Matches a professional but warm tone
```

---

## Prototype Files Reference

All prototype files are JSX using inline styles (no Tailwind) for universal rendering.
They use Framer Motion for animations and Lucide React for icons.

| File | Description |
|------|-------------|
| `BetterConnectionsPrototype.jsx` | Original gamified enrichment + chat |
| `AppShellContactsTable.jsx` | Sidebar nav + contacts table |
| `AppShellWithContactDetail.jsx` | Combined shell with detail view |
| `ContactDetailPage.jsx` | Single contact view/edit |
| `AddContactImportPage.jsx` | Add/import contacts |
| `AuthPages.jsx` | Login/signup/forgot |
| `EnrichmentQueuePage.jsx` | Queue management |
| `SettingsPage.jsx` | Account settings |

---

## Implementation Phases

### Phase 1: Core Infrastructure
1. Database setup and migrations
2. Auth system (signup, login, password reset)
3. Basic CRUD for contacts
4. Contact list with search/filter/sort

### Phase 2: Contact Management
5. Contact detail view with editing
6. Tags system
7. CSV import with field mapping
8. Export functionality

### Phase 3: Enrichment
9. Enrichment score calculation
10. Enrichment queue with prioritization
11. Basic enrichment flow (form-based first)
12. Gamified enrichment with timer (voice-first)

### Phase 4: AI Features
13. Claude integration for chat exploration
14. Draft intro generation
15. AI tag suggestions

### Phase 5: Polish
16. OAuth integrations (Google, LinkedIn)
17. Settings page functionality
18. Notifications system
19. Performance optimization

---

## Success Metrics for V1

- User can sign up and log in
- User can add contacts manually
- User can import contacts from CSV
- User can view, edit, and delete contacts
- User can search and filter contacts
- User can enrich contacts through guided flow
- User can explore network via chat
- User can export all contacts
- App performs well with 500+ contacts

---

## Key Documentation Files

| File | Purpose |
|------|---------|
| `Better_Connections_Claude_Code_Handoff.md` | Full technical handoff |
| `Better_Connections_MVP_Design_Spec.md` | Detailed UI/UX specifications |
| `Better_Connections_Vision.md` | Product vision and strategy |
| `Better_Connections_Nice_to_Haves.md` | Future enhancements |
| `Better_Connections_Building_Blocks.md` | Library/framework research |
| `Better_Connections_V1_Design_Spec.md` | V1 specific design spec |

---

## Quick Reference

**Project:** Better Connections (Personal CRM)
**Stack:** Next.js 14 + Supabase PostgreSQL + Prisma + OpenAI GPT-4o-mini + shadcn/ui
**Auth:** Supabase Auth (email/password)
**Design:** Dark theme, gold accents (#d4a54a), glassmorphism
**Core Feature:** "Why Now" contextual relevance for contacts
**Last Updated:** 2026-01-04
