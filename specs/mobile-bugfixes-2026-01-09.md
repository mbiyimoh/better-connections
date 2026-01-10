# Mobile Bugfixes Spec - 2026-01-09

**Status:** COMPLETED
**Priority:** High - Multiple UX issues affecting mobile usability

---

## Issues Summary

| # | Issue | Location | Status |
|---|-------|----------|--------|
| 1 | FeedbackButton: desktop should be pill with "Feedback" text | FeedbackButton.tsx | DONE |
| 2 | FeedbackButton: overlaps pagination on desktop | FeedbackButton.tsx | DONE |
| 3 | Mobile contacts fetch error when switching viewport | ContactsView.tsx | DONE |
| 4 | Duplicate "Add Contact" FAB on mobile (conflicts with Feedback FAB) | ContactsView.tsx | DONE |
| 5 | Explorer header covered by hamburger menu | explore/page.tsx | DONE |
| 6 | Explorer textarea has no bottom padding | explore/page.tsx | DONE |
| 7 | Explorer textarea doesn't expand/support multiline | ChatInput.tsx | DONE |

---

## Issue Details

### Issue 1: FeedbackButton Desktop Pill Style

**Current:** Round FAB with just icon on all viewports
**Expected:** Desktop (md+) shows pill button with icon + "Feedback" text
**Screenshot:** mobile-screenshots/Screenshot 2026-01-09 at 1.51.14 PM.png

**Fix:**
```tsx
// Desktop: pill with text
// Mobile: round FAB (icon only)
className={cn(
  'flex items-center justify-center gap-2',
  'md:px-4 md:py-2 md:rounded-full',  // Pill on desktop
  'w-14 h-14 rounded-full md:w-auto md:h-auto',  // Circle on mobile
  ...
)}
// Add text span visible only on desktop
<span className="hidden md:inline text-sm font-medium">Feedback</span>
```

---

### Issue 2: FeedbackButton Overlaps Pagination (Desktop)

**Current:** `md:bottom-6` puts it over the table pagination controls
**Expected:** Position above pagination (roughly bottom-20 on desktop)
**Screenshot:** mobile-screenshots/Screenshot 2026-01-09 at 1.50.24 PM.png

**Fix:**
```tsx
// Change from: md:bottom-6
// Change to: md:bottom-20 (clears pagination)
className="fixed z-40 right-4 bottom-20 md:right-6 md:bottom-20"
```

---

### Issue 3: Mobile Contacts Fetch Error on Viewport Switch

**Current:** When resizing browser from desktop→mobile, fetch throws error
**Error:** `Failed to fetch contacts` at ContactsView.tsx:44
**Root Cause:** The useEffect triggers fetch when `isMobile` changes, but the component may be in a transitional state

**Fix:** Add error handling and potentially debounce the viewport switch:
```tsx
// Don't fetch during undefined state
useEffect(() => {
  if (isMobile === true) {  // Explicit true check, not just truthy
    fetchContacts();
  }
}, [isMobile, fetchContacts]);
```

Also ensure the API route handles edge cases gracefully.

---

### Issue 4: Duplicate FAB on Mobile (Add Contact + Feedback)

**Current:** ContactsView renders its own FAB for "Add Contact", which stacks with FeedbackButton
**Expected:** On mobile contacts page, only show "Add Contact" FAB (primary action). Feedback accessible via menu.
**Screenshot:** mobile-screenshots/Screenshot 2026-01-09 at 1.48.03 PM.png, 1.50.24 PM.png

**Options:**
1. Remove FAB from ContactsView entirely (add contact via header or menu)
2. Hide FeedbackButton on contacts page
3. Combine into a speed-dial FAB

**Recommended:** Option 1 - Remove FAB from ContactsView. The hamburger menu provides navigation to /contacts/new. This simplifies the UI and follows the spec's intent of removing redundant navigation.

**Fix in ContactsView.tsx:**
```tsx
// Remove the FAB component entirely from mobile view
if (isMobile) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0">
        <ContactCardList ... />
      </div>
      {/* REMOVED: FAB for add contact - use hamburger menu instead */}
    </div>
  );
}
```

---

### Issue 5: Explorer Header Covered by Hamburger Menu

**Current:** "03 — Discover / Explore" text starts at left edge, covered by hamburger
**Expected:** Header content should have left padding to clear the hamburger button
**Screenshot:** mobile-screenshots/Screenshot 2026-01-09 at 1.57.47 PM.png (shows "DISCOVER / plore" - cut off)

**Fix in explore/page.tsx mobile header:**
```tsx
// Add pl-14 (56px) to clear the hamburger button (44px + margin)
<header className="flex items-center justify-between p-4 pl-14 border-b border-border shrink-0">
```

---

### Issue 6: Explorer Textarea No Bottom Padding

**Current:** Input sits flush at screen bottom edge
**Expected:** Some padding below input for comfortable typing + iOS safe area
**Screenshot:** mobile-screenshots/Screenshot 2026-01-09 at 1.57.47 PM.png

**Fix in explore/page.tsx:**
```tsx
// Current
<div className="p-4 border-t border-border shrink-0 pb-safe">

// Should be (add more padding, ensure safe area)
<div className="p-4 pb-6 border-t border-border shrink-0" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
```

Or use Tailwind:
```tsx
<div className="p-4 border-t border-border shrink-0 pb-6 pb-safe">
```

---

### Issue 7: Explorer Textarea Doesn't Expand for Multiline

**Current:** Fixed single-line input, shift+enter doesn't work
**Expected:** Textarea that:
  - Starts at single line height
  - Expands as user types (up to ~6 lines)
  - Supports shift+enter for newlines
  - Enter alone sends message
**Reference:** mobile-screenshots/IMG_2909.jpg (Claude app textarea behavior)

**Fix in ChatInput.tsx:**
1. Change from `<input>` to `<textarea>`
2. Add auto-resize logic based on content
3. Handle Enter vs Shift+Enter differently

```tsx
// Key changes needed:
const textareaRef = useRef<HTMLTextAreaElement>(null);

// Auto-resize effect
useEffect(() => {
  const textarea = textareaRef.current;
  if (textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`; // Max ~6 lines
  }
}, [value]);

// Key handler
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    onSend(value);
  }
  // Shift+Enter naturally creates newline in textarea
};

// Change input to textarea
<textarea
  ref={textareaRef}
  rows={1}
  className="resize-none overflow-hidden ..."
  onKeyDown={handleKeyDown}
  ...
/>
```

---

## Implementation Order

1. **Issue 4** - Remove duplicate FAB (quick fix, reduces visual clutter)
2. **Issue 3** - Fix fetch error (improves reliability)
3. **Issue 1 & 2** - FeedbackButton desktop styling (related changes)
4. **Issue 5** - Explorer header padding (quick fix)
5. **Issue 6** - Explorer input bottom padding (quick fix)
6. **Issue 7** - Expandable textarea (most complex change)

---

## Testing Checklist

After fixes, verify:

- [ ] Desktop contacts page: Feedback pill visible above pagination
- [ ] Mobile contacts page: Single FAB (Feedback only), no Add Contact FAB
- [ ] Resizing desktop→mobile: No fetch errors, contacts load properly
- [ ] Explorer mobile: Header text fully visible (not under hamburger)
- [ ] Explorer mobile: Input has comfortable bottom spacing
- [ ] Explorer mobile: Textarea expands with content
- [ ] Explorer mobile: Shift+Enter creates newline
- [ ] Explorer mobile: Enter sends message
- [ ] All pages: No z-index conflicts between FABs/overlays

---

## Files to Modify

1. `src/components/feedback/FeedbackButton.tsx` - Issues 1, 2
2. `src/components/contacts/ContactsView.tsx` - Issues 3, 4
3. `src/app/(dashboard)/explore/page.tsx` - Issues 5, 6
4. `src/components/chat/ChatInput.tsx` - Issue 7
