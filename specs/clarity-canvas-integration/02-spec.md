# Clarity Canvas Integration - Technical Specification

**Slug:** clarity-canvas-integration
**Author:** Claude Code
**Date:** 2026-02-07
**Status:** Ready for Implementation
**Estimated Effort:** 5-6 days

---

## 1) Overview

### Purpose
Enable Better Contacts users to connect their Clarity Canvas profile from 33 Strategies, allowing the AI to deeply understand their business context, goals, and target personas when making contact recommendations.

### Core Value Proposition
Transform generic networking suggestions into strategic, personalized recommendations by knowing:
- Who the user is (identity, role, company stage)
- What they're trying to accomplish (goals, projects, priorities)
- Who they need to reach (target personas, decision-makers)
- What challenges they face (pain points, constraints)

### User Stories
1. **As a user**, I can connect my Clarity Canvas from Settings so the AI knows my business context
2. **As a user**, I see a summary of what was "loaded in" after connecting so I understand the value
3. **As a user**, my Explore chat suggestions reference my goals and personas so recommendations feel strategic
4. **As a user**, I can view my connected profile and manually refresh it from Settings
5. **As a user**, I can disconnect my Clarity Canvas if I no longer want personalized suggestions

---

## 2) Companion API Contract

### Base Synthesis Schema (~800-1000 tokens)

```typescript
interface BaseSynthesis {
  identity: {
    name: string;
    role: string;           // from role.responsibilities.title
    company: string;        // from organization.fundamentals.company_name
    industry: string;       // from organization.fundamentals.org_industry
    companyStage: 'startup' | 'growth' | 'enterprise' | 'unknown';
  };

  personas: PersonaSummary[];  // Up to 3 customer personas
  // Each: { name, role, primaryGoal, topFrustration }

  goals: GoalSummary[];  // Up to 5 goals (3 immediate + 2 medium-term)
  // Each: { goal, priority, timeframe }

  painPoints: PainPointSummary[];  // Up to 3 pain points
  // Each: { pain, severity, category }

  decisionDynamics: {
    decisionMakers: string[];
    buyingProcess: string;      // from individual.thinking.decision_making
    keyInfluencers: string[];   // from network.stakeholders
  };

  strategicPriorities: string[];  // Up to 5 priorities from goals.strategy

  activeProjects: ProjectSummary[];  // Up to 4 projects
  // Each: { name, status: 'active'|'planned', priority, description }

  _meta: {
    tokenCount: number;
    version: string;
    generatedAt: string;
    profileCompleteness: number;  // 0-100%
  };
}

interface PersonaSummary {
  name: string;
  role: string;
  primaryGoal: string;
  topFrustration: string;
}

interface GoalSummary {
  goal: string;
  priority: 'high' | 'medium' | 'low';
  timeframe: 'immediate' | 'medium-term' | 'long-term';
}

interface PainPointSummary {
  pain: string;
  severity: 'critical' | 'moderate' | 'minor';
  category: string;
}

interface ProjectSummary {
  name: string;
  status: 'active' | 'planned';
  priority: 'high' | 'medium' | 'low';
  description: string;
}
```

### API Endpoints Used

| Endpoint | Method | Purpose | When Used |
|----------|--------|---------|-----------|
| `/api/companion/synthesis/base` | GET | Get full synthesis | On connect, on refresh |
| `/api/companion/profile/section/:id` | GET | Deep dive on section | Future: AI tools |
| `/api/companion/profile/search` | POST | Search profile | Future: AI tools |

### Required Scopes
- `read:profile` - Access profile sections
- `read:synthesis` - Access base synthesis
- `search:profile` - Search across profile

---

## 3) Database Schema

### User Model Changes

```prisma
model User {
  // ... existing fields ...

  // Clarity Canvas OAuth
  clarityCanvasConnected      Boolean   @default(false)
  clarityCanvasAccessToken    String?   @db.Text
  clarityCanvasRefreshToken   String?   @db.Text
  clarityCanvasTokenExpiresAt DateTime?
  clarityCanvasConnectedAt    DateTime?

  // Cached synthesis (avoid API calls on every chat)
  clarityCanvasSynthesis      Json?     // BaseSynthesis object
  clarityCanvasSyncedAt       DateTime? // Last successful sync
}
```

### Migration

```sql
-- Migration: add_clarity_canvas_fields
ALTER TABLE "User" ADD COLUMN "clarityCanvasConnected" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "clarityCanvasAccessToken" TEXT;
ALTER TABLE "User" ADD COLUMN "clarityCanvasRefreshToken" TEXT;
ALTER TABLE "User" ADD COLUMN "clarityCanvasTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "clarityCanvasConnectedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "clarityCanvasSynthesis" JSONB;
ALTER TABLE "User" ADD COLUMN "clarityCanvasSyncedAt" TIMESTAMP(3);
```

---

## 4) OAuth Flow

### Environment Variables

```bash
# .env
CLARITY_CANVAS_CLIENT_ID=better-contacts
CLARITY_CANVAS_CLIENT_SECRET=<from-registration>
CLARITY_CANVAS_ISSUER=https://33strategies.ai
CLARITY_CANVAS_API_URL=https://33strategies.ai/api/companion
```

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              OAUTH FLOW                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Settings Page]                                                             │
│       │                                                                      │
│       ▼ Click "Connect Clarity Canvas"                                       │
│  POST /api/clarity-canvas/auth/start                                         │
│       │                                                                      │
│       ├─► Generate PKCE (verifier + challenge)                               │
│       ├─► Generate state (CSRF token)                                        │
│       ├─► Store in httpOnly cookies (10 min TTL)                             │
│       └─► Return authorization URL                                           │
│                                                                              │
│       ▼ Redirect to 33 Strategies                                            │
│  https://33strategies.ai/api/oauth/authorize?...                             │
│       │                                                                      │
│       ▼ User consents                                                        │
│  Redirect to /api/auth/callback/clarity-canvas?code=...&state=...            │
│       │                                                                      │
│       ├─► Validate state matches cookie                                      │
│       ├─► Exchange code for tokens (with PKCE verifier)                      │
│       ├─► Store tokens in User model                                         │
│       ├─► Fetch base synthesis immediately                                   │
│       ├─► Store synthesis in User model                                      │
│       ├─► Clear OAuth cookies                                                │
│       └─► Redirect to /settings?clarity_connected=true                       │
│                                                                              │
│  [Settings Page]                                                             │
│       │                                                                      │
│       ▼ Detect ?clarity_connected=true                                       │
│       └─► Show ConnectionSuccessModal with synthesis preview                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5) API Routes

### Route Structure

```
src/app/api/
├── auth/
│   └── callback/
│       └── clarity-canvas/
│           └── route.ts          # OAuth callback handler
├── clarity-canvas/
│   ├── auth/
│   │   ├── start/
│   │   │   └── route.ts          # Initiate OAuth flow
│   │   └── disconnect/
│   │       └── route.ts          # Remove connection
│   └── synthesis/
│       └── route.ts              # Get/refresh synthesis
```

### POST /api/clarity-canvas/auth/start

**Purpose:** Generate PKCE, set cookies, return auth URL

**Request:** None (uses session)

**Response:**
```typescript
{
  authUrl: string;  // Full 33 Strategies authorization URL
}
```

### GET /api/auth/callback/clarity-canvas

**Purpose:** Handle OAuth callback, exchange tokens, fetch synthesis

**Query Params:**
- `code` - Authorization code
- `state` - CSRF state token
- `error` - Error code (if user denied)

**Response:** Redirect to `/settings?clarity_connected=true` or `/settings?error=...`

### POST /api/clarity-canvas/auth/disconnect

**Purpose:** Remove Clarity Canvas connection

**Request:** None (uses session)

**Response:**
```typescript
{
  success: boolean;
}
```

**Side Effects:**
- Set `clarityCanvasConnected = false`
- Clear all token fields
- Clear cached synthesis

### GET /api/clarity-canvas/synthesis

**Purpose:** Get cached synthesis or refresh from API

**Query Params:**
- `refresh=true` - Force fresh fetch from Companion API

**Response:**
```typescript
{
  synthesis: BaseSynthesis | null;
  syncedAt: string | null;        // ISO timestamp
  connected: boolean;
}
```

---

## 6) UI Components

### File Structure

```
src/components/
├── settings/
│   ├── ClarityCanvasCard.tsx         # Main integration card
│   └── ConnectionSuccessModal.tsx    # Post-connect summary
└── clarity-canvas/
    ├── SynthesisSummary.tsx          # Natural language summary
    ├── SynthesisDetails.tsx          # Expandable section-by-section
    └── DisconnectDialog.tsx          # Confirmation dialog
```

### ClarityCanvasCard States

#### Disconnected State
```
┌─────────────────────────────────────────────────────────────────┐
│  🔗  Integrations                                               │
│      Connect external services to enhance your experience       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  [Clarity Canvas Logo]                                    │  │
│  │                                                           │  │
│  │  Clarity Canvas                                           │  │
│  │  Connect your 33 Strategies profile to get personalized   │  │
│  │  contact recommendations based on your goals and personas │  │
│  │                                                           │  │
│  │                              [ Connect Clarity Canvas ]   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Connected State (Full Profile Preview)
```
┌─────────────────────────────────────────────────────────────────┐
│  🔗  Integrations                                               │
│      Connect external services to enhance your experience       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ✓ Clarity Canvas Connected                               │  │
│  │  Last synced: 2 hours ago                    [ Refresh ]  │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │                                                           │  │
│  │  "You're a founder at Acme (seed stage) focused on        │  │
│  │   closing your Series A and building enterprise sales     │  │
│  │   partnerships."                                          │  │
│  │                                                           │  │
│  │  ▼ View Details                                           │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ Goals (3)                                           │  │  │
│  │  │ • Close Series A funding (high priority)            │  │  │
│  │  │ • Launch enterprise tier (medium priority)          │  │  │
│  │  │ • Hire VP Sales (high priority)                     │  │  │
│  │  ├─────────────────────────────────────────────────────┤  │  │
│  │  │ Target Personas (2)                                 │  │  │
│  │  │ • VP of Engineering - needs faster deployments      │  │  │
│  │  │ • CTO at Series B+ - evaluating build vs buy        │  │  │
│  │  ├─────────────────────────────────────────────────────┤  │  │
│  │  │ Active Projects (2)                                 │  │  │
│  │  │ • Fundraising roadshow (active, high)               │  │  │
│  │  │ • Enterprise pilot program (planned, medium)        │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  │                                        [ Disconnect ]     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### ConnectionSuccessModal

Shown immediately after successful OAuth connection.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                              ✕  │
│                          ✓                                      │
│                  Clarity Canvas Connected                       │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  "You're a founder at Acme (seed stage) in the developer       │
│   tools space, focused on closing your Series A and building   │
│   enterprise sales partnerships."                              │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Here's what we'll use to personalize your experience:         │
│                                                                 │
│  ▼ Your Goals (3)                                              │
│    • Close Series A funding (high priority, immediate)         │
│    • Launch enterprise tier (medium priority, medium-term)     │
│    • Hire VP Sales (high priority, immediate)                  │
│                                                                 │
│  ▼ Target Personas (2)                                         │
│    • VP of Engineering                                         │
│      Goal: Faster deployments                                  │
│      Frustration: Legacy CI/CD tooling                         │
│    • CTO at Series B+ startups                                 │
│      Goal: Evaluating build vs buy                             │
│      Frustration: Integration complexity                       │
│                                                                 │
│  ▼ Active Projects (2)                                         │
│    • Fundraising roadshow (active, high priority)              │
│    • Enterprise pilot program (planned, medium priority)       │
│                                                                 │
│  ▼ Strategic Priorities                                        │
│    • Product-market fit validation                             │
│    • Enterprise go-to-market motion                            │
│    • Technical co-founder networking                           │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Your Explore chat will now suggest contacts based on these    │
│  goals and priorities.                                         │
│                                                                 │
│                    [ Explore Your Network ]                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### DisconnectDialog

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️  Disconnect Clarity Canvas?                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  This will remove your 33 Strategies profile connection.       │
│                                                                 │
│  Your Explore chat will no longer have context about:          │
│  • Your business goals and priorities                          │
│  • Your target customer personas                               │
│  • Your active projects                                        │
│                                                                 │
│  Contact recommendations will become generic rather than       │
│  personalized to your situation.                               │
│                                                                 │
│  You can reconnect anytime from Settings.                      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                          [ Cancel ]    [ Disconnect ]           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7) Explore Chat Enhancement

### Enhanced System Prompt

The key change: inject Clarity Canvas synthesis into the system prompt to make contact recommendations strategic and personalized.

```typescript
// src/lib/clarity-canvas/prompts.ts

export function buildExploreSystemPrompt(
  synthesis: BaseSynthesis | null,
  contactCount: number
): string {
  const baseInstructions = `You are an AI assistant helping a user explore and leverage their professional network strategically.

When suggesting contacts, ALWAYS format them using this exact format:
[CONTACT: {contact_id}] {name} - {reason_for_suggestion}`;

  if (!synthesis) {
    return `${baseInstructions}

The user has not connected their Clarity Canvas profile. Provide helpful networking suggestions, but note that you don't have context about their specific business goals or priorities.

Tip: Suggest they connect their Clarity Canvas profile in Settings for personalized recommendations.`;
  }

  // Build rich, purpose-driven context
  return `${baseInstructions}

## Who You're Helping

**${synthesis.identity.name}** is a ${synthesis.identity.role} at ${synthesis.identity.company}, a ${synthesis.identity.companyStage}-stage company in ${synthesis.identity.industry}.

## Their Current Focus

### Immediate Goals
${synthesis.goals
  .filter(g => g.timeframe === 'immediate')
  .map(g => `- **${g.goal}** (${g.priority} priority)`)
  .join('\n') || '- No immediate goals specified'}

### Medium-Term Goals
${synthesis.goals
  .filter(g => g.timeframe === 'medium-term')
  .map(g => `- **${g.goal}** (${g.priority} priority)`)
  .join('\n') || '- No medium-term goals specified'}

### Active Projects
${synthesis.activeProjects
  .filter(p => p.status === 'active')
  .map(p => `- **${p.name}**: ${p.description} (${p.priority} priority)`)
  .join('\n') || '- No active projects'}

### Strategic Priorities
${synthesis.strategicPriorities.map(p => `- ${p}`).join('\n') || '- None specified'}

## Who They Need to Reach

### Target Personas
${synthesis.personas.map(p => `
**${p.name}** (${p.role})
- Primary goal: ${p.primaryGoal}
- Top frustration: ${p.topFrustration}`).join('\n') || 'No personas defined'}

### Key Decision-Makers & Influencers
- Decision-makers: ${synthesis.decisionDynamics.decisionMakers.join(', ') || 'Not specified'}
- Key influencers: ${synthesis.decisionDynamics.keyInfluencers.join(', ') || 'Not specified'}

## Their Challenges

${synthesis.painPoints.map(p => `- **${p.pain}** (${p.severity}, ${p.category})`).join('\n') || '- No pain points specified'}

## How to Help

When recommending contacts, you MUST:

1. **Prioritize Strategic Fit**: Suggest contacts who directly align with their goals, target personas, or can help with their pain points. Generic "good to know" suggestions are less valuable.

2. **Explain the Strategic "Why Now"**: Every suggestion should reference WHY this contact matters for their CURRENT situation. Connect the dots between:
   - The contact's expertise/role/network
   - The user's active goals, projects, or target personas
   - The strategic timing (why reach out NOW vs later)

3. **Consider Their Decision Dynamics**: If they're trying to reach certain decision-makers or navigate specific buying processes, prioritize contacts who can provide warm intros or insider knowledge.

4. **Match to Personas**: If a contact matches or can introduce them to one of their target personas, highlight this explicitly.

5. **Project-Aware Suggestions**: For active projects like "${synthesis.activeProjects[0]?.name || 'their current initiative'}", suggest contacts who can directly accelerate progress.

## Output Format

For each contact suggestion, provide:
[CONTACT: {id}] {Name} - {Strategic reason tied to their goals/personas/projects}

The reason should be 1-2 sentences that explicitly references their Clarity Canvas context (goals, personas, projects, pain points).

Bad example: "John Smith - He's in tech and might be helpful"
Good example: "John Smith - Former VP Sales at a Series B startup who can advise on your enterprise go-to-market motion. He's also connected to several CTOs evaluating build-vs-buy decisions (your target persona)."`;
}
```

### Updated Chat API Route

```typescript
// src/app/api/chat/explore/route.ts

import { streamText } from "ai";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { gpt4oMini } from "@/lib/openai";
import { buildExploreSystemPrompt } from "@/lib/clarity-canvas/prompts";
import type { BaseSynthesis } from "@/lib/clarity-canvas/types";

// ... existing schema ...

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const validatedInput = exploreRequestSchema.parse(body);

    // Fetch user with Clarity Canvas data
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        clarityCanvasConnected: true,
        clarityCanvasSynthesis: true,
      },
    });

    // Get synthesis if connected
    const synthesis = dbUser?.clarityCanvasConnected
      ? (dbUser.clarityCanvasSynthesis as BaseSynthesis | null)
      : null;

    // Fetch contacts (existing logic)
    const contacts = await prisma.contact.findMany({
      where: { userId: user.id },
      include: { tags: true },
      take: 50,
      orderBy: { enrichmentScore: "desc" },
    });

    const contactContext = contacts.map((c) => ({
      id: c.id,
      name: `${sanitizeForPrompt(c.firstName)}${c.lastName ? ' ' + sanitizeForPrompt(c.lastName) : ''}`,
      email: sanitizeForPrompt(c.primaryEmail),
      title: sanitizeForPrompt(c.title),
      company: sanitizeForPrompt(c.company),
      location: sanitizeForPrompt(c.location),
      howWeMet: sanitizeForPrompt(c.howWeMet),
      whyNow: sanitizeForPrompt(c.whyNow),
      expertise: sanitizeForPrompt(c.expertise),
      interests: sanitizeForPrompt(c.interests),
      relationshipStrength: c.relationshipStrength,
      tags: c.tags.map((t) => sanitizeForPrompt(t.text)),
    }));

    // Build enhanced system prompt
    const systemPrompt = `${buildExploreSystemPrompt(synthesis, contacts.length)}

## User's Contacts (${contacts.length} total)
${JSON.stringify(contactContext, null, 2)}

CRITICAL: When suggesting contacts, you MUST use their exact "id" field value from the JSON above.
Example: If a contact has "id": "cm4z5abc123", write [CONTACT: cm4z5abc123]`;

    const result = streamText({
      model: gpt4oMini(),
      system: systemPrompt,
      messages: validatedInput.messages,
    });

    const response = result.toTextStreamResponse();
    response.headers.set("Cache-Control", "no-store");
    return response;

  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response("Invalid request body", { status: 400 });
    }
    console.error("Chat exploration error:", error);
    return new Response("Failed to process chat request", { status: 500 });
  }
}
```

### Error Handling (Option B: Toast + Degraded)

If synthesis fetch fails or tokens expire:

```typescript
// In chat route, wrap synthesis access
let synthesis: BaseSynthesis | null = null;
let synthesisError = false;

if (dbUser?.clarityCanvasConnected) {
  try {
    synthesis = dbUser.clarityCanvasSynthesis as BaseSynthesis | null;

    // If synthesis is stale (>24h), try to refresh
    if (shouldRefreshSynthesis(dbUser.clarityCanvasSyncedAt)) {
      synthesis = await refreshSynthesisFromAPI(user.id);
    }
  } catch (error) {
    console.error('[clarity-canvas] Failed to get synthesis:', error);
    synthesisError = true;
    // Continue with null synthesis - graceful degradation
  }
}

// Pass error flag to response headers for client-side toast
if (synthesisError) {
  response.headers.set('X-Clarity-Canvas-Error', 'true');
}
```

Client-side handling:
```typescript
// In Explore chat component
const response = await fetch('/api/chat/explore', { ... });
if (response.headers.get('X-Clarity-Canvas-Error')) {
  toast({
    title: "Clarity Canvas temporarily unavailable",
    description: "Suggestions may be less personalized. Try refreshing your connection in Settings.",
    variant: "warning",
  });
}
```

---

## 8) One-Time Banner in Explore Chat

When user has Clarity Canvas connected, show a one-time dismissible banner:

```typescript
// src/app/(dashboard)/explore/page.tsx

const [showClarityBanner, setShowClarityBanner] = useState(false);

useEffect(() => {
  // Check if user has Clarity Canvas and hasn't dismissed banner
  const dismissed = localStorage.getItem('clarity-explore-banner-dismissed');
  if (user?.clarityCanvasConnected && !dismissed) {
    setShowClarityBanner(true);
  }
}, [user]);

const dismissBanner = () => {
  localStorage.setItem('clarity-explore-banner-dismissed', 'true');
  setShowClarityBanner(false);
};
```

Banner UI:
```
┌─────────────────────────────────────────────────────────────────┐
│  ✨ Your Clarity Canvas is active                            ✕  │
│  Suggestions are personalized to your goals and target personas │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9) File Structure Summary

### New Files

```
src/
├── app/
│   └── api/
│       ├── auth/
│       │   └── callback/
│       │       └── clarity-canvas/
│       │           └── route.ts              # OAuth callback
│       └── clarity-canvas/
│           ├── auth/
│           │   ├── start/
│           │   │   └── route.ts              # Start OAuth flow
│           │   └── disconnect/
│           │       └── route.ts              # Disconnect
│           └── synthesis/
│               └── route.ts                  # Get/refresh synthesis
├── components/
│   ├── settings/
│   │   ├── ClarityCanvasCard.tsx             # Main card component
│   │   └── ConnectionSuccessModal.tsx        # Post-connect modal
│   └── clarity-canvas/
│       ├── SynthesisSummary.tsx              # NL summary component
│       ├── SynthesisDetails.tsx              # Expandable details
│       └── DisconnectDialog.tsx              # Confirm disconnect
└── lib/
    └── clarity-canvas/
        ├── oauth.ts                          # PKCE, token exchange
        ├── client.ts                         # API client
        ├── types.ts                          # TypeScript interfaces
        └── prompts.ts                        # System prompt builder
```

### Modified Files

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add 7 Clarity Canvas fields to User |
| `src/app/(dashboard)/settings/page.tsx` | Add ClarityCanvasCard |
| `src/app/api/chat/explore/route.ts` | Inject synthesis into prompt |
| `src/app/(dashboard)/explore/page.tsx` | Add one-time banner |

---

## 10) Implementation Phases

### Phase 1: Foundation (Day 1-2)
- [ ] Add Prisma schema fields + migration
- [ ] Create `lib/clarity-canvas/` utilities (oauth.ts, client.ts, types.ts)
- [ ] Implement `/api/clarity-canvas/auth/start` route
- [ ] Implement `/api/auth/callback/clarity-canvas` route
- [ ] Implement `/api/clarity-canvas/auth/disconnect` route
- [ ] Implement `/api/clarity-canvas/synthesis` route

### Phase 2: Settings UI (Day 2-3)
- [ ] Create `ClarityCanvasCard` component (both states)
- [ ] Create `SynthesisSummary` component
- [ ] Create `SynthesisDetails` expandable component
- [ ] Create `DisconnectDialog` component
- [ ] Create `ConnectionSuccessModal` component
- [ ] Integrate into Settings page
- [ ] Handle `?clarity_connected=true` query param

### Phase 3: Explore Enhancement (Day 3-4)
- [ ] Create `prompts.ts` with `buildExploreSystemPrompt`
- [ ] Update explore chat API to inject synthesis
- [ ] Add error handling with header flag
- [ ] Add one-time banner component
- [ ] Add client-side toast for API errors

### Phase 4: Testing & Polish (Day 5-6)
- [ ] Test full OAuth flow (connect, refresh, disconnect)
- [ ] Test chat with and without Clarity Canvas
- [ ] Test error scenarios (API down, token expired)
- [ ] Test banner dismissal persistence
- [ ] Mobile responsive testing
- [ ] Edge cases (empty synthesis fields, partial data)

---

## 11) Environment Variables Checklist

```bash
# Add to .env.local
CLARITY_CANVAS_CLIENT_ID=better-contacts
CLARITY_CANVAS_CLIENT_SECRET=<get-from-33-strategies>
CLARITY_CANVAS_ISSUER=https://33strategies.ai
CLARITY_CANVAS_API_URL=https://33strategies.ai/api/companion

# For local development, also add:
# CLARITY_CANVAS_ISSUER=http://localhost:3000  # If testing locally
```

---

## 12) Success Criteria

1. **OAuth Flow**: User can connect/disconnect Clarity Canvas from Settings
2. **Success Modal**: Shows natural language summary + expandable details after connection
3. **Settings Card**: Shows full profile preview with refresh and disconnect options
4. **Explore Chat**: AI references user's goals, personas, and projects in suggestions
5. **"Why Now" Quality**: Contact suggestions explain strategic relevance tied to Canvas context
6. **Error Handling**: Toast notification when Companion API unavailable, graceful degradation
7. **Banner**: One-time "Your Clarity Canvas is active" notification in Explore

---

## 13) Future Enhancements (Out of Scope)

- **AI Tools**: Let chat fetch specific profile sections on-demand
- **Persona Matching**: Automatically tag contacts that match target personas
- **Goal Tracking**: Surface contacts relevant to specific active projects
- **Bi-directional Sync**: Write insights back to Clarity Canvas
- **Multi-account**: Support multiple Clarity Canvas profiles
