# Spec C Brief: Mention Matching Improvements

**Status:** Brief (not full spec)
**Priority:** 3 (after Spec A bugs, high data quality impact)
**Feedback Items:** 10, 16 (BUG)

---

## Summary

Fix the "wrong Scott" bug where mention matching selects the first alphabetical match instead of contextually relevant matches. Add manual override capability.

---

## The Bug (Item 16)

**User report:** "When I said 'introduced her to Scott' it selected the first Scott alphabetically in my contacts and not cross referencing all of the Scotts to match their email/company/etc."

**Root cause in** `src/app/api/contacts/match-mentions/route.ts`:

```typescript
// Current logic (simplified):
// 1. Exact name match → return first match
// 2. Fuzzy match via pg_trgm → return by similarity score
// Problem: No context weighting
```

The algorithm finds matches but doesn't consider:
- Company mentioned in context ("Scott from the investment firm")
- Email domain patterns
- Expertise/role overlap
- Previous interactions with the contact being enriched

---

## Changes Required

### 1. Context-Aware Matching Algorithm

**File:** `src/app/api/contacts/match-mentions/route.ts`

**New approach:**
```
1. Extract context from mention (GPT already does this in extract-mentions)
2. Find ALL potential matches (not just first)
3. Score each match:
   - +1.0 exact name match
   - +0.5 fuzzy name match (scaled by similarity)
   - +0.3 company name appears in context
   - +0.2 email domain matches context hints
   - +0.2 expertise/role overlap
   - +0.1 previously connected to source contact
4. Return top match + alternatives if close scores
```

**Data available for scoring:**
- `extractedContext` from GPT (already extracted)
- Contact's company, title, expertise fields
- Email domain
- Existing relationships/mentions

### 2. Manual Link Override (Item 10)

**File:** `src/components/enrichment/completion/MentionedPersonCard.tsx`

**Current UI:** Shows matched contact with "View Profile" and "Dismiss" options

**New UI:**
- Add "Link to Different Contact" button
- Opens search modal to find correct contact
- Updates the `contactMention` record with new `mentionedContactId`

**New component needed:** `ContactSearchModal.tsx`
- Reusable search modal
- Shows search results with mini contact cards
- "Select" button to confirm

---

## Key Files

| File | Changes |
|------|---------|
| `src/app/api/contacts/match-mentions/route.ts` | Rewrite matching algorithm |
| `src/components/enrichment/completion/MentionedPersonCard.tsx` | Add "Link to Different" button |
| `src/components/enrichment/completion/MentionedPeopleSection.tsx` | Handle modal state |
| NEW: `src/components/contacts/ContactSearchModal.tsx` | Reusable search modal |
| `src/app/api/contacts/mentions/[id]/route.ts` | May need PATCH endpoint for manual link |

---

## Database Considerations

The `ContactMention` model already has:
```prisma
mentionedContactId  String?  // FK to matched contact
matchConfidence     Float
matchType           MatchType  // EXACT, FUZZY, PHONETIC, NONE
```

For manual links, we could:
- Set `matchType` to a new value `MANUAL`
- Set `matchConfidence` to 1.0
- Or add a `isManuallyLinked` boolean

---

## Test Cases

1. "Introduced her to Scott" with 3 Scotts in contacts:
   - Scott A: works at "Tech Corp"
   - Scott B: works at "Investment Partners"
   - Scott C: no company
   - Context: "Scott from the investment world"
   - Expected: Scott B should rank highest

2. Partial name with context:
   - "Talked to Rob about the deal"
   - Rob Smith (VC), Robert Jones (Engineer), Roberto Garcia (Lawyer)
   - Context includes "funding" or "investment"
   - Expected: Rob Smith ranks highest

3. Manual override:
   - Wrong match selected
   - User clicks "Link to Different"
   - Searches and selects correct contact
   - Mention record updates

---

## Estimation

- Algorithm rewrite: 3-4 hours
- ContactSearchModal: 2 hours
- Manual link UI + API: 2 hours
- Testing edge cases: 1 hour

**Total:** ~8-9 hours

---

## Open Questions

1. Should we show "Alternative matches" in the UI when confidence is low?
2. Should manual links affect future matching (learning)?
3. How to handle when context is ambiguous (no company/role mentioned)?
