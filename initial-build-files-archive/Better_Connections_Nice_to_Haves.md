# Better Connections: Nice to Haves & Future Enhancements

This document captures optional features, UX enhancements, and open questions identified during the V1 design process. These are **not required for MVP** but should be considered for future iterations.

---

## 📋 Contacts Table

### Enhancements
- **Inline editing** — Edit name, title, tags directly in the table without opening detail view
- **Recent/Favorites quick access** — Pin frequently accessed contacts or show "recently viewed" section
- **Bulk enrichment** — Select multiple contacts and start a batch enrichment session
- **Custom columns** — Let users choose which columns to display
- **Saved filters** — Save frequently used filter combinations (e.g., "High-value opportunities")
- **Column resizing** — Drag to resize column widths

### Keyboard Shortcuts
- `j/k` — Navigate up/down through rows
- `e` — Open enrichment for selected contact
- `Enter` — Open contact detail
- `/` — Focus search
- `Cmd+K` — Command palette for quick actions

---

## 👤 Contact Detail

### Enhancements
- **Notes as timeline** — Instead of a single blob, show notes as timestamped entries with "add note" action
- **Activity log** — Track when contact was viewed, enriched, contacted
- **Related contacts** — Show other contacts at same company or with shared tags
- **External data enrichment** — Pull in LinkedIn profile photo, company info, recent posts
- **Custom fields** — Let users add their own fields beyond the standard set
- **File attachments** — Attach documents, meeting notes, etc. to a contact

### Open Questions
- Should relationship strength be manually set or auto-calculated based on interaction frequency?
- Should "How We Met" be a structured field (dropdown + date) or freeform text?

---

## ➕ Add Contact / Import

### Enhancements
- **Duplicate detection during manual entry** — Warn if email already exists before saving
- **Smart field parsing** — Paste a LinkedIn URL and auto-extract name, title, company
- **Batch import progress** — Show per-contact status during large imports (success/skip/error)
- **Import history** — Track past imports with ability to undo/rollback
- **Contact card scanning** — Use device camera to scan business cards (mobile)

### Integration Enhancements
- **Two-way sync** — Not just import, but keep contacts in sync with source
- **Selective import** — Choose specific contacts/groups to import rather than all
- **Import scheduling** — Auto-sync on a schedule (daily, weekly)

---

## 🎯 Enrichment Queue

### Enhancements
- **Batch sessions** — "Enrich 5 contacts" mode with streak counter and progress
- **Smart prioritization** — ML-based priority based on user behavior patterns
- **Snooze/defer** — "Remind me about this contact in 1 week" instead of skip
- **Skip reasons** — Track why contacts were skipped to improve queue algorithm
- **Enrichment suggestions** — AI suggests what specific info is missing per contact

### Open Questions
- **Skip behavior** — Should skipped contacts reappear after X days, or sink to bottom permanently?
- **Score calculation** — How should enrichment score be weighted? Suggested formula:
  ```
  Score = (
    hasName * 10 +
    hasEmail * 10 +
    hasTitle * 10 +
    hasCompany * 10 +
    hasLocation * 5 +
    hasLinkedIn * 5 +
    hasHowWeMet * 15 +
    hasWhyNow * 20 +
    hasTags * 5 +
    hasNotes * 10
  )
  ```

---

## 🎮 Gamified Enrichment Flow

### Enhancements
- **Voice input** — Speech-to-text for faster enrichment (was in original spec, needs implementation)
- **AI suggestions** — Claude suggests tags, "Why Now" content based on conversation
- **Quick templates** — Pre-fill common patterns ("Met at [conference]", "Referred by [person]")
- **Undo/back** — Navigate back to previous question in the flow
- **Progress persistence** — Save partial progress if user abandons mid-flow

---

## 💬 Chat Exploration

### Enhancements
- **Saved queries** — Save frequently used exploration prompts
- **Export results** — Export chat results as a list or report
- **Multi-select from results** — Select multiple suggested contacts for bulk actions
- **Conversation history** — Persist chat history across sessions
- **Suggested prompts** — Show contextual prompt suggestions based on user's network

---

## 🔐 Auth & Account

### Enhancements
- **Magic link login** — Passwordless email login option
- **2FA/MFA** — Two-factor authentication for security
- **Session management** — View and revoke active sessions
- **Login history** — Track login attempts and locations
- **Account recovery** — Multiple recovery options beyond email

---

## ⚙️ Settings

### Enhancements
- **Import/export settings** — Backup and restore preferences
- **Theme options** — Light mode, custom accent colors
- **Data retention controls** — Auto-delete contacts not updated in X months
- **API access** — Generate API keys for power users/integrations
- **Team/sharing** — Share contacts or collaborate (future multi-user feature)

---

## 🌐 Platform-Wide

### Performance
- **Offline support** — Cache contacts for offline viewing
- **Lazy loading** — Virtual scrolling for large contact lists
- **Search indexing** — Full-text search across all contact fields

### Mobile
- **Responsive design** — Tablet and mobile layouts (partially addressed in prototypes)
- **Native app** — iOS/Android apps with push notifications
- **Widget** — Quick-add contact widget for home screen

### Integrations (Beyond Import)
- **Calendar integration** — See upcoming meetings with contacts
- **Email integration** — Track last email sent/received
- **CRM sync** — Two-way sync with Salesforce, HubSpot, etc.
- **Zapier/Make** — Automation triggers and actions

### AI Features
- **Relationship insights** — "You haven't contacted Sarah in 3 months"
- **Introduction suggestions** — "David and Lisa should meet because..."
- **Meeting prep** — Auto-generate briefing doc before meetings
- **Follow-up reminders** — Smart nudges based on conversation context

---

## 📊 Analytics (Future Feature)

- **Network health dashboard** — Visualize relationship strength distribution
- **Growth metrics** — Contacts added over time, enrichment velocity
- **Engagement tracking** — Which contacts you interact with most
- **Tag analytics** — Distribution of contacts by category
- **Export reports** — PDF/CSV reports of network analysis

---

## Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Keyboard shortcuts | High | Low | P1 |
| Notes as timeline | Medium | Medium | P2 |
| Voice input for enrichment | High | Medium | P1 |
| Duplicate detection | High | Low | P1 |
| Offline support | Medium | High | P3 |
| Two-way sync | Medium | High | P3 |
| AI relationship insights | High | High | P2 |
| Mobile apps | High | Very High | P3 |

---

## Notes

- Features marked P1 should be considered for V1.1 release
- P2 features are good candidates for V2
- P3 features require significant infrastructure and should be evaluated based on user feedback
- All AI features depend on Claude API integration patterns established in V1

*Last updated: December 2024*
