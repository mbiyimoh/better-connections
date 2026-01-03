# Spec C: Mention Matching Improvements

## Overview

Fix the "wrong Scott" bug where the mention matching algorithm selects the first alphabetical match instead of using contextual signals to pick the most relevant contact.

**Source:** Emily feedback session (Jan 2026)
**Priority:** High - core enrichment UX issue
**Estimated Complexity:** Medium

---

## Problem Statement

When users mention people during voice enrichment (e.g., "I met Scott from Stripe at the conference"), the current matching algorithm:

1. Uses pg_trgm fuzzy matching with 0.3 similarity threshold
2. Returns the **first alphabetical match** when multiple contacts match
3. Ignores contextual clues from the enrichment transcript (company, email domain, expertise)

**Example Bug:**
- User says: "Scott from Stripe mentioned their new API"
- Database has: Scott Adams (Acme Corp), Scott Chen (Stripe), Scott Miller (TechCo)
- Current behavior: Matches "Scott Adams" (first alphabetically)
- Expected behavior: Matches "Scott Chen" (context says "Stripe")

---

## Current Implementation Analysis

### Match Mentions API (`src/app/api/contacts/match-mentions/route.ts`)

```typescript
// Current algorithm (simplified):
const result = await prisma.$queryRaw`
  SELECT *, similarity(name, ${name}) as sim
  FROM "Contact"
  WHERE similarity(name, ${name}) > 0.3
  ORDER BY sim DESC
  LIMIT 5
`;
// Problem: No context scoring, just similarity
```

**Current MatchType enum:** EXACT, FUZZY, PHONETIC, NONE

**Current confidence calculation:** Based solely on string similarity (0-1)

### Extract Mentions API (`src/app/api/enrichment/extract-mentions/route.ts`)

GPT-4o-mini extracts mentions with context:
```typescript
// Schema from lib/schemas/mentionExtraction.ts
{
  name: string;        // "Scott"
  context: string;     // "from Stripe, API expert"
  relationship: string; // "met at conference"
}
```

**Key insight:** Context is extracted but NOT used in matching!

### MentionedPersonCard (`src/components/enrichment/completion/MentionedPersonCard.tsx`)

- Shows matched contact with confidence badge
- Has `alternativeMatches` dropdown for fuzzy matches
- Actions: Link, Create New, Dismiss
- Missing: Manual search/link override

---

## Proposed Solution

### 1. Context-Aware Scoring Algorithm

Add context signals to the matching score:

```typescript
interface ContextScore {
  nameMatch: number;      // 0-50 points (existing similarity)
  companyMatch: number;   // 0-30 points (company mentioned in context)
  domainMatch: number;    // 0-20 points (email domain matches)
}
// Total: 0-100 normalized to 0-1 confidence
```

**Scoring Rules:**
- **Name match** (50 points): Existing pg_trgm similarity score
- **Company match** (30 points): Context mentions company name that matches contact's company
- **Domain match** (20 points): Email domain appears in context (e.g., "@stripe.com")

**Deferred (YAGNI):**
- Expertise tag matching - rarely mentioned in voice, adds query complexity
- Recency boost - nice-to-have, can add in ~5 minutes if needed later

### 2. Enhanced Match Response

```typescript
interface EnhancedMatch {
  contact: Contact;
  confidence: number;        // 0-1 composite score
  matchType: MatchType;
  matchReasons: string[];    // ["Company: Stripe", "Name: 85% similar"]
}
```

Note: `matchReasons` provides sufficient context for users. No need for separate `contextSignals` object.

### 3. Show All Matches Ranked by Score (Key UX)

**The core UX improvement:** When multiple contacts match a name (e.g., "Scott"), show ALL of them ranked by composite score so users can choose the right one.

**Current behavior:** Shows best match only, alternatives hidden in dropdown (fuzzy matches only)

**New behavior:**
1. **Always show top match** with confidence badge and match reasons
2. **Show "Other matches" section** with ALL other matching contacts, ranked by score
3. **Each alternative displays:**
   - Contact name + company
   - Confidence score (e.g., "72%")
   - Match reasons (e.g., "Name: 85% match" but no company match)
4. **One-click to select** any alternative as the correct match

```
┌─────────────────────────────────────────────────┐
│ 👤 Scott                                    [X] │
│    "from Stripe mentioned their new API"        │
│                                                 │
│ ✓ Best match: Scott Chen (Stripe)         92%  │
│   [Company: Stripe] [Name: 85%]                 │
│   [Link] [Enrich Now]                           │
│                                                 │
│ ▼ Other matches (2)                             │
│   ├─ Scott Adams (Acme Corp)              43%   │
│   │  [Name: 85%]                                │
│   │  [Select]                                   │
│   └─ Scott Miller (TechCo)                41%   │
│      [Name: 82%]                                │
│      [Select]                                   │
│                                                 │
│ [🔍 Search & Link Different Contact]            │
└─────────────────────────────────────────────────┘
```

### 4. Manual Link Override UI (Fallback)

When the correct contact isn't in the matches at all:

1. Add "Search & Link" button to MentionedPersonCard
2. Open modal with contact search (reuse existing search)
3. Show context excerpt to help user pick correct contact
4. Allow linking any contact from search results

---

## Technical Implementation

### Phase 1: Context-Aware Scoring

**File:** `src/app/api/contacts/match-mentions/route.ts`

```typescript
async function scoreMatchWithContext(
  contact: Contact,
  mentionName: string,
  mentionContext: string
): Promise<{ score: number; reasons: string[] }> {
  const reasons: string[] = [];
  let score = 0;
  const contextLower = mentionContext.toLowerCase();

  // Name similarity (0-50)
  const nameSim = similarity(contact.name, mentionName);
  score += nameSim * 50;
  reasons.push(`Name: ${Math.round(nameSim * 100)}% match`);

  // Company match (0-30) - THE KEY FIX
  if (contact.company && contextLower.includes(contact.company.toLowerCase())) {
    score += 30;
    reasons.push(`Company: ${contact.company}`);
  }

  // Email domain match (0-20)
  if (contact.email) {
    const domain = contact.email.split('@')[1];
    if (domain && contextLower.includes(domain.toLowerCase())) {
      score += 20;
      reasons.push(`Domain: @${domain}`);
    }
  }

  return { score: score / 100, reasons };
}
```

### Phase 2: API Updates

**File:** `src/app/api/contacts/match-mentions/route.ts`

Update request schema to include context:
```typescript
const requestSchema = z.object({
  mentions: z.array(z.object({
    name: z.string(),
    context: z.string().optional(),  // NEW: Pass context for scoring
    relationship: z.string().optional(),
  })),
  contactId: z.string(), // Primary contact being enriched
});
```

Update response to include match reasons:
```typescript
interface MatchResult {
  mention: { name: string; context?: string };
  bestMatch: {
    contact: Contact;
    confidence: number;
    matchType: MatchType;
    matchReasons: string[];  // NEW
  } | null;
  alternativeMatches: Array<{
    contact: Contact;
    confidence: number;
    matchReasons: string[];  // NEW
  }>;
}
```

### Phase 3: Ranked Matches UI

**File:** `src/components/enrichment/completion/MentionedPersonCard.tsx`

Update to always show ranked alternatives:

```tsx
// Replace current alternativeMatches dropdown with always-visible section
{mention.alternativeMatches && mention.alternativeMatches.length > 0 && (
  <div className="mt-3 border-t border-zinc-700 pt-3">
    <button
      onClick={() => setShowAlternatives(!showAlternatives)}
      className="text-xs text-zinc-400 hover:text-zinc-300 flex items-center gap-1"
    >
      {showAlternatives ? <ChevronUp /> : <ChevronDown />}
      Other matches ({mention.alternativeMatches.length})
    </button>

    <AnimatePresence>
      {showAlternatives && (
        <motion.div className="mt-2 space-y-2">
          {mention.alternativeMatches.map((alt) => (
            <div key={alt.id} className="flex items-center justify-between p-2 rounded bg-zinc-800/50">
              <div>
                <span className="text-sm text-zinc-300">
                  {alt.firstName} {alt.lastName}
                </span>
                {alt.company && (
                  <span className="text-xs text-zinc-500 ml-1">({alt.company})</span>
                )}
                {/* Show match reasons for each alternative */}
                <div className="flex gap-1 mt-1">
                  {alt.matchReasons?.map((reason, i) => (
                    <span key={i} className="text-xs bg-zinc-700 px-1.5 py-0.5 rounded text-zinc-400">
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">
                  {Math.round(alt.confidence * 100)}%
                </span>
                <button
                  onClick={() => handleAction("link", alt.id)}
                  className="text-xs px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
                >
                  Select
                </button>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
)}
```

**Key changes from current implementation:**
- Show "Other matches" for ALL match types (not just fuzzy < 70%)
- Display match reasons for each alternative
- Include company name for context
- One-click "Select" button for each alternative

### Phase 4: Manual Link Override UI

**File:** `src/components/enrichment/completion/MentionedPersonCard.tsx`

Add "Search & Link" action (fallback when correct contact not in matches):
```tsx
// New state
const [showSearchModal, setShowSearchModal] = useState(false);

// In actions section
<Button
  variant="ghost"
  size="sm"
  onClick={() => setShowSearchModal(true)}
>
  <Search className="w-4 h-4 mr-1" />
  Search & Link
</Button>

// Modal component
<ContactSearchModal
  open={showSearchModal}
  onClose={() => setShowSearchModal(false)}
  onSelect={(contact) => {
    onLink(mention.id, contact.id);
    setShowSearchModal(false);
  }}
  contextHint={mention.context}
/>
```

**New File:** `src/components/enrichment/completion/ContactSearchModal.tsx`

```tsx
interface ContactSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (contact: Contact) => void;
  contextHint?: string;
}

export function ContactSearchModal({ open, onClose, onSelect, contextHint }: ContactSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Contact[]>([]);

  // Debounced search against /api/contacts?search=query
  // Show context hint at top to help user
  // Render contact list with click-to-select
}
```

### Phase 4: Display Match Reasons

**File:** `src/components/enrichment/completion/MentionedPersonCard.tsx`

Show why a match was selected:
```tsx
{match.matchReasons && match.matchReasons.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-1">
    {match.matchReasons.map((reason, i) => (
      <span key={i} className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
        {reason}
      </span>
    ))}
  </div>
)}
```

---

## Database Changes

None required. Existing `ContactMention` model supports all needed fields:
- `matchConfidence` - Will store composite score
- `matchType` - Existing enum sufficient
- `status` - Existing statuses work

Optional enhancement: Add `matchReasons` JSON field to persist reasons:
```prisma
model ContactMention {
  // ... existing fields
  matchReasons Json?  // Store ["Company: Stripe", "Name: 85%"]
}
```

---

## Test Scenarios

### Scenario 1: Multiple Scotts - User Can Choose (Core Fix)
- **Input:** Mention "Scott" with context "from Stripe mentioned their new API"
- **Contacts:** Scott Adams (Acme), Scott Chen (Stripe), Scott Miller (TechCo)
- **Expected behavior:**
  1. Scott Chen shown as "Best match" with 92% confidence
  2. Match reasons show: [Company: Stripe] [Name: 85%]
  3. "Other matches (2)" section visible with:
     - Scott Adams (43%): [Name: 85%] only
     - Scott Miller (41%): [Name: 82%] only
  4. User can click "Select" on any alternative if auto-match is wrong

### Scenario 2: Company Context Match
- **Input:** Mention "Scott" with context "from Stripe"
- **Contacts:** Scott Adams (Acme), Scott Chen (Stripe)
- **Expected:** Scott Chen ranked first with high confidence
- **Reason displayed:** "Company: Stripe"

### Scenario 3: Email Domain Match
- **Input:** Mention "Sarah" with context "sarah@techcorp.com emailed me"
- **Contacts:** Sarah Jones (Unknown), Sarah Miller (TechCorp, sarah.miller@techcorp.com)
- **Expected:** Sarah Miller matched
- **Reason displayed:** "Domain: @techcorp.com"

### Scenario 3: No Context Available
- **Input:** Mention "John" with no context
- **Contacts:** Multiple Johns
- **Expected:** Show alternatives with equal confidence
- **UI:** Prominent "Search & Link" button

### Scenario 4: Manual Override
- **Input:** Auto-matched wrong contact
- **Action:** User clicks "Search & Link"
- **Expected:** Modal opens, user searches, selects correct contact
- **Result:** ContactMention updated with new `mentionedContactId`

---

## Success Criteria

1. **All matches shown ranked:** When multiple contacts match a name, ALL are displayed ranked by composite score
2. **User can choose any match:** One-click to select any alternative, not just the top match
3. **Context signals improve ranking:** When company/domain mentioned, correct contact ranks first
4. **Match reasons visible:** Users understand WHY each contact is ranked where it is
5. **Manual override works:** Users can search & link any contact if none of the matches are correct
6. **No regression:** Existing exact matches still work perfectly
7. **Performance:** Matching completes in <500ms for typical mention lists

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/app/api/contacts/match-mentions/route.ts` | Add `scoreMatchWithContext()`, use context in matching |
| `src/components/enrichment/completion/MentionedPersonCard.tsx` | Add Search & Link button, display matchReasons |
| **NEW** `src/components/enrichment/completion/ContactSearchModal.tsx` | Modal for manual contact search & link |

**No changes needed:**
- `MentionedPeopleSection.tsx` - already passes context to API
- `mentionExtraction.ts` - context field already exists in schema

---

## Out of Scope

- Phonetic matching improvements (separate enhancement)
- ML-based matching (future consideration)
- Relationship graph analysis (V2 feature)
- Bulk re-matching of existing mentions

---

## Dependencies

- Existing pg_trgm extension for fuzzy matching
- Existing contact search API for modal
- Existing MentionedPersonCard component structure
