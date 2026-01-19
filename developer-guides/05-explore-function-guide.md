# Explore Function - Developer Guide

**Last Updated:** 2026-01-15
**Component:** AI-Powered Network Discovery Chat

---

## 1. Architecture Overview

The Explore function provides a conversational interface for discovering contacts in the user's network using AI. Users ask natural language questions, and GPT-4o-mini suggests relevant contacts with contextual reasons.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXPLORE FLOW                                       │
│                                                                             │
│  ┌─────────────────┐                                                        │
│  │  User Question  │  "Who should I talk to about raising a seed round?"   │
│  └───────┬─────────┘                                                        │
│          │                                                                   │
│          ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                  /api/chat/explore (POST)                           │    │
│  │                                                                      │    │
│  │  1. Auth check (Supabase)                                           │    │
│  │  2. Fetch top 50 contacts (by enrichmentScore DESC)                 │    │
│  │  3. Serialize contacts → JSON context                               │    │
│  │  4. Inject into system prompt with contact ID instructions          │    │
│  │  5. Stream response via streamText()                                │    │
│  │                                                                      │    │
│  └───────────────────────────────────┬─────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼ (Streaming)                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                   AI Response (Streaming)                           │    │
│  │                                                                      │    │
│  │  "Based on your query, I'd suggest these contacts:                  │    │
│  │                                                                      │    │
│  │   [CONTACT: cm4z5abc123] Sarah Chen - Recently raised Series A      │    │
│  │   [CONTACT: cm4z6def456] Mike Johnson - Active angel investor       │    │
│  │   [CONTACT: cm4z7ghi789] Lisa Park - Connected to Sequoia"          │    │
│  │                                                                      │    │
│  └───────────────────────────────────┬─────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                  parseContactSuggestions()                          │    │
│  │                                                                      │    │
│  │  Regex: /\[CONTACT:\s*([a-zA-Z0-9_.@+-]+)\]\s*([^-\n]+)\s*-\s*/g   │    │
│  │                                                                      │    │
│  │  Extracts: { contactId, name, reason }                              │    │
│  │                                                                      │    │
│  └───────────────────────────────────┬─────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                   3-Tier Contact Matching                           │    │
│  │                                                                      │    │
│  │  1. Exact ID match: contactsRef.find(c => c.id === contactId)       │    │
│  │  2. Email fallback: contacts.find(c => c.primaryEmail === email)    │    │
│  │  3. Name fallback:  contacts.find(c => displayName === name)        │    │
│  │                                                                      │    │
│  │  → Store mapping: identifierToIdMap.set(contactId, actualId)        │    │
│  │                                                                      │    │
│  └───────────────────────────────────┬─────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────┬─────────────────────────────────────────────────┐      │
│  │   CHAT PANEL    │              CONTACTS PANEL                     │      │
│  │                 │                                                  │      │
│  │  [User msg]     │  ┌────────────────────────────┐                 │      │
│  │                 │  │ Sarah Chen          📌     │  ← Suggested    │      │
│  │  [AI response   │  │ CEO @ TechCo               │     with        │      │
│  │   with chips]:  │  │ "Recently raised A"        │     dynamicWhyNow│      │
│  │                 │  └────────────────────────────┘                 │      │
│  │  Sarah Chen ←─────────────────── hover sync ─────────────────────┐│      │
│  │  (gold pill)    │  ┌────────────────────────────┐                 │      │
│  │                 │  │ Mike Johnson        📌     │  ← Highlighted  │      │
│  │                 │  │ Angel Investor             │     on hover    │      │
│  │                 │  └────────────────────────────┘                 │      │
│  │                 │                                                  │      │
│  └─────────────────┴──────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Dependencies

### External Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| `ai` (Vercel AI SDK) | ^4.0.0 | streamText, GPT streaming |
| `use-debounce` | ^10.0.0 | Debounced search |
| `lucide-react` | ^0.469.0 | Icons |

### Internal Dependencies

| File | Purpose |
|------|---------|
| `src/lib/chat-parser.ts` | Contact reference parsing |
| `src/lib/openai.ts` | GPT client, EXPLORATION_SYSTEM_PROMPT |
| `src/components/chat/*` | Chat UI components |

---

## 3. User Experience Flow

### Desktop Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────┐  ┌──────────────────────────────────┐│
│  │     CHAT PANEL       │  │        CONTACTS PANEL            ││
│  │       (45%)          │  │           (55%)                  ││
│  │                      │  │                                  ││
│  │  Example prompts     │  │  Search bar                      ││
│  │  (if no messages)    │  │  "Showing N suggested contacts"  ││
│  │                      │  │                                  ││
│  │  User: "Who knows    │  │  ┌─ ContactCard ───────────────┐ ││
│  │  about AI/ML?"       │  │  │ Name, Title, Company        │ ││
│  │                      │  │  │ dynamicWhyNow (from AI)     │ ││
│  │  AI: "Here are some  │  │  │ [Pin] [Draft Intro] [View]  │ ││
│  │  contacts:           │  │  └─────────────────────────────┘ ││
│  │  • Sarah Chen ..."   │  │                                  ││
│  │                      │  │  ┌─ ContactCard ───────────────┐ ││
│  │  ┌────────────────┐  │  │  │ ...                         │ ││
│  │  │ Type message   │  │  │  └─────────────────────────────┘ ││
│  │  └────────────────┘  │  │                                  ││
│  └──────────────────────┘  └──────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Mobile Layout

- Full-screen chat
- Contacts accessible via overlay (bottom sheet)
- "Show Contacts" button with badge count
- IntersectionObserver for scroll tracking
- "Jump to bottom" indicator for new messages

---

## 4. File-by-File Mapping

### Page

| File | Lines | Purpose |
|------|-------|---------|
| `src/app/(dashboard)/explore/page.tsx` | 1-779 | Main explore page |

**Key Sections:**
- Lines 81-206: `handleChatSubmit` - API call, streaming, parsing
- Lines 311-329: `resolveContactId` - 3-tier ID resolution
- Lines 331-374: `handleContactHover/Click` - Chip interactions
- Lines 419-451: `getFilteredContacts` - Display logic
- Lines 483-632: Mobile JSX
- Lines 635-776: Desktop JSX

### Chat Components

| File | Purpose |
|------|---------|
| `src/components/chat/ChatMessage.tsx` | Message display with chips |
| `src/components/chat/MessageContent.tsx` | Parses and renders contact chips |
| `src/components/chat/ContactChip.tsx` | Gold-themed inline pill |
| `src/components/chat/ChatInput.tsx` | Message input field |
| `src/components/chat/ContactCard.tsx` | Contact display in panel |
| `src/components/chat/DraftIntroModal.tsx` | AI intro email drafting |

### Mobile Components

| File | Purpose |
|------|---------|
| `src/components/explore/MobileContactOverlay.tsx` | Bottom sheet contacts |
| `src/components/chat/JumpToBottomIndicator.tsx` | Scroll indicator |

### API & Parser

| File | Purpose |
|------|---------|
| `src/app/api/chat/explore/route.ts` | Streaming chat endpoint |
| `src/lib/chat-parser.ts` | Contact reference regex |

---

## 5. Connections & Integrations

### System Prompt

```typescript
// src/lib/openai.ts
export const EXPLORATION_SYSTEM_PROMPT = `You are an AI assistant helping a user explore their professional network.
You have access to their contact database.

When suggesting contacts, ALWAYS format them using this exact format:
[CONTACT: {contact_id}] {name} - {reason_for_suggestion}
...`;
```

### Contact Context Injection

```typescript
// /api/chat/explore/route.ts
const systemPrompt = `${EXPLORATION_SYSTEM_PROMPT}

User's contacts (${contacts.length} total):
${JSON.stringify(contactContext, null, 2)}

CRITICAL: When suggesting contacts, you MUST use their exact "id" field value from the JSON above.
Example: If a contact has "id": "cm4z5abc123", write [CONTACT: cm4z5abc123]`;
```

### Contact Pattern Regex

```typescript
// src/lib/chat-parser.ts
export const CONTACT_PATTERN_STRING =
  "\\[CONTACT:\\s*([a-zA-Z0-9_.@+-]+)\\]\\s*([^-\\n]+)\\s*-\\s*([^\\n\\[]+)";

// Groups: (1) contactId, (2) name, (3) reason
```

### 3-Tier Contact Matching

```typescript
// explore/page.tsx lines 144-189
// 1. Exact ID match
let contact = contactsRef.current.find(c => c.id === suggestion.contactId);

// 2. Email fallback
if (!contact && suggestion.contactId.includes('@')) {
  contact = contactsRef.current.find(
    c => c.primaryEmail?.toLowerCase() === suggestion.contactId.toLowerCase()
  );
}

// 3. Name fallback
if (!contact) {
  contact = contactsRef.current.find(c => {
    const displayName = `${c.firstName}${c.lastName ? ' ' + c.lastName : ''}`.toLowerCase();
    return displayName === suggestion.name.trim().toLowerCase();
  });
}

// Store mapping for chip interactions
identifierToIdMap.current.set(suggestion.contactId, contact.id);
```

### Hover Synchronization

```typescript
// Chip hover → Panel highlight
const handleContactHover = useCallback((identifier: string | null) => {
  if (!identifier) {
    setHoveredContactId(null);
    return;
  }
  const actualId = resolveContactId(identifier);
  setHoveredContactId(actualId);
}, [resolveContactId]);

// ContactCard receives isHighlighted prop
<ContactCard
  isHighlighted={hoveredContactId === contact.id}
  ...
/>
```

---

## 6. Gotchas & Pitfalls

### Stale Closure Issue

```typescript
// PROBLEM: contacts state is captured in closure at render time
// SOLUTION: Use ref that stays in sync
const contactsRef = useRef<Contact[]>([]);

useEffect(() => {
  contactsRef.current = contacts;
}, [contacts]);

// In handleChatSubmit, use contactsRef.current instead of contacts
```

### Regex Global Flag State

```typescript
// WRONG: Shared global regex has stateful lastIndex
const pattern = /\[CONTACT:...]/g;
pattern.exec(text1);
pattern.exec(text2); // May skip matches due to lastIndex

// CORRECT: Create fresh regex per call
export function createContactPattern(): RegExp {
  return new RegExp(CONTACT_PATTERN_STRING, "g");
}
```

### Identifier Map Accumulation

```typescript
// Don't clear the map between messages - old chips need to still work
identifierToIdMap.current.set(suggestion.contactId, contact.id);
identifierToIdMap.current.set(suggestion.name.trim().toLowerCase(), contact.id);
```

### Contact Ordering Consistency

```typescript
// API fetches top 50 by enrichmentScore DESC
const contacts = await prisma.contact.findMany({
  orderBy: { enrichmentScore: "desc" },
  take: 50,
});

// Frontend MUST use same ordering for ID matching to work
const res = await fetch("/api/contacts?limit=100&sort=enrichmentScore&order=desc");
```

### Mobile Scroll Tracking

```typescript
// Use IntersectionObserver instead of scroll events
const observer = new IntersectionObserver(
  (entries) => {
    const atBottom = entries[0]?.isIntersecting;
    setIsAtBottom(atBottom);
  },
  { root: container, threshold: 0.1, rootMargin: '-100px' }
);
observer.observe(sentinel);
```

### Common Mistakes

| Mistake | Correct Approach |
|---------|------------------|
| Using contacts state in async callback | Use contactsRef.current |
| Clearing identifierToIdMap | Never clear - accumulate |
| Different sort order in API vs frontend | Match exactly |
| Reusing global regex | Create fresh instance each time |
| Not handling unmatched contacts | Silently skip |

---

## 7. Development Scenarios

### Adding a New Contact Field to Context

1. **Update API Route** (`/api/chat/explore/route.ts`)
   ```typescript
   const contactContext = contacts.map((c) => ({
     ...existingFields,
     newField: sanitizeForPrompt(c.newField),
   }));
   ```

2. **Update System Prompt** (`src/lib/openai.ts`)
   - Reference new field in prompt instructions

### Adding a New Chip Action

1. **Update ContactChip props**
   ```typescript
   interface ContactChipProps {
     ...existing,
     onNewAction?: (id: string) => void;
   }
   ```

2. **Handle in Explore page**
   ```typescript
   const handleNewAction = useCallback((identifier: string) => {
     const actualId = resolveContactId(identifier);
     if (!actualId) return;
     // Perform action
   }, [resolveContactId]);
   ```

3. **Pass to ChatMessage → MessageContent → ContactChip**

### Debugging Contact Matching

```typescript
// Add logging to handleChatSubmit
for (const suggestion of suggestions) {
  console.log('[Explore] Suggestion:', {
    parsedId: suggestion.contactId,
    parsedName: suggestion.name,
    matchedContact: contact?.id || 'NOT FOUND',
    matchMethod: contact
      ? contact.id === suggestion.contactId ? 'ID'
        : contact.primaryEmail?.toLowerCase() === suggestion.contactId.toLowerCase() ? 'EMAIL'
        : 'NAME'
      : 'NONE',
  });
}
```

---

## 8. Testing Approach

### Manual Test Cases

| Test | Steps | Expected |
|------|-------|----------|
| Suggestion parsing | Ask "Who knows AI?" | Contacts appear in panel |
| Chip hover | Hover chip in chat | Panel card highlights |
| Chip click | Click chip | Panel scrolls to card |
| Follow-up query | Ask refinement question | Panel updates with new suggestions |
| Empty result | Ask about nonexistent topic | AI says "no contacts found" |
| Mobile overlay | Tap contacts button | Overlay opens with suggestions |
| Draft intro | Click "Draft Intro" | Modal with AI-generated email |

### Test Queries

```
"Who should I talk to about raising a seed round?"
→ Expected: Investors, founders who raised

"Find contacts who work in AI or machine learning"
→ Expected: AI/ML engineers, researchers

"Who do I know in San Francisco?"
→ Expected: Contacts with SF location

"Who haven't I talked to in a while?"
→ Expected: Contacts with old lastContactDate
```

---

## 9. Quick Reference

### Key State Variables

| State | Type | Purpose |
|-------|------|---------|
| `contacts` | Contact[] | All user contacts |
| `suggestedContacts` | SuggestedContact[] | AI-suggested contacts |
| `messages` | ChatMessageData[] | Chat history |
| `hoveredContactId` | string \| null | Currently highlighted |
| `identifierToIdMap` | Map<string, string> | Identifier → actual ID |

### API Endpoints

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/chat/explore` | POST | Streaming chat |
| `/api/contacts` | GET | Fetch contacts |

### Key Files

| File | Purpose |
|------|---------|
| `src/app/(dashboard)/explore/page.tsx` | Main page |
| `src/lib/chat-parser.ts` | Regex parsing |
| `src/lib/openai.ts` | System prompt |
| `src/app/api/chat/explore/route.ts` | API endpoint |
| `src/components/chat/ContactChip.tsx` | Inline pill |
| `src/components/chat/ContactCard.tsx` | Panel card |

### Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| Contact limit (API) | 50 | Token management |
| Contact limit (Frontend) | 100 | Display pool |
| Default display | 10 | Before query |
| Highlight timeout | 2000ms | Click highlight duration |

### Contact Pattern Format

```
[CONTACT: {id}] {name} - {reason}

Examples:
[CONTACT: cm4z5abc123] Sarah Chen - AI startup founder raising Series A
[CONTACT: john@example.com] John Doe - ML researcher at Google (fallback)
```
