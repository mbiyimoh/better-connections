# Explore Chat Improvements: Sync Fix + Prompt Enhancement

**Status:** Implemented
**Authors:** Claude Code
**Date:** 2026-02-13
**Related:** `specs/chat-contact-reference-ux/02-spec-lean.md` (original implementation)

---

## Overview

Two improvements to the Explore chat feature:

1. **Fix chat/panel sync bug**: Contacts shown as chips in chat don't always match contacts in the panel
2. **Improve LLM prompts**: Add evaluation guidance and make Clarity Canvas prompt resilient to sparse data

---

## Problem Statement

### Bug: Chat/Panel Mismatch

Users report that "the contacts who are suggested in the chat thread don't always match the contacts who are displayed in the contacts panel."

**Root cause:** Two independent parsing systems:
1. **Chat chips** (`MessageContent.tsx`) parse raw AI response and render chips for every `[CONTACT: id]` pattern - regardless of whether the contact exists
2. **Panel cards** (`explore/page.tsx`) parse response again, then match against database - only showing contacts that successfully match

When AI outputs a malformed ID, name mismatch, or references a contact outside the loaded set, the chip appears but the card doesn't.

### Issue: Weak Prompts

1. **Non-Clarity-Canvas prompt lacks guidance**: When Clarity Canvas is not connected, the prompt only says "provide helpful networking suggestions" with no guidance on HOW to evaluate contacts or what makes a good recommendation.

2. **Clarity Canvas prompt is fragile**: Assumes all synthesis fields exist. If the API returns sparse data (empty arrays, null fields), the prompt shows awkward placeholders like "- No immediate goals specified" instead of adapting gracefully.

---

## Goals

1. **Single source of truth**: Parse and match contacts in ONE place, pass results to both UI components
2. **Consistent display**: Chat chips and panel cards always show the same contacts
3. **Graceful degradation**: Unmatched contacts render as styled text (not broken chips)
4. **Add core evaluation guidance**: Both prompts include instructions on how to evaluate contacts
5. **Make Clarity Canvas prompt resilient**: Natural language that adapts to available data

---

## Non-Goals

- Changes to the contact matching algorithm (keep existing 3-tier matching)
- New API endpoints
- Changes to how contacts are fetched
- Changes to Clarity Canvas API or data fetching
- Adding new synthesis fields
- Mobile-specific changes beyond passing new props

---

## Technical Approach

### Part 1: Single Source of Truth for Contact Resolution

#### Current Architecture (Problem)

```
AI Response
    ↓
┌───────────────────────┐    ┌─────────────────────────┐
│ MessageContent.tsx    │    │ explore/page.tsx        │
│ - Parses raw text     │    │ - Parses raw text AGAIN │
│ - Renders chips       │    │ - Matches to contacts   │
│ - Uses raw contactId  │    │ - Sets suggestedContacts│
└───────────────────────┘    └─────────────────────────┘
         ↓                              ↓
   Chips show ALL              Panel shows only MATCHED
   (even invalid)              (may differ from chips)
```

#### Proposed Architecture (Solution)

```
AI Response
    ↓
explore/page.tsx
- Parse ONCE (after streaming completes)
- Match contacts ONCE (against contactsRef)
- Store as resolvedContacts: Map<parsedId, ResolvedContact>
    ↓
┌────────────────────────────────────────────────────┐
│ Pass resolvedContacts to ChatMessage/MessageContent│
│ - Chips only render for successfully matched       │
│ - Unmatched names render as bold text              │
└────────────────────────────────────────────────────┘
    ↓
Both chips and panel show THE SAME contacts
```

### Part 2: Improved Prompts

#### Shared Evaluation Guidance

Create a `CONTACT_EVALUATION_GUIDANCE` constant used by BOTH prompt variants:

```markdown
## How to Evaluate and Recommend Contacts

1. **Relevance to Query**: How directly does this contact's expertise relate to what the user is asking?

2. **Relationship Context**: Consider howWeMet, relationshipStrength, lastContactDate - stronger, more recent relationships are easier to activate.

3. **Expertise & Interests**: Match contact's expertise and interests to user's needs.

4. **Current Relevance (Why Now)**: Use the whyNow field heavily if present.

5. **Strategic Value**: Consider indirect value - introductions, insider knowledge, door-opening.

6. **Actionability**: Prioritize contacts the user can realistically reach out to.

## Crafting the "Why Now" Reason

For each recommendation, answer:
- **What** makes this contact relevant to the query
- **Why** reaching out NOW (vs later) makes sense
- **How** specifically this contact can help (be concrete)

Bad: "He's in tech and might be helpful"
Good: "He led enterprise sales at a Series B and now advises on go-to-market. His experience scaling to 100 customers relates directly to your challenge."
```

#### Resilient Clarity Canvas Helpers

Instead of inline template literals that show "No X specified", use helper functions that gracefully handle missing data:

```typescript
function buildIdentityContext(synthesis: BaseSynthesis): string {
  const parts: string[] = [];

  if (identity.name) parts.push(`**${identity.name}**`);
  if (identity.role && identity.company) {
    parts.push(`is a ${identity.role} at ${identity.company}`);
  } else if (identity.role) {
    parts.push(`works as a ${identity.role}`);
  }
  // etc.

  return parts.length > 0
    ? parts.join(' ') + '.'
    : 'A professional looking to leverage their network strategically.';
}

function buildFocusContext(synthesis: BaseSynthesis): string {
  // Only include sections that have data
  // Use natural language, not "No X specified" placeholders
}

function buildAudienceContext(synthesis: BaseSynthesis): string {
  // Only include if personas/decision-makers exist
}

function buildChallengesContext(synthesis: BaseSynthesis): string {
  // Only include if pain points exist
}
```

---

## Files to Change

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/clarity-canvas/prompts.ts` | Rewrite | Add shared guidance, use resilient helpers |
| `src/components/chat/MessageContent.tsx` | Modify | Accept `resolvedContacts` prop, use it to decide chip vs text |
| `src/components/chat/ChatMessage.tsx` | Modify | Pass through `resolvedContacts` prop |
| `src/app/(dashboard)/explore/page.tsx` | Modify | Build `resolvedContacts` map, pass to ChatMessage |

---

## Implementation Details

### 1. ResolvedContact Type

```typescript
// In MessageContent.tsx
export interface ResolvedContact {
  resolvedId: string;      // Actual contact ID from database
  displayName: string;     // Contact's actual name for display
}
```

### 2. MessageContent Changes

Add optional `resolvedContacts` prop. When provided:
- Look up each parsed contact in the map
- If found: render ContactChip with resolved data
- If not found: render bold text instead of chip

```typescript
interface MessageContentProps {
  content: string;
  onContactHover: (id: string | null) => void;
  onContactClick: (id: string) => void;
  resolvedContacts?: Map<string, ResolvedContact>;
}
```

### 3. Explore Page Changes

After parsing suggestions, build the `resolvedContacts` map alongside `suggestedContacts`:

```typescript
const [resolvedContacts, setResolvedContacts] = useState<Map<string, ResolvedContact>>(new Map());

// In handleChatSubmit, after matching:
const newResolvedContacts = new Map<string, ResolvedContact>(resolvedContacts);

if (contact) {
  const resolvedData: ResolvedContact = {
    resolvedId: contact.id,
    displayName: `${contact.firstName} ${contact.lastName}`,
  };
  newResolvedContacts.set(suggestion.contactId, resolvedData);
  newResolvedContacts.set(suggestion.name.toLowerCase(), resolvedData);
}

setResolvedContacts(newResolvedContacts);
```

### 4. Non-Clarity-Canvas Prompt Structure

```markdown
You are an AI assistant helping a user explore their professional network strategically.

[Contact format instructions]

## Your Role
You're helping a professional discover who can help with whatever they're working on.

[CONTACT_EVALUATION_GUIDANCE]

## What You Don't Know
The user hasn't connected their Clarity Canvas profile, so you don't have context about:
- Their specific business goals and priorities
- Active projects they're working on
- Target personas they're trying to reach
- Strategic challenges they're facing

**Work with what you have**: Use their query plus contact data to make smart recommendations. Ask clarifying questions if their query is too vague.

[Output format]
```

### 5. Clarity Canvas Prompt Structure

```markdown
You are an AI assistant helping a user explore their professional network strategically.

[Contact format instructions]

## Who You're Helping
[buildIdentityContext - natural language about who they are]

[buildFocusContext - only sections with data: goals, projects, priorities]

[buildAudienceContext - only if personas/decision-makers exist]

[buildChallengesContext - only if pain points exist]

[CONTACT_EVALUATION_GUIDANCE]

## Using Their Clarity Canvas Context
You have rich context from their profile. Use it to:
1. Prioritize strategic fit with stated goals
2. Make explicit connections to their profile
3. Be project-aware for active projects
4. Consider their target audience

[Output format]
```

---

## Testing Approach

### Sync Bug Scenarios

1. **Normal case**: AI outputs valid contact IDs
   - Chip appears in chat, card appears in panel
   - Both show same contact name

2. **Mismatch case**: AI outputs invalid/unknown ID
   - Bold text appears in chat (not chip)
   - No card in panel
   - No broken interaction

3. **Multi-message case**: Multiple queries with different contacts
   - Each message shows correct resolved contacts
   - Map accumulates across messages (old chips still work)

### Prompt Scenarios

1. **No Clarity Canvas**: Verify prompt includes full evaluation guidance
2. **Full Clarity Canvas data**: Verify all sections render correctly
3. **Sparse Clarity Canvas data**: Verify no awkward "No X specified" placeholders
4. **Empty arrays**: Verify graceful handling of empty goals/personas/etc.

### Manual QA

- Ask query, verify chip = panel
- Ask follow-up with different contacts, verify sync
- Verify hover/click still works for valid contacts
- Test explore chat without Clarity Canvas connected
- Verify AI gives thoughtful recommendations (not generic)
- Test with Clarity Canvas connected with varying data completeness

---

## Open Questions

1. **Should unmatched contacts show any visual indication?**
   - Current proposal: Bold text (no chip styling)
   - Alternative: Grayed-out chip with tooltip "Contact not found"

2. **Should we show what's missing in prompts?**
   - Current proposal: Silently adapt to available data
   - Alternative: Mention "I don't have context about your goals" to prompt user to add data

---

## Future Improvements

**Out of scope for this fix:**

- Improving the contact matching algorithm
- Adding fuzzy name matching
- Pre-validating contact IDs on the API side
- Caching resolved contacts across sessions
- Structured output for contact recommendations
- Multi-turn conversation memory
- Learning from user feedback on recommendations
- A/B testing different prompt strategies

---

## References

- Original spec: `specs/chat-contact-reference-ux/02-spec-lean.md`
- Developer guide: `developer-guides/05-explore-function-guide.md`
- Clarity Canvas types: `src/lib/clarity-canvas/types.ts`
- Current prompts: `src/lib/clarity-canvas/prompts.ts`
