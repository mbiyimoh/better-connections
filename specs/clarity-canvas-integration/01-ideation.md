# Clarity Canvas Integration for Better Contacts

**Slug:** clarity-canvas-integration
**Author:** Claude Code
**Date:** 2026-02-07
**Branch:** preflight/clarity-canvas-integration
**Related:** `docs/clarity-canvas-companion-api-handoff.md`

---

## 1) Intent & Assumptions

### Task Brief
Implement Clarity Canvas OAuth integration allowing Better Contacts users to connect their 33 Strategies profile from Settings. Beyond the technical connection, design an experience that immediately shows value by:
1. Displaying a summary of what was "loaded in" from their Clarity Canvas
2. Ensuring the Explore chat AI thoughtfully uses this context in every response
3. Making the user feel their network searches are now personalized

### Assumptions
- The 33 Strategies Companion API is deployed and accessible at `https://33strategies.ai/api/companion/*`
- OAuth client registration will be completed (client ID: `better-contacts`)
- Single-user app context: one user = one potential Clarity Canvas connection
- The Clarity Canvas "base synthesis" (~800 tokens) is the primary context to inject
- Users already have contacts in Better Contacts before connecting Clarity Canvas
- The Explore chat is the primary AI surface where this context adds value

### Out of Scope
- Multi-account support (connecting multiple Clarity Canvas profiles)
- Bi-directional sync (writing back to Clarity Canvas from Better Contacts)
- Clarity Canvas tools in Explore chat (get_profile_section, search_profile) - Phase 2
- Deep profile section fetching beyond base synthesis - Phase 2
- Matching Clarity Canvas personas to specific contacts - Phase 3

---

## 2) Pre-reading Log

### Documentation
- `docs/clarity-canvas-companion-api-handoff.md`: Complete OAuth + API integration guide (869 lines), includes code templates for oauth utils, callback routes, API client, AI tool definitions, and system prompt building
- `CLAUDE.md`: Design system (gold #d4a54a, glassmorphism, dark theme), tech stack (Next.js 14, Supabase Auth, Prisma, Vercel AI SDK v5), port 3333

### Existing Patterns
- `src/app/(dashboard)/settings/page.tsx:166-353`: Card-based settings layout with Account, Data Management, Session sections. Pattern: `<Card>` with header icons, description, and action buttons. Mobile-responsive with `md:` breakpoints.
- `src/app/api/chat/explore/route.ts:1-101`: Current explore chat implementation. Fetches top 50 contacts, sanitizes for prompt injection, builds system prompt with contact JSON, uses `streamText()` from Vercel AI SDK.
- `src/lib/openai.ts:43-59`: `EXPLORATION_SYSTEM_PROMPT` - current chat instructions. No user context beyond contacts.
- `prisma/schema.prisma:11-48`: User model with auth fields, no OAuth token storage currently.
- `src/app/auth/callback/route.ts`: Supabase auth callback pattern - good reference for OAuth callback handling.
- `src/lib/supabase/client.ts` and `server.ts`: Supabase client patterns for browser and server contexts.

### Related Specs
- No existing specs for external integrations - this is the first third-party OAuth flow

---

## 3) Codebase Map

### Primary Components/Modules
| File | Role |
|------|------|
| `src/app/(dashboard)/settings/page.tsx` | Settings UI - add Integrations card here |
| `src/app/api/chat/explore/route.ts` | Chat API - inject Clarity Canvas context here |
| `src/lib/openai.ts` | System prompts - enhance with user context |
| `prisma/schema.prisma` | Add OAuth token fields to User model |
| `src/app/api/auth/callback/route.ts` | Reference for callback patterns |

### New Files to Create
| Path | Purpose |
|------|---------|
| `src/lib/clarity-canvas/oauth.ts` | PKCE generation, token exchange, refresh |
| `src/lib/clarity-canvas/client.ts` | Authenticated API client for Companion API |
| `src/lib/clarity-canvas/types.ts` | TypeScript types for synthesis, profile data |
| `src/app/api/auth/callback/clarity-canvas/route.ts` | OAuth callback handler |
| `src/app/api/clarity-canvas/auth/start/route.ts` | Initiate OAuth flow |
| `src/app/api/clarity-canvas/auth/disconnect/route.ts` | Remove connection |
| `src/app/api/clarity-canvas/synthesis/route.ts` | Fetch/cache user synthesis |
| `src/components/settings/ClarityCanvasConnection.tsx` | Connect/disconnect UI |
| `src/components/settings/ConnectionSuccessModal.tsx` | Post-connection summary |

### Shared Dependencies
- `src/lib/db.ts`: Prisma client
- `src/lib/supabase/server.ts`: Auth session handling
- `src/hooks/use-toast.ts`: Notification toasts
- `src/lib/design-system.ts`: BRAND_GOLD, styling constants

### Data Flow
```
[Settings Page]
    → Click "Connect Clarity Canvas"
    → POST /api/clarity-canvas/auth/start
    → Set PKCE cookies, redirect to 33strategies.ai/api/oauth/authorize
    → User consents on 33 Strategies
    → Redirect to /api/auth/callback/clarity-canvas
    → Exchange code for tokens, store in User
    → Fetch base synthesis immediately
    → Redirect to /settings?success=connected
    → Show ConnectionSuccessModal with synthesis preview

[Explore Chat]
    → POST /api/chat/explore
    → Check if user has clarityCanvasConnected
    → If connected, fetch synthesis (from cache or API)
    → Inject synthesis into system prompt
    → AI responses now personalized to user's business context
```

### Feature Flags/Config
- `CLARITY_CANVAS_CLIENT_ID`: OAuth client ID (env var)
- `CLARITY_CANVAS_CLIENT_SECRET`: OAuth client secret (env var)
- `CLARITY_CANVAS_ISSUER`: Base URL `https://33strategies.ai` (env var)
- `CLARITY_CANVAS_API_URL`: API base `https://33strategies.ai/api/companion` (env var)

### Potential Blast Radius
- **Settings page**: Adding new card section (low risk, additive)
- **Explore chat API**: Modifying system prompt (medium risk - test thoroughly)
- **User model**: Adding new fields (migration required)
- **Auth flow**: New OAuth callback (isolated, low risk)

---

## 4) Root Cause Analysis

N/A - This is a new feature, not a bug fix.

---

## 5) Research Findings

### Research Summary
Deep analysis of 60+ sources on OAuth success flows, context-aware AI interfaces, and profile sync experiences. Key insight: **successful products compress time-to-value to under 30 seconds**.

### Potential Solutions

#### Solution 1: Minimal MVP (Connection + Silent Context)
**Approach:** Connect OAuth, store tokens, inject synthesis into chat prompts silently.

**Pros:**
- Fastest to implement
- No new UI components beyond connect button
- Users experience better AI responses immediately

**Cons:**
- Users don't know their context is being used
- No "aha moment" when connection completes
- No transparency = lower trust

**Estimated Effort:** 2-3 days

---

#### Solution 2: Connection + Success Summary Modal
**Approach:** After OAuth success, show modal with:
- "What we loaded" summary (goals, personas, stage)
- Sample of how this will personalize their experience
- CTA to try Explore chat

**Pros:**
- Immediate value demonstration
- User understands what data was connected
- Builds trust through transparency
- Drives engagement with Explore feature

**Cons:**
- More UI work (modal component)
- Need to design good summary format
- Modal interruption could feel jarring

**Estimated Effort:** 4-5 days

---

#### Solution 3: Full Contextual Experience
**Approach:** Solution 2 + visible context indicators in Explore chat:
- "Based on your Clarity Canvas" badge on personalized suggestions
- Context panel showing active profile data
- Tool use for fetching additional profile sections on-demand

**Pros:**
- Maximum transparency
- Users can see AI "working" with their context
- Enables deeper personalization via tools
- Premium feel

**Cons:**
- Most complex implementation
- Requires AI tool handling in chat
- More testing needed for tool reliability
- Risk of information overload

**Estimated Effort:** 8-10 days

---

### Recommendation

**Start with Solution 2** - Connection + Success Summary Modal. This balances:
1. Immediate value demonstration (modal shows what we learned)
2. Reasonable implementation scope (4-5 days)
3. Foundation for Solution 3 features later

The success modal is critical for the "aha moment" - research shows users who see value within 30 seconds have 3x higher retention. Silent context injection (Solution 1) wastes this opportunity.

---

## 6) Clarification

### Design Decisions Needed

1. **Success Modal Content Structure**
   - Option A: Show raw synthesis JSON (technical, transparent)
   - Option B: Formatted summary with sections (Goals, Personas, Stage)
   - Option C: Natural language summary ("You're a founder at seed stage focused on...")
   - **Recommendation:** Option B or C - humanize the data
   >> both B and C. C for a one or two sentence summary at top, B for a "view more details" expandable element that shows formatted section by section summary

2. **Context Visibility in Explore Chat**
   - Option A: No indication (silent personalization)
   - Option B: One-time "Your Clarity Canvas is enhancing responses" banner
   - Option C: Per-response badge when context was used
   - **Recommendation:** Option B for MVP, can add C later
   >> I don't need a per-response badge, but I DO want to ensure that the information from your canvas is actually fed into the prompt(s) that handle the task of fetching relrvant contacts based on the users chat messages. in other words: now it should be like 50% clarity canvas stuff we know about you + 50% specific messages / prompts the user in putting in the explore chat. We should also make sure that the "wino" section that we show for each contact in the contact viewer is similarly... a) actually referencing and using the information from the clarity; b) referencing that information in the canvas itself in the explanation it provides to the user on the front end when it ultimately displays the "why now" explanation for each contact

3. **Connection State Display in Settings**
   - Option A: Simple "Connected" badge with disconnect button
   - Option B: Connected state shows summary of what's connected (name, last sync)
   - Option C: Full card with profile preview and re-sync option
   - **Recommendation:** Option B - shows value without overwhelming
   >> option C. I assume thats the same card we show after the initial connection, so this shouldn't be that much more work than option B

4. **Token Storage Security**
   - Option A: Store tokens as plain text (simpler, Supabase RLS protects)
   - Option B: Encrypt tokens at rest (more secure, more complexity)
   - **Recommendation:** Option A for MVP given single-user context, add encryption if needed
   >> option A is fine for now

5. **Synthesis Caching Strategy**
   - Option A: Fetch fresh on every chat request (most current, more latency)
   - Option B: Cache for 1 hour in-memory (fast, may be stale)
   - Option C: Store synthesis in User model, refresh on connection/periodic
   - **Recommendation:** Option C - store in DB, refresh on explicit sync or 24h
   >> option C is fine

6. **Chat System Prompt Enhancement**
   - Option A: Prepend synthesis JSON to existing prompt
   - Option B: Create dedicated "User Context" section with structured format
   - Option C: Build contextual prompt template that weaves in relevant pieces
   - **Recommendation:** Option B - clear separation, easier to maintain
   >> option B but make sure that prompt is rich, thoughtful, and purpose-driven around the ultimate goal of identifying the best, most relevant contacts to you and what you're trying to accomplish right now, as outlined by both the canvas and the explore messages

7. **Disconnect Experience**
   - Option A: Immediate disconnect, no confirmation
   - Option B: Confirmation dialog explaining what will stop working
   - Option C: Soft disconnect (hide context but keep tokens for easy reconnect)
   - **Recommendation:** Option B - prevent accidental disconnects
   >> option B

8. **Error Handling for API Failures**
   - When Companion API is down or tokens expire mid-session:
   - Option A: Silently fall back to non-personalized responses
   - Option B: Show error toast but continue with degraded experience
   - Option C: Block chat until connection is restored
   - **Recommendation:** Option A with console logging - graceful degradation
   >> option B

---

## 7) Proposed System Prompt Enhancement

```typescript
// Example enhanced system prompt structure
const systemPrompt = `You are an AI assistant helping a user explore their professional network.

## User Context (from Clarity Canvas)
${synthesis ? `
**Business Stage:** ${synthesis.companyStage}
**Primary Goals:** ${synthesis.goals.join(', ')}
**Target Personas:** ${synthesis.targetPersonas.map(p => p.name).join(', ')}
**Key Challenges:** ${synthesis.challenges.join(', ')}

When suggesting contacts, prioritize those who:
- Align with the user's current goals
- Match or can connect to their target personas
- Can help with their stated challenges
` : 'User has not connected Clarity Canvas. Provide general networking advice.'}

## User's Contacts (${contacts.length} total)
${JSON.stringify(contactContext, null, 2)}

## Guidelines
- Reference the user's business context when making recommendations
- Explain WHY a contact is relevant to their specific situation
- Prioritize strategic value over generic networking
- If no contacts match their goals, suggest what type of person to seek
`;
```

---

## 8) Database Schema Changes

```prisma
model User {
  // ... existing fields ...

  // Clarity Canvas OAuth
  clarityCanvasConnected     Boolean   @default(false)
  clarityCanvasAccessToken   String?   @db.Text
  clarityCanvasRefreshToken  String?   @db.Text
  clarityCanvasTokenExpiresAt DateTime?
  clarityCanvasConnectedAt   DateTime?
  clarityCanvasSynthesis     Json?     // Cached base synthesis
  clarityCanvasSyncedAt      DateTime? // Last synthesis fetch
}
```

---

## 9) Success Metrics

- **Connection Rate:** % of users who complete OAuth flow after clicking Connect
- **Time to First Chat:** Time between connection and first Explore chat message
- **Chat Engagement Delta:** Compare chat usage before/after connection
- **Personalization Quality:** User feedback on relevance of suggestions (future)

---

## 10) Open Questions for User

1. Should the success modal be dismissible immediately, or require reading/acknowledging?
2. Preferred synthesis display format: structured sections vs. natural language summary?
3. Should there be a "Refresh from Clarity Canvas" button for manual re-sync?
4. Priority: deeper tool integration (fetch profile sections) vs. polish on MVP flow?
5. Any specific Clarity Canvas fields that are most important to highlight?
