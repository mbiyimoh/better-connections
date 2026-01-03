# Task Breakdown: Spec C - Mention Matching Improvements

**Generated:** 2026-01-02
**Source:** specs/emily-feedback-jan-2026/spec-c-mention-matching-improvements.md
**Last Decompose:** 2026-01-02

---

## Overview

Fix the "wrong Scott" bug by implementing context-aware scoring for mention matching and adding UX for users to see all matches ranked by score and choose the correct one.

**Total Tasks:** 8
**Phases:** 3

---

## Phase 1: Backend - Context-Aware Scoring

### Task 1.1: Add `scoreMatchWithContext` function
**Description:** Create the context-aware scoring function that adds company and domain matching to name similarity
**Size:** Medium
**Priority:** High
**Dependencies:** None
**Can run parallel with:** None (foundation task)

**File:** `src/app/api/contacts/match-mentions/route.ts`

**Technical Requirements:**
- Name similarity: 0-50 points (existing pg_trgm)
- Company match: 0-30 points (substring match in context)
- Domain match: 0-20 points (email domain in context)
- Return normalized score (0-1) and match reasons array

**Implementation:**
```typescript
interface ScoredMatch {
  contact: ContactForMatching;
  score: number;
  reasons: string[];
}

function scoreMatchWithContext(
  contact: ContactForMatching,
  mentionName: string,
  mentionContext: string,
  nameSimilarity: number
): ScoredMatch {
  const reasons: string[] = [];
  let score = 0;
  const contextLower = mentionContext.toLowerCase();

  // Name similarity (0-50)
  score += nameSimilarity * 50;
  reasons.push(`Name: ${Math.round(nameSimilarity * 100)}% match`);

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

  return { contact, score: score / 100, reasons };
}
```

**Acceptance Criteria:**
- [ ] Function returns normalized score 0-1
- [ ] Company match adds 30 points when company name found in context
- [ ] Domain match adds 20 points when email domain found in context
- [ ] Match reasons array populated correctly
- [ ] Case-insensitive matching works

---

### Task 1.2: Update `matchMention` to use context scoring
**Description:** Modify the existing matchMention function to score all candidates with context and return ranked alternatives
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.1
**Can run parallel with:** None

**File:** `src/app/api/contacts/match-mentions/route.ts`

**Technical Requirements:**
- Score ALL fuzzy matches with context, not just return first
- Sort by composite score descending
- Include `matchReasons` in response
- Return top match as `bestMatch`, rest as `alternativeMatches`
- Include company in alternative matches for UI display

**Implementation changes:**
```typescript
// Update ContactForMatching interface to include email
interface ContactForMatching {
  id: string;
  firstName: string;
  lastName: string | null;
  title: string | null;
  company: string | null;
  email: string | null;  // ADD THIS
  enrichmentScore: number;
}

// In matchMention function, after getting fuzzy matches:
// Score all matches with context
const scoredMatches = fuzzyMatches.map(match => {
  const contact = contacts.find(c => c.id === match.id);
  return scoreMatchWithContext(
    contact!,
    mention.normalizedName,
    mention.context,
    match.similarity
  );
}).sort((a, b) => b.score - a.score);

const bestMatch = scoredMatches[0];
const alternatives = scoredMatches.slice(1);

return {
  name: mention.name,
  normalizedName: mention.normalizedName,
  context: mention.context,
  inferredDetails: mention.inferredDetails,
  matchType: bestMatch ? "FUZZY" : "NONE",
  confidence: bestMatch?.score || 0,
  matchedContact: bestMatch?.contact || null,
  matchReasons: bestMatch?.reasons || [],
  alternativeMatches: alternatives.map(alt => ({
    id: alt.contact.id,
    firstName: alt.contact.firstName,
    lastName: alt.contact.lastName,
    company: alt.contact.company,
    confidence: alt.score,
    matchReasons: alt.reasons,
  })),
};
```

**Acceptance Criteria:**
- [ ] All fuzzy matches scored with context
- [ ] Matches sorted by composite score (not alphabetically!)
- [ ] Best match has highest composite score
- [ ] Alternatives include company and matchReasons
- [ ] "Wrong Scott" bug is fixed - Scott from Stripe ranks first when context mentions Stripe

---

### Task 1.3: Update MentionMatch type schema
**Description:** Update the TypeScript types to include matchReasons
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 1.1

**File:** `src/lib/schemas/mentionExtraction.ts`

**Changes:**
```typescript
// Add to MentionMatch interface
export interface MentionMatch {
  // ... existing fields
  matchReasons?: string[];
  alternativeMatches?: Array<{
    id: string;
    firstName: string;
    lastName: string | null;
    company: string | null;  // ADD
    confidence: number;      // ADD (was similarity)
    matchReasons?: string[]; // ADD
  }>;
}
```

**Acceptance Criteria:**
- [ ] MentionMatch type includes matchReasons
- [ ] alternativeMatches includes company, confidence, matchReasons
- [ ] No TypeScript errors in consuming components

---

## Phase 2: Frontend - Ranked Matches UI

### Task 2.1: Display match reasons on best match
**Description:** Show match reason badges on the primary match in MentionedPersonCard
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.2, Task 1.3
**Can run parallel with:** None

**File:** `src/components/enrichment/completion/MentionedPersonCard.tsx`

**Implementation:**
```tsx
// After the match info display (around line 140)
{mention.matchReasons && mention.matchReasons.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-1">
    {mention.matchReasons.map((reason, i) => (
      <span
        key={i}
        className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded"
      >
        {reason}
      </span>
    ))}
  </div>
)}
```

**Acceptance Criteria:**
- [ ] Match reasons displayed as small badges
- [ ] Badges show company match, name percentage, domain match
- [ ] Styled consistently with dark theme

---

### Task 2.2: Update alternatives dropdown with reasons and company
**Description:** Enhance the "Other matches" section to show company and reasons for each alternative
**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.1
**Can run parallel with:** None

**File:** `src/components/enrichment/completion/MentionedPersonCard.tsx`

**Implementation - Replace existing alternatives section (lines ~281-318):**
```tsx
{/* Alternative matches - show for ALL match types, not just fuzzy */}
{mention.alternativeMatches && mention.alternativeMatches.length > 0 && (
  <div className="mt-3 border-t border-zinc-700 pt-3">
    <button
      onClick={() => setShowAlternatives(!showAlternatives)}
      className="text-xs text-zinc-400 hover:text-zinc-300 flex items-center gap-1"
    >
      {showAlternatives ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      Other matches ({mention.alternativeMatches.length})
    </button>

    <AnimatePresence>
      {showAlternatives && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-2 space-y-2"
        >
          {mention.alternativeMatches.map((alt) => (
            <div
              key={alt.id}
              className="flex items-center justify-between p-2 rounded bg-zinc-800/50"
            >
              <div>
                <span className="text-sm text-zinc-300">
                  {alt.firstName} {alt.lastName}
                </span>
                {alt.company && (
                  <span className="text-xs text-zinc-500 ml-1">({alt.company})</span>
                )}
                {/* Show match reasons for each alternative */}
                {alt.matchReasons && alt.matchReasons.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {alt.matchReasons.map((reason, i) => (
                      <span
                        key={i}
                        className="text-xs bg-zinc-700 px-1.5 py-0.5 rounded text-zinc-400"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">
                  {Math.round((alt.confidence || alt.similarity) * 100)}%
                </span>
                <button
                  onClick={() => handleAction("link", alt.id)}
                  disabled={isProcessing}
                  className="text-xs px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 disabled:opacity-50"
                >
                  Select
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => handleAction("create")}
            disabled={isProcessing}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-zinc-700/50 text-sm text-blue-400 disabled:opacity-50 flex items-center gap-1"
          >
            <UserPlus className="w-3 h-3" />
            Create as new contact
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
)}
```

**Key changes from current implementation:**
- Show "Other matches" for ALL match types (not just fuzzy < 70%)
- Display company name for each alternative
- Show matchReasons badges for each alternative
- Use confidence instead of similarity
- One-click "Select" button styled consistently

**Acceptance Criteria:**
- [ ] Alternatives shown for all match types with alternatives
- [ ] Company displayed in parentheses
- [ ] Match reasons shown as badges for each alternative
- [ ] Confidence percentage displayed
- [ ] Select button works for all alternatives
- [ ] "Create as new contact" option still available

---

## Phase 3: Manual Link Override (Fallback)

### Task 3.1: Create ContactSearchModal component
**Description:** Build a modal for searching and linking any contact when none of the auto-matches are correct
**Size:** Medium
**Priority:** Medium
**Dependencies:** Task 2.2
**Can run parallel with:** None

**File:** `src/components/enrichment/completion/ContactSearchModal.tsx` (NEW)

**Implementation:**
```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import debounce from "lodash/debounce";

interface Contact {
  id: string;
  firstName: string;
  lastName: string | null;
  company: string | null;
  title: string | null;
}

interface ContactSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (contactId: string) => void;
  contextHint?: string;
}

export function ContactSearchModal({
  open,
  onClose,
  onSelect,
  contextHint
}: ContactSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchContacts = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/contacts?search=${encodeURIComponent(searchQuery)}&limit=10`
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.contacts || []);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    searchContacts(query);
  }, [query, searchContacts]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-zinc-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-white">Search & Link Contact</h3>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-zinc-700 text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Context hint */}
            {contextHint && (
              <p className="text-xs text-zinc-500 mb-3">
                Context: "{contextHint.length > 100 ? contextHint.slice(0, 100) + "..." : contextHint}"
              </p>
            )}

            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search contacts by name, company..."
                className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                autoFocus
              />
            </div>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto p-2">
            {isLoading && (
              <div className="text-center py-4 text-zinc-500">Searching...</div>
            )}

            {!isLoading && query && results.length === 0 && (
              <div className="text-center py-4 text-zinc-500">
                No contacts found
              </div>
            )}

            {!isLoading && results.length > 0 && (
              <div className="space-y-1">
                {results.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => onSelect(contact.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-zinc-800 text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                      <User className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div>
                      <div className="text-sm text-white">
                        {contact.firstName} {contact.lastName}
                      </div>
                      {(contact.title || contact.company) && (
                        <div className="text-xs text-zinc-500">
                          {contact.title}
                          {contact.title && contact.company && " at "}
                          {contact.company}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!query && (
              <div className="text-center py-4 text-zinc-500 text-sm">
                Type to search your contacts
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
```

**Acceptance Criteria:**
- [ ] Modal opens/closes smoothly with animation
- [ ] Search input with debounced queries (300ms)
- [ ] Results show name, title, company
- [ ] Click on result triggers onSelect with contact ID
- [ ] Context hint displayed to help user find right contact
- [ ] Empty and loading states handled

---

### Task 3.2: Add Search & Link button to MentionedPersonCard
**Description:** Integrate the ContactSearchModal into MentionedPersonCard
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 3.1
**Can run parallel with:** None

**File:** `src/components/enrichment/completion/MentionedPersonCard.tsx`

**Implementation:**
```tsx
// Add import at top
import { ContactSearchModal } from "./ContactSearchModal";

// Add state (near other useState calls)
const [showSearchModal, setShowSearchModal] = useState(false);

// Add handler
const handleSearchSelect = (contactId: string) => {
  handleAction("link", contactId);
  setShowSearchModal(false);
};

// Add button in action buttons section (after alternatives dropdown)
<button
  onClick={() => setShowSearchModal(true)}
  disabled={isProcessing}
  className="px-3 py-1.5 text-sm font-medium rounded-md border border-zinc-600 hover:bg-zinc-700/50 text-zinc-300 disabled:opacity-50 flex items-center gap-1"
>
  <Search className="w-3 h-3" />
  Search & Link
</button>

// Add modal at end of component (before closing </motion.div>)
<ContactSearchModal
  open={showSearchModal}
  onClose={() => setShowSearchModal(false)}
  onSelect={handleSearchSelect}
  contextHint={mention.context}
/>
```

**Acceptance Criteria:**
- [ ] "Search & Link" button visible on all mention cards
- [ ] Clicking opens ContactSearchModal
- [ ] Selecting a contact links the mention
- [ ] Modal closes after selection
- [ ] Context passed to modal for reference

---

### Task 3.3: Add email to contacts query in match-mentions
**Description:** Include email in the contacts query so domain matching works
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.1
**Can run parallel with:** Task 1.2

**File:** `src/app/api/contacts/match-mentions/route.ts`

**Implementation:**
```typescript
// Update the contacts query to include email (around line 49-62)
const contacts = await prisma.contact.findMany({
  where: {
    userId: user.id,
    id: { not: sourceContactId },
  },
  select: {
    id: true,
    firstName: true,
    lastName: true,
    title: true,
    company: true,
    email: true,  // ADD THIS LINE
    enrichmentScore: true,
  },
});
```

**Acceptance Criteria:**
- [ ] Email included in contact query
- [ ] Domain matching works in scoreMatchWithContext
- [ ] No additional database queries needed

---

## Execution Order

```
Phase 1 (Backend):
  Task 1.1 ─────────────┬──> Task 1.2 ──> Phase 2
  Task 1.3 ─────────────┘
  Task 3.3 (parallel) ──────────────────> Phase 2

Phase 2 (Ranked UI):
  Task 2.1 ──> Task 2.2 ──> Phase 3

Phase 3 (Manual Override):
  Task 3.1 ──> Task 3.2 ──> Done
```

**Parallel opportunities:**
- Task 1.1 and Task 1.3 can run in parallel
- Task 3.3 can run in parallel with Phase 1 tasks

---

## Success Criteria

1. **All matches shown ranked:** When multiple contacts match a name, ALL are displayed ranked by composite score
2. **User can choose any match:** One-click to select any alternative
3. **Context signals improve ranking:** When company/domain mentioned, correct contact ranks first
4. **Match reasons visible:** Users understand WHY each contact is ranked where it is
5. **Manual override works:** Users can search & link any contact if none of the matches are correct
6. **No regression:** Existing exact matches still work perfectly
7. **Performance:** Matching completes in <500ms for typical mention lists
