# Spec E: Navigation & Discovery Enhancements

**Status:** Ready for Implementation
**Priority:** 5 (polish, nice-to-have)
**Feedback Items:** 13, 14
**Estimated Effort:** ~8-10 hours

---

## 1. Context & Problem

### User Report 1 (Alphabet Slider - Item 13)
> "Should have an alphabet slider on both the contacts and enrich pages instead of just a scroll bar."

**Pain Point:** With 100+ contacts, scrolling to find someone by name is tedious. Users want quick-jump navigation like phone contact apps.

### User Report 2 (Hometown Suggestion - Item 14)
> "I would like it to suggest a hometown based on the area code of their phone number. While we know its not always going to be true i think the % is going to be high that we can say 'yes' versus having to type in their hometown."

**Pain Point:** Manually entering hometown for each contact is time-consuming. Phone area codes provide a reasonable guess ~70% of the time.

---

## 2. Solution Overview

### Feature 1: Alphabet Quick-Jump
A vertical letter strip on the right side of contact lists that allows clicking a letter to filter/jump to contacts starting with that letter.

### Feature 2: Phone Area Code Hometown Suggestion
When adding/editing a contact with a phone number but no location, suggest a hometown based on US area code data.

---

## 3. Feature 1: Alphabet Quick-Jump

### 3.1 Design

```
┌─────────────────────────────────────────────────────┐
│  Enrichment Queue                            [A]    │
│  ──────────────────────────────────────────  [B]    │
│  ⚡ High Priority (3)                        [C] ←  │
│  ──────────────────────────────────────────  [D]    │
│  Chris Anderson  ←─── filtered to C          [E]    │
│  Claire Bennett                              [...]  │
│  Craig Williams                              [S]    │
│                                              [T]    │
│  (no more C contacts)                        [...]  │
│                                              [Z]    │
└─────────────────────────────────────────────────────┘
```

### 3.2 Component: AlphabetSlider

**File:** `src/components/ui/AlphabetSlider.tsx` (NEW)

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
  /** Use lastName instead of firstName for letter extraction */
  useLastName?: boolean;
  /** Custom class name */
  className?: string;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function AlphabetSlider({
  items,
  selectedLetter,
  onLetterSelect,
  useLastName = false,
  className,
}: AlphabetSliderProps) {
  // Calculate which letters have contacts
  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    for (const item of items) {
      const name = useLastName ? (item.lastName || item.firstName) : item.firstName;
      const firstChar = name?.[0]?.toUpperCase();
      if (firstChar && /[A-Z]/.test(firstChar)) {
        letters.add(firstChar);
      }
    }
    return letters;
  }, [items, useLastName]);

  // Count contacts per letter
  const letterCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const name = useLastName ? (item.lastName || item.firstName) : item.firstName;
      const firstChar = name?.[0]?.toUpperCase();
      if (firstChar && /[A-Z]/.test(firstChar)) {
        counts.set(firstChar, (counts.get(firstChar) || 0) + 1);
      }
    }
    return counts;
  }, [items, useLastName]);

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

### 3.3 Integration: Enrichment Queue Page

**File:** `src/app/(dashboard)/enrichment/page.tsx`

**Changes:**
1. Add `letterFilter` state
2. Apply letter filter to `filteredQueue`
3. Position AlphabetSlider at right edge of queue list

```typescript
// Add state (after existing filter state)
const [letterFilter, setLetterFilter] = useState<string | null>(null);

// Modify filteredQueue to include letter filtering
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

// In render, wrap queue list with relative container and add slider
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

// Clear letter filter when search changes
useEffect(() => {
  if (searchQuery) {
    setLetterFilter(null);
  }
}, [searchQuery]);
```

### 3.4 Integration: Contacts Table (Optional - Lower Priority)

**File:** `src/components/contacts/ContactsTable.tsx`

**Challenge:** Contacts table uses server-side pagination, so client-side letter filtering won't work well.

**Approach:** Add `letterFilter` as URL param that filters server-side.

**API Change Required:**
```typescript
// In /api/contacts/route.ts
const letterFilter = searchParams.get('letter');

if (letterFilter) {
  where.OR = [
    { firstName: { startsWith: letterFilter, mode: 'insensitive' } },
    { lastName: { startsWith: letterFilter, mode: 'insensitive' } },
  ];
}
```

**Note:** This is lower priority than enrichment queue. Can be implemented in a follow-up if needed.

---

## 4. Feature 2: Phone Area Code Hometown Suggestion

### 4.1 Design

```
┌─────────────────────────────────────────────────────────┐
│  Primary Phone                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │ (415) 555-1234                                    │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  Location                                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────┐    │
│  │ 💡 Based on area code (415), this might be:     │    │
│  │    San Francisco, CA                            │    │
│  │    [Use This]  [Dismiss]                        │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Area Code Data

**File:** `src/lib/area-codes.ts` (NEW)

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

/**
 * Partial list of major US area codes.
 * Full list has ~350 entries - this covers the most common ~100.
 * Expand as needed.
 */
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

  // New York
  '212': { code: '212', city: 'New York', state: 'New York', stateAbbr: 'NY' },
  '315': { code: '315', city: 'Syracuse', state: 'New York', stateAbbr: 'NY' },
  '347': { code: '347', city: 'New York', state: 'New York', stateAbbr: 'NY' },
  '516': { code: '516', city: 'Hempstead', state: 'New York', stateAbbr: 'NY' },
  '518': { code: '518', city: 'Albany', state: 'New York', stateAbbr: 'NY' },
  '585': { code: '585', city: 'Rochester', state: 'New York', stateAbbr: 'NY' },
  '607': { code: '607', city: 'Binghamton', state: 'New York', stateAbbr: 'NY' },
  '631': { code: '631', city: 'Suffolk County', state: 'New York', stateAbbr: 'NY' },
  '646': { code: '646', city: 'New York', state: 'New York', stateAbbr: 'NY' },
  '716': { code: '716', city: 'Buffalo', state: 'New York', stateAbbr: 'NY' },
  '718': { code: '718', city: 'New York', state: 'New York', stateAbbr: 'NY' },
  '845': { code: '845', city: 'Poughkeepsie', state: 'New York', stateAbbr: 'NY' },
  '914': { code: '914', city: 'Yonkers', state: 'New York', stateAbbr: 'NY' },
  '917': { code: '917', city: 'New York', state: 'New York', stateAbbr: 'NY' },

  // Texas
  '210': { code: '210', city: 'San Antonio', state: 'Texas', stateAbbr: 'TX' },
  '214': { code: '214', city: 'Dallas', state: 'Texas', stateAbbr: 'TX' },
  '254': { code: '254', city: 'Waco', state: 'Texas', stateAbbr: 'TX' },
  '281': { code: '281', city: 'Houston', state: 'Texas', stateAbbr: 'TX' },
  '361': { code: '361', city: 'Corpus Christi', state: 'Texas', stateAbbr: 'TX' },
  '409': { code: '409', city: 'Beaumont', state: 'Texas', stateAbbr: 'TX' },
  '469': { code: '469', city: 'Dallas', state: 'Texas', stateAbbr: 'TX' },
  '512': { code: '512', city: 'Austin', state: 'Texas', stateAbbr: 'TX' },
  '713': { code: '713', city: 'Houston', state: 'Texas', stateAbbr: 'TX' },
  '817': { code: '817', city: 'Fort Worth', state: 'Texas', stateAbbr: 'TX' },
  '832': { code: '832', city: 'Houston', state: 'Texas', stateAbbr: 'TX' },
  '903': { code: '903', city: 'Tyler', state: 'Texas', stateAbbr: 'TX' },
  '915': { code: '915', city: 'El Paso', state: 'Texas', stateAbbr: 'TX' },
  '956': { code: '956', city: 'Laredo', state: 'Texas', stateAbbr: 'TX' },
  '972': { code: '972', city: 'Dallas', state: 'Texas', stateAbbr: 'TX' },

  // Florida
  '239': { code: '239', city: 'Fort Myers', state: 'Florida', stateAbbr: 'FL' },
  '305': { code: '305', city: 'Miami', state: 'Florida', stateAbbr: 'FL' },
  '321': { code: '321', city: 'Orlando', state: 'Florida', stateAbbr: 'FL' },
  '352': { code: '352', city: 'Gainesville', state: 'Florida', stateAbbr: 'FL' },
  '386': { code: '386', city: 'Daytona Beach', state: 'Florida', stateAbbr: 'FL' },
  '407': { code: '407', city: 'Orlando', state: 'Florida', stateAbbr: 'FL' },
  '561': { code: '561', city: 'West Palm Beach', state: 'Florida', stateAbbr: 'FL' },
  '727': { code: '727', city: 'St. Petersburg', state: 'Florida', stateAbbr: 'FL' },
  '754': { code: '754', city: 'Fort Lauderdale', state: 'Florida', stateAbbr: 'FL' },
  '772': { code: '772', city: 'Port St. Lucie', state: 'Florida', stateAbbr: 'FL' },
  '786': { code: '786', city: 'Miami', state: 'Florida', stateAbbr: 'FL' },
  '813': { code: '813', city: 'Tampa', state: 'Florida', stateAbbr: 'FL' },
  '850': { code: '850', city: 'Tallahassee', state: 'Florida', stateAbbr: 'FL' },
  '863': { code: '863', city: 'Lakeland', state: 'Florida', stateAbbr: 'FL' },
  '904': { code: '904', city: 'Jacksonville', state: 'Florida', stateAbbr: 'FL' },
  '941': { code: '941', city: 'Sarasota', state: 'Florida', stateAbbr: 'FL' },
  '954': { code: '954', city: 'Fort Lauderdale', state: 'Florida', stateAbbr: 'FL' },

  // Illinois
  '217': { code: '217', city: 'Springfield', state: 'Illinois', stateAbbr: 'IL' },
  '224': { code: '224', city: 'Elgin', state: 'Illinois', stateAbbr: 'IL' },
  '309': { code: '309', city: 'Peoria', state: 'Illinois', stateAbbr: 'IL' },
  '312': { code: '312', city: 'Chicago', state: 'Illinois', stateAbbr: 'IL' },
  '331': { code: '331', city: 'Aurora', state: 'Illinois', stateAbbr: 'IL' },
  '618': { code: '618', city: 'East St. Louis', state: 'Illinois', stateAbbr: 'IL' },
  '630': { code: '630', city: 'Naperville', state: 'Illinois', stateAbbr: 'IL' },
  '708': { code: '708', city: 'Cicero', state: 'Illinois', stateAbbr: 'IL' },
  '773': { code: '773', city: 'Chicago', state: 'Illinois', stateAbbr: 'IL' },
  '815': { code: '815', city: 'Rockford', state: 'Illinois', stateAbbr: 'IL' },
  '847': { code: '847', city: 'Evanston', state: 'Illinois', stateAbbr: 'IL' },
  '872': { code: '872', city: 'Chicago', state: 'Illinois', stateAbbr: 'IL' },

  // Northeast
  '201': { code: '201', city: 'Jersey City', state: 'New Jersey', stateAbbr: 'NJ' },
  '202': { code: '202', city: 'Washington', state: 'District of Columbia', stateAbbr: 'DC' },
  '203': { code: '203', city: 'New Haven', state: 'Connecticut', stateAbbr: 'CT' },
  '215': { code: '215', city: 'Philadelphia', state: 'Pennsylvania', stateAbbr: 'PA' },
  '301': { code: '301', city: 'Silver Spring', state: 'Maryland', stateAbbr: 'MD' },
  '302': { code: '302', city: 'Wilmington', state: 'Delaware', stateAbbr: 'DE' },
  '401': { code: '401', city: 'Providence', state: 'Rhode Island', stateAbbr: 'RI' },
  '410': { code: '410', city: 'Baltimore', state: 'Maryland', stateAbbr: 'MD' },
  '412': { code: '412', city: 'Pittsburgh', state: 'Pennsylvania', stateAbbr: 'PA' },
  '413': { code: '413', city: 'Springfield', state: 'Massachusetts', stateAbbr: 'MA' },
  '508': { code: '508', city: 'Worcester', state: 'Massachusetts', stateAbbr: 'MA' },
  '571': { code: '571', city: 'Arlington', state: 'Virginia', stateAbbr: 'VA' },
  '603': { code: '603', city: 'Manchester', state: 'New Hampshire', stateAbbr: 'NH' },
  '609': { code: '609', city: 'Trenton', state: 'New Jersey', stateAbbr: 'NJ' },
  '610': { code: '610', city: 'Allentown', state: 'Pennsylvania', stateAbbr: 'PA' },
  '617': { code: '617', city: 'Boston', state: 'Massachusetts', stateAbbr: 'MA' },
  '703': { code: '703', city: 'Arlington', state: 'Virginia', stateAbbr: 'VA' },
  '757': { code: '757', city: 'Virginia Beach', state: 'Virginia', stateAbbr: 'VA' },
  '802': { code: '802', city: 'Burlington', state: 'Vermont', stateAbbr: 'VT' },
  '804': { code: '804', city: 'Richmond', state: 'Virginia', stateAbbr: 'VA' },

  // Midwest
  '216': { code: '216', city: 'Cleveland', state: 'Ohio', stateAbbr: 'OH' },
  '248': { code: '248', city: 'Troy', state: 'Michigan', stateAbbr: 'MI' },
  '262': { code: '262', city: 'Kenosha', state: 'Wisconsin', stateAbbr: 'WI' },
  '313': { code: '313', city: 'Detroit', state: 'Michigan', stateAbbr: 'MI' },
  '314': { code: '314', city: 'St. Louis', state: 'Missouri', stateAbbr: 'MO' },
  '316': { code: '316', city: 'Wichita', state: 'Kansas', stateAbbr: 'KS' },
  '317': { code: '317', city: 'Indianapolis', state: 'Indiana', stateAbbr: 'IN' },
  '319': { code: '319', city: 'Cedar Rapids', state: 'Iowa', stateAbbr: 'IA' },
  '402': { code: '402', city: 'Omaha', state: 'Nebraska', stateAbbr: 'NE' },
  '414': { code: '414', city: 'Milwaukee', state: 'Wisconsin', stateAbbr: 'WI' },
  '440': { code: '440', city: 'Parma', state: 'Ohio', stateAbbr: 'OH' },
  '513': { code: '513', city: 'Cincinnati', state: 'Ohio', stateAbbr: 'OH' },
  '515': { code: '515', city: 'Des Moines', state: 'Iowa', stateAbbr: 'IA' },
  '586': { code: '586', city: 'Warren', state: 'Michigan', stateAbbr: 'MI' },
  '612': { code: '612', city: 'Minneapolis', state: 'Minnesota', stateAbbr: 'MN' },
  '614': { code: '614', city: 'Columbus', state: 'Ohio', stateAbbr: 'OH' },
  '616': { code: '616', city: 'Grand Rapids', state: 'Michigan', stateAbbr: 'MI' },
  '651': { code: '651', city: 'St. Paul', state: 'Minnesota', stateAbbr: 'MN' },
  '734': { code: '734', city: 'Ann Arbor', state: 'Michigan', stateAbbr: 'MI' },
  '816': { code: '816', city: 'Kansas City', state: 'Missouri', stateAbbr: 'MO' },

  // West
  '206': { code: '206', city: 'Seattle', state: 'Washington', stateAbbr: 'WA' },
  '253': { code: '253', city: 'Tacoma', state: 'Washington', stateAbbr: 'WA' },
  '303': { code: '303', city: 'Denver', state: 'Colorado', stateAbbr: 'CO' },
  '360': { code: '360', city: 'Vancouver', state: 'Washington', stateAbbr: 'WA' },
  '385': { code: '385', city: 'Salt Lake City', state: 'Utah', stateAbbr: 'UT' },
  '425': { code: '425', city: 'Bellevue', state: 'Washington', stateAbbr: 'WA' },
  '480': { code: '480', city: 'Mesa', state: 'Arizona', stateAbbr: 'AZ' },
  '503': { code: '503', city: 'Portland', state: 'Oregon', stateAbbr: 'OR' },
  '505': { code: '505', city: 'Albuquerque', state: 'New Mexico', stateAbbr: 'NM' },
  '509': { code: '509', city: 'Spokane', state: 'Washington', stateAbbr: 'WA' },
  '520': { code: '520', city: 'Tucson', state: 'Arizona', stateAbbr: 'AZ' },
  '602': { code: '602', city: 'Phoenix', state: 'Arizona', stateAbbr: 'AZ' },
  '623': { code: '623', city: 'Glendale', state: 'Arizona', stateAbbr: 'AZ' },
  '702': { code: '702', city: 'Las Vegas', state: 'Nevada', stateAbbr: 'NV' },
  '720': { code: '720', city: 'Denver', state: 'Colorado', stateAbbr: 'CO' },
  '725': { code: '725', city: 'Las Vegas', state: 'Nevada', stateAbbr: 'NV' },
  '775': { code: '775', city: 'Reno', state: 'Nevada', stateAbbr: 'NV' },
  '801': { code: '801', city: 'Salt Lake City', state: 'Utah', stateAbbr: 'UT' },
  '808': { code: '808', city: 'Honolulu', state: 'Hawaii', stateAbbr: 'HI' },
  '907': { code: '907', city: 'Anchorage', state: 'Alaska', stateAbbr: 'AK' },
  '971': { code: '971', city: 'Portland', state: 'Oregon', stateAbbr: 'OR' },

  // Southeast
  '205': { code: '205', city: 'Birmingham', state: 'Alabama', stateAbbr: 'AL' },
  '225': { code: '225', city: 'Baton Rouge', state: 'Louisiana', stateAbbr: 'LA' },
  '251': { code: '251', city: 'Mobile', state: 'Alabama', stateAbbr: 'AL' },
  '252': { code: '252', city: 'Greenville', state: 'North Carolina', stateAbbr: 'NC' },
  '256': { code: '256', city: 'Huntsville', state: 'Alabama', stateAbbr: 'AL' },
  '270': { code: '270', city: 'Bowling Green', state: 'Kentucky', stateAbbr: 'KY' },
  '334': { code: '334', city: 'Montgomery', state: 'Alabama', stateAbbr: 'AL' },
  '404': { code: '404', city: 'Atlanta', state: 'Georgia', stateAbbr: 'GA' },
  '423': { code: '423', city: 'Chattanooga', state: 'Tennessee', stateAbbr: 'TN' },
  '478': { code: '478', city: 'Macon', state: 'Georgia', stateAbbr: 'GA' },
  '502': { code: '502', city: 'Louisville', state: 'Kentucky', stateAbbr: 'KY' },
  '504': { code: '504', city: 'New Orleans', state: 'Louisiana', stateAbbr: 'LA' },
  '615': { code: '615', city: 'Nashville', state: 'Tennessee', stateAbbr: 'TN' },
  '678': { code: '678', city: 'Atlanta', state: 'Georgia', stateAbbr: 'GA' },
  '704': { code: '704', city: 'Charlotte', state: 'North Carolina', stateAbbr: 'NC' },
  '770': { code: '770', city: 'Roswell', state: 'Georgia', stateAbbr: 'GA' },
  '803': { code: '803', city: 'Columbia', state: 'South Carolina', stateAbbr: 'SC' },
  '843': { code: '843', city: 'Charleston', state: 'South Carolina', stateAbbr: 'SC' },
  '865': { code: '865', city: 'Knoxville', state: 'Tennessee', stateAbbr: 'TN' },
  '901': { code: '901', city: 'Memphis', state: 'Tennessee', stateAbbr: 'TN' },
  '910': { code: '910', city: 'Fayetteville', state: 'North Carolina', stateAbbr: 'NC' },
  '912': { code: '912', city: 'Savannah', state: 'Georgia', stateAbbr: 'GA' },
  '919': { code: '919', city: 'Raleigh', state: 'North Carolina', stateAbbr: 'NC' },
  '980': { code: '980', city: 'Charlotte', state: 'North Carolina', stateAbbr: 'NC' },
};

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

### 4.3 Component: HometownSuggestion

**File:** `src/components/contacts/HometownSuggestion.tsx` (NEW)

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

### 4.4 Integration: Contact Form

**File:** `src/components/contacts/ContactForm.tsx`

**Changes:**
1. Import HometownSuggestion component
2. Watch phone field changes
3. Add suggestion UI below location field

```typescript
import { HometownSuggestion } from './HometownSuggestion';

// In component:
const primaryPhone = watch('primaryPhone');
const location = watch('location');

// In form JSX, after location field:
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

---

## 5. Test Scenarios

### 5.1 Alphabet Slider Tests

1. **Letter availability**
   - Given contacts: Aaron, Bob, Charlie
   - Then: A, B, C highlighted; D-Z grayed out

2. **Letter filtering**
   - Given: Click letter "B"
   - Then: Only contacts starting with "B" shown
   - Then: "B" button highlighted

3. **Clear filter**
   - Given: Letter "B" selected
   - When: Click "B" again or "All"
   - Then: All contacts shown

4. **Empty letter**
   - Given: No contacts starting with "X"
   - Then: "X" button disabled and grayed

5. **Filter interaction with search**
   - Given: Letter "B" selected
   - When: User types in search
   - Then: Letter filter cleared, search takes over

### 5.2 Hometown Suggestion Tests

1. **Valid US number**
   - Given: Phone "(415) 555-1234", empty location
   - Then: Suggestion shows "San Francisco, CA"

2. **Accept suggestion**
   - Given: Suggestion visible
   - When: Click "Use This"
   - Then: Location field populated, suggestion hidden

3. **Dismiss suggestion**
   - Given: Suggestion visible
   - When: Click "Dismiss"
   - Then: Suggestion hidden, location unchanged

4. **Location already set**
   - Given: Phone "(415) 555-1234", location = "Oakland, CA"
   - Then: No suggestion shown (don't override user data)

5. **Unknown area code**
   - Given: Phone with unrecognized area code
   - Then: No suggestion shown

6. **International number**
   - Given: Phone "+44 20 7946 0958"
   - Then: No suggestion shown (non-US)

7. **Phone change**
   - Given: Suggestion dismissed for area code 415
   - When: Phone changed to area code 212
   - Then: New suggestion shown for NYC

---

## 6. Success Criteria

### Feature 1: Alphabet Slider
- [ ] AlphabetSlider component renders with A-Z + "All" button
- [ ] Letters with no contacts are visually disabled
- [ ] Clicking letter filters list to matching contacts
- [ ] Clicking same letter or "All" clears filter
- [ ] Shows contact count in tooltip
- [ ] Works on enrichment queue page
- [ ] Keyboard accessible (tab navigation)

### Feature 2: Hometown Suggestion
- [ ] Suggestion appears when phone entered and location empty
- [ ] Suggestion shows area code and suggested city
- [ ] "Use This" populates location field
- [ ] "Dismiss" hides suggestion for that phone
- [ ] Suggestion hidden when location already has value
- [ ] Works on contact create form
- [ ] Works on contact edit form
- [ ] Area code data covers major US cities (~100+ codes)

---

## 7. Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/ui/AlphabetSlider.tsx` | Create | Reusable alphabet navigation component |
| `src/lib/area-codes.ts` | Create | US area code → city/state mapping |
| `src/components/contacts/HometownSuggestion.tsx` | Create | Suggestion UI component |
| `src/app/(dashboard)/enrichment/page.tsx` | Modify | Add alphabet slider to queue |
| `src/components/contacts/ContactForm.tsx` | Modify | Add hometown suggestion |

---

## 8. Open Questions (Resolved)

| Question | Decision |
|----------|----------|
| Should alphabet slider be sticky? | Yes, fixed to right edge |
| Mobile layout for alphabet? | Hidden on mobile (screen too small) |
| Area code suggestions opt-in? | No, always show but easily dismissed |
| Phrasing for suggestion? | "Based on area code, this might be:" (uncertain language) |
| Include contacts table? | Phase 2 - enrichment queue first |

---

## 9. Estimation

| Task | Effort |
|------|--------|
| AlphabetSlider component | 2 hours |
| Enrichment queue integration | 1.5 hours |
| Area code data file | 1.5 hours |
| HometownSuggestion component | 1.5 hours |
| ContactForm integration | 1 hour |
| Testing & polish | 1.5 hours |
| **Total** | **~9 hours** |
