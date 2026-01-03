# Task Breakdown: Spec E - Navigation & Discovery Enhancements

**Generated:** 2026-01-03
**Source:** specs/emily-feedback-jan-2026/spec-e-navigation-discovery.md
**Last Decompose:** 2026-01-03

---

## Overview

This spec implements two UX enhancements:
1. **Alphabet Quick-Jump** - A-Z letter strip for fast contact navigation
2. **Hometown Suggestion** - Auto-suggest location based on phone area code

**Total Estimated Effort:** ~9 hours

---

## Phase 1: Foundation (Data & Utilities)

### Task 1.1: Create US Area Codes Data File
**Description:** Create the area code to city/state mapping data file
**Size:** Medium
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 1.2

**File to Create:** `src/lib/area-codes.ts`

**Technical Requirements:**
- Define `AreaCodeInfo` interface with code, city, state, stateAbbr
- Create `US_AREA_CODES` record mapping ~150 area codes to locations
- Cover all major US metropolitan areas
- Organize by region (California, New York, Texas, Florida, etc.)

**Implementation:**
```typescript
/**
 * US area code to location mapping.
 * Data sources: NANPA, Wikipedia
 * Note: Area codes cover regions, not specific cities.
 * We use the primary/largest city for each code.
 */

export interface AreaCodeInfo {
  code: string;
  city: string;
  state: string;
  stateAbbr: string;
}

export const US_AREA_CODES: Record<string, AreaCodeInfo> = {
  // California
  '209': { code: '209', city: 'Stockton', state: 'California', stateAbbr: 'CA' },
  '213': { code: '213', city: 'Los Angeles', state: 'California', stateAbbr: 'CA' },
  '310': { code: '310', city: 'Los Angeles', state: 'California', stateAbbr: 'CA' },
  '323': { code: '323', city: 'Los Angeles', state: 'California', stateAbbr: 'CA' },
  '408': { code: '408', city: 'San Jose', state: 'California', stateAbbr: 'CA' },
  '415': { code: '415', city: 'San Francisco', state: 'California', stateAbbr: 'CA' },
  '510': { code: '510', city: 'Oakland', state: 'California', stateAbbr: 'CA' },
  '619': { code: '619', city: 'San Diego', state: 'California', stateAbbr: 'CA' },
  '650': { code: '650', city: 'San Mateo', state: 'California', stateAbbr: 'CA' },
  '707': { code: '707', city: 'Santa Rosa', state: 'California', stateAbbr: 'CA' },
  '714': { code: '714', city: 'Anaheim', state: 'California', stateAbbr: 'CA' },
  '818': { code: '818', city: 'Burbank', state: 'California', stateAbbr: 'CA' },
  '858': { code: '858', city: 'San Diego', state: 'California', stateAbbr: 'CA' },
  '909': { code: '909', city: 'San Bernardino', state: 'California', stateAbbr: 'CA' },
  '916': { code: '916', city: 'Sacramento', state: 'California', stateAbbr: 'CA' },
  '949': { code: '949', city: 'Irvine', state: 'California', stateAbbr: 'CA' },
  // ... (full list in spec - ~150 entries total covering all major US metros)
};
```

**Acceptance Criteria:**
- [ ] AreaCodeInfo interface exported
- [ ] US_AREA_CODES contains ~150 area code entries
- [ ] Covers major metros in all US regions
- [ ] TypeScript compiles without errors

---

### Task 1.2: Create Area Code Utility Functions
**Description:** Implement phone parsing and hometown suggestion functions
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.1
**Can run parallel with:** None (depends on 1.1)

**File to Modify:** `src/lib/area-codes.ts` (same file, add functions)

**Technical Requirements:**
- `extractAreaCode(phone)` - Parse area code from various phone formats
- `suggestHometownFromPhone(phone)` - Return "City, ST" suggestion
- `getAreaCodeInfo(phone)` - Return full AreaCodeInfo object
- Handle +1 country code prefix
- Handle various formats: (415) 555-1234, 415-555-1234, 4155551234

**Implementation:**
```typescript
/**
 * Extract area code from a phone number string.
 * Handles various formats: +1 (415) 555-1234, 415-555-1234, 4155551234
 */
export function extractAreaCode(phone: string): string | null {
  if (!phone) return null;

  // Strip all non-digits
  const digits = phone.replace(/\D/g, '');

  // Need at least 10 digits for US number
  if (digits.length < 10) return null;

  // Handle country code prefix
  if (digits.startsWith('1') && digits.length >= 11) {
    return digits.slice(1, 4);
  }

  // Standard 10-digit format
  if (digits.length >= 10) {
    return digits.slice(0, 3);
  }

  return null;
}

/**
 * Suggest a hometown based on phone number area code.
 * Returns null if area code not found or non-US number.
 */
export function suggestHometownFromPhone(phone: string): string | null {
  const areaCode = extractAreaCode(phone);
  if (!areaCode) return null;

  const info = US_AREA_CODES[areaCode];
  if (!info) return null;

  return `${info.city}, ${info.stateAbbr}`;
}

/**
 * Get full area code info for display.
 */
export function getAreaCodeInfo(phone: string): AreaCodeInfo | null {
  const areaCode = extractAreaCode(phone);
  if (!areaCode) return null;
  return US_AREA_CODES[areaCode] || null;
}
```

**Acceptance Criteria:**
- [ ] extractAreaCode handles +1 prefix correctly
- [ ] extractAreaCode handles parentheses format: (415) 555-1234
- [ ] extractAreaCode handles dashes format: 415-555-1234
- [ ] extractAreaCode handles raw digits: 4155551234
- [ ] suggestHometownFromPhone returns "City, ST" format
- [ ] getAreaCodeInfo returns full AreaCodeInfo object
- [ ] All functions return null for invalid/non-US numbers

---

## Phase 2: UI Components

### Task 2.1: Create AlphabetSlider Component
**Description:** Build reusable A-Z quick navigation component
**Size:** Medium
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 2.2

**File to Create:** `src/components/ui/AlphabetSlider.tsx`

**Technical Requirements:**
- Vertical strip of A-Z letter buttons plus "All" button
- Track which letters have contacts (availableLetters Set)
- Track contact counts per letter (letterCounts Map)
- Disabled/grayed styling for letters with no contacts
- Gold highlight for selected letter
- Click same letter to clear filter
- Accessible with ARIA labels and keyboard navigation

**Implementation:**
```typescript
'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface AlphabetSliderProps {
  /** Array of items with name property to extract letters from */
  items: Array<{ firstName: string; lastName?: string | null }>;
  /** Currently selected letter (null = show all) */
  selectedLetter: string | null;
  /** Callback when letter is clicked */
  onLetterSelect: (letter: string | null) => void;
  /** Custom class name */
  className?: string;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function AlphabetSlider({
  items,
  selectedLetter,
  onLetterSelect,
  className,
}: AlphabetSliderProps) {
  // Calculate which letters have contacts
  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    for (const item of items) {
      const firstChar = item.firstName?.[0]?.toUpperCase();
      if (firstChar && /[A-Z]/.test(firstChar)) {
        letters.add(firstChar);
      }
    }
    return letters;
  }, [items]);

  // Count contacts per letter
  const letterCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const firstChar = item.firstName?.[0]?.toUpperCase();
      if (firstChar && /[A-Z]/.test(firstChar)) {
        counts.set(firstChar, (counts.get(firstChar) || 0) + 1);
      }
    }
    return counts;
  }, [items]);

  const handleLetterClick = (letter: string) => {
    if (selectedLetter === letter) {
      // Clicking same letter clears filter
      onLetterSelect(null);
    } else {
      onLetterSelect(letter);
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-0.5 py-2 px-1',
        'bg-zinc-900/80 backdrop-blur-sm rounded-lg border border-zinc-700/50',
        className
      )}
      role="navigation"
      aria-label="Alphabet quick navigation"
    >
      {/* Clear filter button */}
      <button
        onClick={() => onLetterSelect(null)}
        className={cn(
          'w-6 h-6 text-xs font-medium rounded transition-colors',
          'flex items-center justify-center',
          selectedLetter === null
            ? 'bg-[#C9A227] text-black'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
        )}
        title="Show all"
        aria-label="Show all contacts"
      >
        All
      </button>

      <div className="w-4 h-px bg-zinc-700 my-1" />

      {/* Letter buttons */}
      {ALPHABET.map((letter) => {
        const isAvailable = availableLetters.has(letter);
        const isSelected = selectedLetter === letter;
        const count = letterCounts.get(letter) || 0;

        return (
          <button
            key={letter}
            onClick={() => isAvailable && handleLetterClick(letter)}
            disabled={!isAvailable}
            className={cn(
              'w-6 h-5 text-xs font-semibold rounded transition-colors',
              'flex items-center justify-center',
              isSelected && 'bg-[#C9A227] text-black',
              !isSelected && isAvailable && 'text-zinc-300 hover:text-white hover:bg-zinc-700',
              !isAvailable && 'text-zinc-600 cursor-not-allowed'
            )}
            title={isAvailable ? `${letter} (${count} contacts)` : `No contacts starting with ${letter}`}
            aria-label={`Filter by letter ${letter}${isAvailable ? `, ${count} contacts` : ', no contacts'}`}
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Component renders A-Z buttons plus "All" button
- [ ] Letters with no contacts are visually disabled (grayed)
- [ ] Clicking available letter calls onLetterSelect with that letter
- [ ] Clicking same letter again calls onLetterSelect(null) to clear
- [ ] Selected letter has gold highlight (#C9A227)
- [ ] Tooltip shows contact count for each letter
- [ ] ARIA labels present for accessibility
- [ ] TypeScript compiles without errors

---

### Task 2.2: Create HometownSuggestion Component
**Description:** Build suggestion UI for area code-based hometown
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.1, Task 1.2
**Can run parallel with:** Task 2.1

**File to Create:** `src/components/contacts/HometownSuggestion.tsx`

**Technical Requirements:**
- Watch phone and location values
- Show suggestion only when phone has recognized area code AND location is empty
- Display area code and suggested city/state
- "Use This" button accepts suggestion (calls onAccept)
- "Dismiss" button hides suggestion for current phone
- Reset dismissed state when phone changes
- Animated appearance with Framer Motion

**Implementation:**
```typescript
'use client';

import { useState, useEffect } from 'react';
import { Lightbulb, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { suggestHometownFromPhone, getAreaCodeInfo } from '@/lib/area-codes';

interface HometownSuggestionProps {
  phone: string | null | undefined;
  currentLocation: string | null | undefined;
  onAccept: (location: string) => void;
}

export function HometownSuggestion({
  phone,
  currentLocation,
  onAccept,
}: HometownSuggestionProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [areaCode, setAreaCode] = useState<string | null>(null);

  useEffect(() => {
    // Reset dismissed state when phone changes
    setIsDismissed(false);

    if (!phone || currentLocation) {
      setSuggestion(null);
      setAreaCode(null);
      return;
    }

    const info = getAreaCodeInfo(phone);
    if (info) {
      setSuggestion(`${info.city}, ${info.stateAbbr}`);
      setAreaCode(info.code);
    } else {
      setSuggestion(null);
      setAreaCode(null);
    }
  }, [phone, currentLocation]);

  // Don't show if no suggestion, dismissed, or location already set
  if (!suggestion || isDismissed || currentLocation) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="mt-2 p-3 rounded-lg bg-[#C9A227]/10 border border-[#C9A227]/30"
      >
        <div className="flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-[#C9A227] mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-300">
              Based on area code ({areaCode}), this might be:
            </p>
            <p className="text-sm font-medium text-white mt-0.5">
              {suggestion}
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={() => onAccept(suggestion)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                       bg-[#C9A227] text-black rounded-md hover:bg-[#E5C766]
                       transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Use This
          </button>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                       bg-zinc-700 text-zinc-300 rounded-md hover:bg-zinc-600
                       transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Dismiss
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
```

**Acceptance Criteria:**
- [ ] Shows suggestion when phone has valid US area code and location is empty
- [ ] Displays area code number and suggested "City, ST"
- [ ] "Use This" button calls onAccept with suggested location
- [ ] "Dismiss" button hides suggestion
- [ ] Suggestion hidden when location already has value
- [ ] Dismissed state resets when phone changes
- [ ] Animated appearance/disappearance
- [ ] Follows design system (gold accent, dark theme)

---

## Phase 3: Integration

### Task 3.1: Integrate AlphabetSlider into Enrichment Queue
**Description:** Add letter filtering to enrichment queue page
**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.1
**Can run parallel with:** Task 3.2

**File to Modify:** `src/app/(dashboard)/enrichment/page.tsx`

**Technical Requirements:**
- Add `letterFilter` state (string | null)
- Modify `filteredQueue` useMemo to include letter filtering
- Position AlphabetSlider at right edge of queue list
- Clear letter filter when search query changes
- Use full queue for letter availability (not filtered queue)

**Implementation Changes:**
```typescript
// 1. Add import
import { AlphabetSlider } from '@/components/ui/AlphabetSlider';

// 2. Add state (after existing filter state)
const [letterFilter, setLetterFilter] = useState<string | null>(null);

// 3. Modify filteredQueue to include letter filtering
const filteredQueue = useMemo(() => {
  let result = queue;

  // Existing priority filter
  if (priorityFilter !== 'all') {
    result = result.filter(contact => contact.priority === priorityFilter);
  }

  // Existing search filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    result = result.filter(contact => {
      const displayName = getDisplayName(contact).toLowerCase();
      return displayName.includes(query) ||
        contact.primaryEmail?.toLowerCase().includes(query) ||
        contact.company?.toLowerCase().includes(query);
    });
  }

  // NEW: Letter filter
  if (letterFilter) {
    result = result.filter(contact => {
      const displayName = getDisplayName(contact);
      return displayName[0]?.toUpperCase() === letterFilter;
    });
  }

  return result;
}, [queue, priorityFilter, searchQuery, letterFilter]);

// 4. Clear letter filter when search changes
useEffect(() => {
  if (searchQuery) {
    setLetterFilter(null);
  }
}, [searchQuery]);

// 5. In render, wrap queue list with relative container and add slider
<div className="relative flex-1">
  {/* Existing queue list */}
  <div className="space-y-3 pr-10"> {/* Add right padding for slider */}
    {filteredQueue.slice(0, displayLimit).map((contact) => (
      // ... existing QueueItemCard rendering
    ))}
  </div>

  {/* Alphabet slider - positioned at right edge */}
  <div className="absolute right-0 top-0 h-full flex items-start pt-2">
    <AlphabetSlider
      items={queue} // Use full queue for letter availability
      selectedLetter={letterFilter}
      onLetterSelect={setLetterFilter}
    />
  </div>
</div>
```

**Acceptance Criteria:**
- [ ] AlphabetSlider appears on right side of enrichment queue
- [ ] Clicking letter filters queue to contacts starting with that letter
- [ ] Letters with no contacts are disabled
- [ ] "All" button clears filter and shows all contacts
- [ ] Search input clears letter filter automatically
- [ ] Letter filter works with existing priority filter

---

### Task 3.2: Integrate HometownSuggestion into ContactForm
**Description:** Add hometown suggestion to contact create/edit forms
**Size:** Small
**Priority:** High
**Dependencies:** Task 2.2
**Can run parallel with:** Task 3.1

**File to Modify:** `src/components/contacts/ContactForm.tsx`

**Technical Requirements:**
- Import HometownSuggestion component
- Watch primaryPhone and location fields using react-hook-form watch()
- Add HometownSuggestion below location input field
- Use setValue to populate location when suggestion accepted

**Implementation Changes:**
```typescript
// 1. Add import
import { HometownSuggestion } from './HometownSuggestion';

// 2. In component, watch phone and location fields
const primaryPhone = watch('primaryPhone');
const location = watch('location');

// 3. In form JSX, after location field input:
<div className="space-y-2">
  <Label htmlFor="location">Location</Label>
  <Input
    id="location"
    {...register('location')}
    placeholder="San Francisco, CA"
  />
  <HometownSuggestion
    phone={primaryPhone}
    currentLocation={location}
    onAccept={(suggested) => setValue('location', suggested)}
  />
</div>
```

**Acceptance Criteria:**
- [ ] Suggestion appears below location field when phone entered
- [ ] Suggestion only shows when location field is empty
- [ ] "Use This" populates location field with suggestion
- [ ] "Dismiss" hides suggestion
- [ ] Works on both create and edit forms
- [ ] Changing phone resets dismissed state

---

## Phase 4: Testing & Polish

### Task 4.1: Manual Testing & Edge Cases
**Description:** Verify all features work correctly with edge cases
**Size:** Medium
**Priority:** High
**Dependencies:** Tasks 3.1, 3.2

**Test Scenarios:**

**Alphabet Slider:**
1. Letter availability - Given contacts: Aaron, Bob, Charlie → A, B, C highlighted; D-Z grayed
2. Letter filtering - Click "B" → Only "B" contacts shown
3. Clear filter - Click "B" again or "All" → All contacts shown
4. Empty letter - No "X" contacts → "X" disabled
5. Filter + search interaction - Letter selected, type in search → Letter filter cleared

**Hometown Suggestion:**
1. Valid US number - (415) 555-1234 with empty location → "San Francisco, CA" suggested
2. Accept suggestion - Click "Use This" → Location populated, suggestion hidden
3. Dismiss suggestion - Click "Dismiss" → Suggestion hidden
4. Location already set - Phone + location both have values → No suggestion
5. Unknown area code - Unrecognized code → No suggestion
6. International number - +44 20 7946 0958 → No suggestion
7. Phone change - Dismiss for 415, change to 212 → New NYC suggestion shown

**Acceptance Criteria:**
- [ ] All 12 test scenarios pass
- [ ] No console errors
- [ ] Responsive on different screen sizes
- [ ] Keyboard navigation works for alphabet slider

---

## Dependency Graph

```
Phase 1 (Foundation)
├── Task 1.1: Area Codes Data ──┬──> Task 1.2: Utility Functions
│                               │
Phase 2 (Components)            │
├── Task 2.1: AlphabetSlider   <┘
├── Task 2.2: HometownSuggestion ──> depends on 1.1, 1.2
│
Phase 3 (Integration)
├── Task 3.1: Enrichment Queue Integration ──> depends on 2.1
├── Task 3.2: ContactForm Integration ──> depends on 2.2
│
Phase 4 (Testing)
└── Task 4.1: Manual Testing ──> depends on 3.1, 3.2
```

## Parallel Execution Opportunities

- **Tasks 1.1 can start immediately**
- **Tasks 2.1 and 2.2 can run in parallel** (after 1.1/1.2)
- **Tasks 3.1 and 3.2 can run in parallel** (different files)

## Summary

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1: Foundation | 2 tasks | 3 hours |
| Phase 2: Components | 2 tasks | 3 hours |
| Phase 3: Integration | 2 tasks | 2 hours |
| Phase 4: Testing | 1 task | 1 hour |
| **Total** | **7 tasks** | **~9 hours** |
