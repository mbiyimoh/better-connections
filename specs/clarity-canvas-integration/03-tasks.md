# Task Breakdown: Clarity Canvas Integration

**Generated:** 2026-02-07
**Source:** specs/clarity-canvas-integration/02-spec.md
**Last Decompose:** 2026-02-07
**Mode:** Full

---

## Overview

Enable Better Contacts users to connect their Clarity Canvas profile from 33 Strategies, allowing personalized contact recommendations based on business context, goals, and target personas.

**Total Tasks:** 16
**Phases:** 3 (Foundation → Settings UI → Explore Enhancement)

---

## Phase 1: Foundation (Infrastructure & OAuth)

### Task 1.1: Add Prisma Schema Fields + Migration

**Description:** Add Clarity Canvas OAuth and synthesis fields to User model
**Size:** Small
**Priority:** High (blocks all other tasks)
**Dependencies:** None
**Can run parallel with:** None (must complete first)

**Technical Requirements:**

Add 7 new fields to the User model in `prisma/schema.prisma`:

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

**Implementation Steps:**
1. Open `prisma/schema.prisma`
2. Add the 7 fields to User model after existing fields
3. Run `npx prisma migrate dev --name add-clarity-canvas-fields`
4. Verify migration applied successfully
5. Run `npx prisma generate` to update client

**Acceptance Criteria:**
- [ ] Schema compiles without errors
- [ ] Migration runs successfully
- [ ] Prisma client regenerated with new fields
- [ ] Can query `user.clarityCanvasConnected` in code

---

### Task 1.2: Create TypeScript Types for Clarity Canvas

**Description:** Create type definitions for BaseSynthesis and related interfaces
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 1.1

**Technical Requirements:**

Create `src/lib/clarity-canvas/types.ts` with all synthesis types:

```typescript
// src/lib/clarity-canvas/types.ts

export interface BaseSynthesis {
  identity: {
    name: string;
    role: string;
    company: string;
    industry: string;
    companyStage: 'startup' | 'growth' | 'enterprise' | 'unknown';
  };

  personas: PersonaSummary[];
  goals: GoalSummary[];
  painPoints: PainPointSummary[];

  decisionDynamics: {
    decisionMakers: string[];
    buyingProcess: string;
    keyInfluencers: string[];
  };

  strategicPriorities: string[];
  activeProjects: ProjectSummary[];

  _meta: {
    tokenCount: number;
    version: string;
    generatedAt: string;
    profileCompleteness: number;
  };
}

export interface PersonaSummary {
  name: string;
  role: string;
  primaryGoal: string;
  topFrustration: string;
}

export interface GoalSummary {
  goal: string;
  priority: 'high' | 'medium' | 'low';
  timeframe: 'immediate' | 'medium-term' | 'long-term';
}

export interface PainPointSummary {
  pain: string;
  severity: 'critical' | 'moderate' | 'minor';
  category: string;
}

export interface ProjectSummary {
  name: string;
  status: 'active' | 'planned';
  priority: 'high' | 'medium' | 'low';
  description: string;
}

// OAuth token response
export interface ClarityCanvasTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

// Synthesis API response
export interface SynthesisResponse {
  synthesis: BaseSynthesis | null;
  syncedAt: string | null;
  connected: boolean;
}
```

**Implementation Steps:**
1. Create directory `src/lib/clarity-canvas/`
2. Create `types.ts` with all interfaces
3. Verify TypeScript compilation passes

**Acceptance Criteria:**
- [ ] All types compile without errors
- [ ] Types match Companion API contract from spec
- [ ] Can import types in other files

---

### Task 1.3: Implement OAuth Utilities (PKCE + Token Exchange)

**Description:** Create OAuth utility functions for PKCE generation and token exchange
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.2
**Can run parallel with:** Task 1.1

**Technical Requirements:**

Create `src/lib/clarity-canvas/oauth.ts` with OAuth utilities:

```typescript
// src/lib/clarity-canvas/oauth.ts

import crypto from 'crypto';

const ISSUER = process.env.CLARITY_CANVAS_ISSUER!;
const CLIENT_ID = process.env.CLARITY_CANVAS_CLIENT_ID!;
const CLIENT_SECRET = process.env.CLARITY_CANVAS_CLIENT_SECRET!;

/**
 * Generate PKCE challenge pair for OAuth
 */
export function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');

  return { verifier, challenge };
}

/**
 * Build authorization URL for 33 Strategies OAuth
 */
export function getAuthorizationUrl(
  redirectUri: string,
  state: string,
  codeChallenge: string
): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'read:profile read:synthesis search:profile',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${ISSUER}/api/oauth/authorize?${params}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  codeVerifier: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}> {
  const response = await fetch(`${ISSUER}/api/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Token exchange failed');
  }

  return response.json();
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const response = await fetch(`${ISSUER}/api/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Token refresh failed');
  }

  return response.json();
}
```

**Implementation Steps:**
1. Create `src/lib/clarity-canvas/oauth.ts`
2. Implement `generatePKCE()` using crypto
3. Implement `getAuthorizationUrl()` with proper query params
4. Implement `exchangeCodeForTokens()` with PKCE
5. Implement `refreshAccessToken()` for token renewal

**Acceptance Criteria:**
- [ ] PKCE generates valid verifier and S256 challenge
- [ ] Authorization URL includes all required OAuth params
- [ ] Token exchange handles success and error responses
- [ ] Refresh token function handles renewal

---

### Task 1.4: Implement Companion API Client

**Description:** Create authenticated API client for Clarity Canvas Companion API
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.2, Task 1.3
**Can run parallel with:** None

**Technical Requirements:**

Create `src/lib/clarity-canvas/client.ts`:

```typescript
// src/lib/clarity-canvas/client.ts

import { refreshAccessToken } from './oauth';
import { prisma } from '@/lib/db';
import type { BaseSynthesis } from './types';

const API_URL = process.env.CLARITY_CANVAS_API_URL!;

interface ClarityCanvasClient {
  getBaseSynthesis(): Promise<BaseSynthesis>;
}

/**
 * Create a Clarity Canvas API client for a user
 * Handles token refresh automatically
 */
export async function getClarityClient(userId: string): Promise<ClarityCanvasClient | null> {
  // Fetch user's tokens
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      clarityCanvasAccessToken: true,
      clarityCanvasRefreshToken: true,
      clarityCanvasTokenExpiresAt: true,
      clarityCanvasConnected: true,
    },
  });

  if (!user?.clarityCanvasConnected || !user.clarityCanvasAccessToken) {
    return null;
  }

  // Check if token needs refresh (with 5 min buffer)
  let accessToken = user.clarityCanvasAccessToken;
  const bufferMs = 5 * 60 * 1000; // 5 minutes

  if (user.clarityCanvasTokenExpiresAt &&
      new Date(user.clarityCanvasTokenExpiresAt.getTime() - bufferMs) < new Date()) {
    try {
      const tokens = await refreshAccessToken(user.clarityCanvasRefreshToken!);
      accessToken = tokens.access_token;

      // Update stored tokens
      await prisma.user.update({
        where: { id: userId },
        data: {
          clarityCanvasAccessToken: tokens.access_token,
          clarityCanvasRefreshToken: tokens.refresh_token,
          clarityCanvasTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      });
    } catch (error) {
      console.error('[clarity-canvas] Token refresh failed:', error);
      // Mark as disconnected if refresh fails
      await prisma.user.update({
        where: { id: userId },
        data: { clarityCanvasConnected: false },
      });
      return null;
    }
  }

  // Create authenticated fetch helper
  const authFetch = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Companion API error: ${response.status}`);
    }

    return response.json();
  };

  return {
    async getBaseSynthesis(): Promise<BaseSynthesis> {
      const { synthesis } = await authFetch('/synthesis/base');
      return synthesis;
    },
  };
}

/**
 * Fetch and cache synthesis for a user
 */
export async function fetchAndCacheSynthesis(userId: string): Promise<BaseSynthesis | null> {
  const client = await getClarityClient(userId);
  if (!client) return null;

  try {
    const synthesis = await client.getBaseSynthesis();

    // Cache in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        clarityCanvasSynthesis: synthesis as object,
        clarityCanvasSyncedAt: new Date(),
      },
    });

    return synthesis;
  } catch (error) {
    console.error('[clarity-canvas] Failed to fetch synthesis:', error);
    return null;
  }
}

/**
 * Check if synthesis should be refreshed (>24h old)
 */
export function shouldRefreshSynthesis(syncedAt: Date | null): boolean {
  if (!syncedAt) return true;
  const twentyFourHours = 24 * 60 * 60 * 1000;
  return Date.now() - syncedAt.getTime() > twentyFourHours;
}
```

**Implementation Steps:**
1. Create `src/lib/clarity-canvas/client.ts`
2. Implement `getClarityClient()` with auto token refresh
3. Implement `fetchAndCacheSynthesis()` for caching
4. Implement `shouldRefreshSynthesis()` helper
5. Add proper error handling and logging

**Acceptance Criteria:**
- [ ] Client handles token expiry and refresh
- [ ] Failed refresh marks user as disconnected
- [ ] Synthesis is cached in database
- [ ] Staleness check works (>24h)

---

### Task 1.5: Implement OAuth Start Route

**Description:** Create API route to initiate OAuth flow
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.3
**Can run parallel with:** Task 1.4

**Technical Requirements:**

Create `src/app/api/clarity-canvas/auth/start/route.ts`:

```typescript
// src/app/api/clarity-canvas/auth/start/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';
import { generatePKCE, getAuthorizationUrl } from '@/lib/clarity-canvas/oauth';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  // Require auth
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Generate PKCE
  const { verifier, challenge } = generatePKCE();

  // Generate state for CSRF protection
  const state = nanoid(32);

  // Build redirect URI
  const redirectUri = new URL(
    '/api/auth/callback/clarity-canvas',
    process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  ).toString();

  // Build authorization URL
  const authUrl = getAuthorizationUrl(redirectUri, state, challenge);

  // Store state and verifier in secure cookies
  const cookieStore = await cookies();

  cookieStore.set('clarity_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });

  cookieStore.set('clarity_code_verifier', verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });

  return NextResponse.json({ authUrl });
}
```

**Implementation Steps:**
1. Create directory `src/app/api/clarity-canvas/auth/start/`
2. Create `route.ts` with POST handler
3. Implement PKCE generation and state creation
4. Set secure httpOnly cookies
5. Return authorization URL

**Acceptance Criteria:**
- [ ] Route requires authentication
- [ ] PKCE challenge generated correctly
- [ ] State stored in httpOnly cookie
- [ ] Returns valid authorization URL

---

### Task 1.6: Implement OAuth Callback Route

**Description:** Create API route to handle OAuth callback, exchange tokens, fetch synthesis
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.3, Task 1.4
**Can run parallel with:** Task 1.5

**Technical Requirements:**

Create `src/app/api/auth/callback/clarity-canvas/route.ts`:

```typescript
// src/app/api/auth/callback/clarity-canvas/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCodeForTokens } from '@/lib/clarity-canvas/oauth';
import { fetchAndCacheSynthesis } from '@/lib/clarity-canvas/client';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = request.nextUrl.origin;

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle user denial
  if (error) {
    console.log('[clarity-canvas] OAuth denied:', error);
    return NextResponse.redirect(
      new URL('/settings?error=access_denied', origin)
    );
  }

  // Validate state (CSRF protection)
  const cookieStore = await cookies();
  const storedState = cookieStore.get('clarity_oauth_state')?.value;
  const codeVerifier = cookieStore.get('clarity_code_verifier')?.value;

  if (!state || state !== storedState || !codeVerifier) {
    console.error('[clarity-canvas] Invalid state or missing verifier');
    return NextResponse.redirect(
      new URL('/settings?error=invalid_state', origin)
    );
  }

  // Get current user
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', origin));
  }

  try {
    // Exchange code for tokens
    const redirectUri = new URL(
      '/api/auth/callback/clarity-canvas',
      process.env.NEXT_PUBLIC_APP_URL || origin
    ).toString();

    const tokens = await exchangeCodeForTokens(code!, redirectUri, codeVerifier);

    // Store tokens in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        clarityCanvasAccessToken: tokens.access_token,
        clarityCanvasRefreshToken: tokens.refresh_token,
        clarityCanvasTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        clarityCanvasConnected: true,
        clarityCanvasConnectedAt: new Date(),
      },
    });

    // Fetch and cache synthesis immediately
    await fetchAndCacheSynthesis(user.id);

    // Clear OAuth cookies
    const response = NextResponse.redirect(
      new URL('/settings?clarity_connected=true', origin)
    );
    response.cookies.delete('clarity_oauth_state');
    response.cookies.delete('clarity_code_verifier');

    return response;
  } catch (error) {
    console.error('[clarity-canvas] OAuth error:', error);
    return NextResponse.redirect(
      new URL('/settings?error=token_exchange_failed', origin)
    );
  }
}
```

**Implementation Steps:**
1. Create directory `src/app/api/auth/callback/clarity-canvas/`
2. Create `route.ts` with GET handler
3. Implement state validation against cookie
4. Exchange code for tokens
5. Store tokens and fetch synthesis
6. Clear cookies and redirect

**Acceptance Criteria:**
- [ ] State validation prevents CSRF
- [ ] Token exchange works with PKCE
- [ ] Tokens stored in database
- [ ] Synthesis fetched and cached
- [ ] Cookies cleared after success
- [ ] Proper error redirects

---

### Task 1.7: Implement Disconnect Route

**Description:** Create API route to disconnect Clarity Canvas
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 1.1
**Can run parallel with:** Task 1.5, Task 1.6

**Technical Requirements:**

Create `src/app/api/clarity-canvas/auth/disconnect/route.ts`:

```typescript
// src/app/api/clarity-canvas/auth/disconnect/route.ts

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

export async function POST() {
  // Require auth
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Clear all Clarity Canvas data
    await prisma.user.update({
      where: { id: user.id },
      data: {
        clarityCanvasConnected: false,
        clarityCanvasAccessToken: null,
        clarityCanvasRefreshToken: null,
        clarityCanvasTokenExpiresAt: null,
        clarityCanvasSynthesis: null,
        clarityCanvasSyncedAt: null,
        // Keep clarityCanvasConnectedAt for historical record
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[clarity-canvas] Disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
```

**Implementation Steps:**
1. Create directory `src/app/api/clarity-canvas/auth/disconnect/`
2. Create `route.ts` with POST handler
3. Clear all token and synthesis fields
4. Keep `clarityCanvasConnectedAt` for audit

**Acceptance Criteria:**
- [ ] Route requires authentication
- [ ] All OAuth fields cleared
- [ ] Synthesis cache cleared
- [ ] Returns success response

---

### Task 1.8: Implement Synthesis Route

**Description:** Create API route to get/refresh cached synthesis
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 1.4
**Can run parallel with:** Task 1.7

**Technical Requirements:**

Create `src/app/api/clarity-canvas/synthesis/route.ts`:

```typescript
// src/app/api/clarity-canvas/synthesis/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { fetchAndCacheSynthesis } from '@/lib/clarity-canvas/client';
import type { BaseSynthesis, SynthesisResponse } from '@/lib/clarity-canvas/types';

export async function GET(request: NextRequest) {
  // Require auth
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get('refresh') === 'true';

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        clarityCanvasConnected: true,
        clarityCanvasSynthesis: true,
        clarityCanvasSyncedAt: true,
      },
    });

    if (!dbUser?.clarityCanvasConnected) {
      const response: SynthesisResponse = {
        synthesis: null,
        syncedAt: null,
        connected: false,
      };
      return NextResponse.json(response);
    }

    let synthesis = dbUser.clarityCanvasSynthesis as BaseSynthesis | null;
    let syncedAt = dbUser.clarityCanvasSyncedAt;

    // Refresh if requested or no cached data
    if (forceRefresh || !synthesis) {
      const freshSynthesis = await fetchAndCacheSynthesis(user.id);
      if (freshSynthesis) {
        synthesis = freshSynthesis;
        syncedAt = new Date();
      }
    }

    const response: SynthesisResponse = {
      synthesis,
      syncedAt: syncedAt?.toISOString() || null,
      connected: true,
    };

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[clarity-canvas] Synthesis fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch synthesis' },
      { status: 500 }
    );
  }
}
```

**Implementation Steps:**
1. Create directory `src/app/api/clarity-canvas/synthesis/`
2. Create `route.ts` with GET handler
3. Support `?refresh=true` query param
4. Return cached or fresh synthesis

**Acceptance Criteria:**
- [ ] Returns cached synthesis by default
- [ ] Force refresh fetches from API
- [ ] Handles disconnected state
- [ ] No-cache headers set

---

## Phase 2: Settings UI

### Task 2.1: Create SynthesisSummary Component

**Description:** Component that generates natural language summary from synthesis
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 1.2
**Can run parallel with:** Task 2.2, Task 2.3

**Technical Requirements:**

Create `src/components/clarity-canvas/SynthesisSummary.tsx`:

```typescript
// src/components/clarity-canvas/SynthesisSummary.tsx

'use client';

import type { BaseSynthesis } from '@/lib/clarity-canvas/types';

interface SynthesisSummaryProps {
  synthesis: BaseSynthesis;
  className?: string;
}

/**
 * Generate a natural language summary from synthesis data
 */
function generateSummary(synthesis: BaseSynthesis): string {
  const { identity, goals, activeProjects } = synthesis;

  // Build role description
  const roleDesc = identity.role
    ? `a ${identity.role.toLowerCase()}`
    : 'working';

  // Build company description
  const companyDesc = identity.company
    ? `at ${identity.company}`
    : '';

  // Build stage description
  const stageDesc = identity.companyStage !== 'unknown'
    ? ` (${identity.companyStage} stage)`
    : '';

  // Build industry description
  const industryDesc = identity.industry
    ? ` in the ${identity.industry.toLowerCase()} space`
    : '';

  // Get top priority goals
  const topGoals = goals
    .filter(g => g.priority === 'high' || g.timeframe === 'immediate')
    .slice(0, 2)
    .map(g => g.goal.toLowerCase());

  // Get active projects
  const activeProjectNames = activeProjects
    .filter(p => p.status === 'active')
    .slice(0, 1)
    .map(p => p.name.toLowerCase());

  // Build focus description
  let focusDesc = '';
  if (topGoals.length > 0) {
    focusDesc = `, focused on ${topGoals.join(' and ')}`;
  } else if (activeProjectNames.length > 0) {
    focusDesc = `, working on ${activeProjectNames[0]}`;
  }

  return `You're ${roleDesc} ${companyDesc}${stageDesc}${industryDesc}${focusDesc}.`;
}

export function SynthesisSummary({ synthesis, className }: SynthesisSummaryProps) {
  const summary = generateSummary(synthesis);

  return (
    <p className={`text-zinc-300 italic ${className || ''}`}>
      "{summary}"
    </p>
  );
}
```

**Implementation Steps:**
1. Create `src/components/clarity-canvas/SynthesisSummary.tsx`
2. Implement `generateSummary()` function
3. Handle missing/partial data gracefully
4. Style with project design system

**Acceptance Criteria:**
- [ ] Generates readable summary from synthesis
- [ ] Handles missing fields gracefully
- [ ] Matches design system styling

---

### Task 2.2: Create SynthesisDetails Component

**Description:** Expandable component showing synthesis details by section
**Size:** Medium
**Priority:** Medium
**Dependencies:** Task 1.2
**Can run parallel with:** Task 2.1, Task 2.3

**Technical Requirements:**

Create `src/components/clarity-canvas/SynthesisDetails.tsx`:

```typescript
// src/components/clarity-canvas/SynthesisDetails.tsx

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Target, Users, Briefcase, AlertTriangle } from 'lucide-react';
import type { BaseSynthesis } from '@/lib/clarity-canvas/types';

interface SynthesisDetailsProps {
  synthesis: BaseSynthesis;
  defaultExpanded?: boolean;
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

function Section({ title, icon, count, children, defaultExpanded = false }: SectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border-t border-white/10 pt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left text-sm text-white hover:text-gold-primary transition-colors"
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        {icon}
        <span className="font-medium">{title}</span>
        <span className="text-zinc-500">({count})</span>
      </button>
      {expanded && (
        <div className="mt-2 pl-6 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
}

export function SynthesisDetails({ synthesis, defaultExpanded = false }: SynthesisDetailsProps) {
  const { goals, personas, activeProjects, painPoints, strategicPriorities } = synthesis;

  return (
    <div className="space-y-3">
      {/* Goals Section */}
      {goals.length > 0 && (
        <Section
          title="Goals"
          icon={<Target size={16} className="text-gold-primary" />}
          count={goals.length}
          defaultExpanded={defaultExpanded}
        >
          {goals.map((goal, i) => (
            <div key={i} className="text-sm text-zinc-400">
              • {goal.goal}
              <span className="text-zinc-600 ml-1">
                ({goal.priority} priority, {goal.timeframe})
              </span>
            </div>
          ))}
        </Section>
      )}

      {/* Target Personas Section */}
      {personas.length > 0 && (
        <Section
          title="Target Personas"
          icon={<Users size={16} className="text-gold-primary" />}
          count={personas.length}
          defaultExpanded={defaultExpanded}
        >
          {personas.map((persona, i) => (
            <div key={i} className="text-sm mb-2">
              <div className="text-zinc-300 font-medium">• {persona.name}</div>
              <div className="text-zinc-500 pl-3 text-xs">
                <div>Role: {persona.role}</div>
                <div>Goal: {persona.primaryGoal}</div>
                <div>Frustration: {persona.topFrustration}</div>
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* Active Projects Section */}
      {activeProjects.length > 0 && (
        <Section
          title="Active Projects"
          icon={<Briefcase size={16} className="text-gold-primary" />}
          count={activeProjects.length}
          defaultExpanded={defaultExpanded}
        >
          {activeProjects.map((project, i) => (
            <div key={i} className="text-sm text-zinc-400">
              • {project.name}
              <span className="text-zinc-600 ml-1">
                ({project.status}, {project.priority} priority)
              </span>
            </div>
          ))}
        </Section>
      )}

      {/* Strategic Priorities */}
      {strategicPriorities.length > 0 && (
        <Section
          title="Strategic Priorities"
          icon={<Target size={16} className="text-gold-primary" />}
          count={strategicPriorities.length}
          defaultExpanded={defaultExpanded}
        >
          {strategicPriorities.map((priority, i) => (
            <div key={i} className="text-sm text-zinc-400">
              • {priority}
            </div>
          ))}
        </Section>
      )}

      {/* Pain Points Section */}
      {painPoints.length > 0 && (
        <Section
          title="Challenges"
          icon={<AlertTriangle size={16} className="text-gold-primary" />}
          count={painPoints.length}
          defaultExpanded={defaultExpanded}
        >
          {painPoints.map((pain, i) => (
            <div key={i} className="text-sm text-zinc-400">
              • {pain.pain}
              <span className="text-zinc-600 ml-1">
                ({pain.severity}, {pain.category})
              </span>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}
```

**Implementation Steps:**
1. Create `src/components/clarity-canvas/SynthesisDetails.tsx`
2. Implement expandable Section component
3. Render all synthesis sections with icons
4. Handle empty sections gracefully

**Acceptance Criteria:**
- [ ] All synthesis sections rendered
- [ ] Sections expand/collapse correctly
- [ ] Icons match design system
- [ ] Empty sections hidden

---

### Task 2.3: Create DisconnectDialog Component

**Description:** Confirmation dialog for disconnecting Clarity Canvas
**Size:** Small
**Priority:** Medium
**Dependencies:** None
**Can run parallel with:** Task 2.1, Task 2.2

**Technical Requirements:**

Create `src/components/clarity-canvas/DisconnectDialog.tsx`:

```typescript
// src/components/clarity-canvas/DisconnectDialog.tsx

'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DisconnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function DisconnectDialog({ open, onOpenChange, onConfirm }: DisconnectDialogProps) {
  const [disconnecting, setDisconnecting] = useState(false);

  const handleConfirm = async () => {
    setDisconnecting(true);
    try {
      await onConfirm();
    } finally {
      setDisconnecting(false);
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-zinc-900 border-white/10">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="text-amber-500" size={20} />
            Disconnect Clarity Canvas?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400 space-y-3">
            <p>This will remove your 33 Strategies profile connection.</p>
            <p>Your Explore chat will no longer have context about:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your business goals and priorities</li>
              <li>Your target customer personas</li>
              <li>Your active projects</li>
            </ul>
            <p>
              Contact recommendations will become generic rather than
              personalized to your situation.
            </p>
            <p className="text-zinc-500">You can reconnect anytime from Settings.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            className="bg-white/10 border-white/10 text-white hover:bg-white/20"
            disabled={disconnecting}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={disconnecting}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {disconnecting ? 'Disconnecting...' : 'Disconnect'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

**Implementation Steps:**
1. Create `src/components/clarity-canvas/DisconnectDialog.tsx`
2. Use AlertDialog from shadcn/ui
3. Include warning about lost functionality
4. Handle loading state during disconnect

**Acceptance Criteria:**
- [ ] Dialog opens/closes correctly
- [ ] Shows warning about lost features
- [ ] Loading state while disconnecting
- [ ] Calls onConfirm callback

---

### Task 2.4: Create ClarityCanvasCard Component

**Description:** Main settings card with connected/disconnected states
**Size:** Large
**Priority:** High
**Dependencies:** Task 2.1, Task 2.2, Task 2.3
**Can run parallel with:** None

**Technical Requirements:**

Create `src/components/settings/ClarityCanvasCard.tsx`:

```typescript
// src/components/settings/ClarityCanvasCard.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, Check, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { SynthesisSummary } from '@/components/clarity-canvas/SynthesisSummary';
import { SynthesisDetails } from '@/components/clarity-canvas/SynthesisDetails';
import { DisconnectDialog } from '@/components/clarity-canvas/DisconnectDialog';
import type { BaseSynthesis, SynthesisResponse } from '@/lib/clarity-canvas/types';

interface ClarityCanvasCardProps {
  initialConnected?: boolean;
  initialSynthesis?: BaseSynthesis | null;
  initialSyncedAt?: string | null;
}

export function ClarityCanvasCard({
  initialConnected = false,
  initialSynthesis = null,
  initialSyncedAt = null,
}: ClarityCanvasCardProps) {
  const router = useRouter();
  const [connected, setConnected] = useState(initialConnected);
  const [synthesis, setSynthesis] = useState<BaseSynthesis | null>(initialSynthesis);
  const [syncedAt, setSyncedAt] = useState<string | null>(initialSyncedAt);
  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Format relative time
  const formatSyncTime = (isoString: string | null) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const response = await fetch('/api/clarity-canvas/auth/start', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to start OAuth flow');
      }

      const { authUrl } = await response.json();
      window.location.href = authUrl;
    } catch (error) {
      console.error('[clarity-canvas] Connect error:', error);
      toast({
        title: 'Connection failed',
        description: 'Unable to connect to Clarity Canvas. Please try again.',
        variant: 'destructive',
      });
      setConnecting(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/clarity-canvas/synthesis?refresh=true');
      if (!response.ok) throw new Error('Refresh failed');

      const data: SynthesisResponse = await response.json();
      setSynthesis(data.synthesis);
      setSyncedAt(data.syncedAt);

      toast({
        title: 'Refreshed',
        description: 'Your Clarity Canvas profile has been updated.',
      });
    } catch (error) {
      console.error('[clarity-canvas] Refresh error:', error);
      toast({
        title: 'Refresh failed',
        description: 'Unable to refresh your profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleDisconnect = async () => {
    const response = await fetch('/api/clarity-canvas/auth/disconnect', {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Disconnect failed');
    }

    setConnected(false);
    setSynthesis(null);
    setSyncedAt(null);

    toast({
      title: 'Disconnected',
      description: 'Your Clarity Canvas has been disconnected.',
    });

    router.refresh();
  };

  return (
    <Card className="bg-zinc-900 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Link2 size={20} className="text-gold-primary" />
          Integrations
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Connect external services to enhance your experience
        </CardDescription>
      </CardHeader>
      <CardContent>
        {connected && synthesis ? (
          // Connected State
          <div className="rounded-lg border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-green-500/10 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Check size={18} className="text-green-500" />
                <span className="text-white font-medium">Clarity Canvas Connected</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">
                  Last synced: {formatSyncTime(syncedAt)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="h-8 px-2 text-zinc-400 hover:text-white"
                >
                  {refreshing ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Summary */}
              <SynthesisSummary synthesis={synthesis} />

              {/* Expandable Details */}
              <div>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-sm text-gold-primary hover:text-gold-light transition-colors"
                >
                  {showDetails ? '▼ Hide Details' : '▶ View Details'}
                </button>
                {showDetails && (
                  <div className="mt-3">
                    <SynthesisDetails synthesis={synthesis} defaultExpanded />
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDisconnect(true)}
                className="text-zinc-500 hover:text-red-400"
              >
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          // Disconnected State
          <div className="rounded-lg border border-white/10 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-gold-subtle mx-auto flex items-center justify-center mb-4">
              <Link2 size={24} className="text-gold-primary" />
            </div>
            <h3 className="text-white font-medium mb-2">Clarity Canvas</h3>
            <p className="text-sm text-zinc-400 mb-4 max-w-sm mx-auto">
              Connect your 33 Strategies profile to get personalized contact
              recommendations based on your goals and personas
            </p>
            <Button
              onClick={handleConnect}
              disabled={connecting}
              className="bg-gold-primary hover:bg-gold-light text-black"
            >
              {connecting ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                'Connect Clarity Canvas'
              )}
            </Button>
          </div>
        )}

        <DisconnectDialog
          open={showDisconnect}
          onOpenChange={setShowDisconnect}
          onConfirm={handleDisconnect}
        />
      </CardContent>
    </Card>
  );
}
```

**Implementation Steps:**
1. Create `src/components/settings/ClarityCanvasCard.tsx`
2. Implement disconnected state with connect button
3. Implement connected state with synthesis preview
4. Add refresh and disconnect functionality
5. Integrate SynthesisSummary, SynthesisDetails, DisconnectDialog

**Acceptance Criteria:**
- [ ] Disconnected state shows connect button
- [ ] Connected state shows synthesis summary
- [ ] View Details expands synthesis sections
- [ ] Refresh button fetches fresh data
- [ ] Disconnect opens confirmation dialog
- [ ] Loading states for all actions

---

### Task 2.5: Create ConnectionSuccessModal Component

**Description:** Modal shown after successful OAuth connection
**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.1, Task 2.2
**Can run parallel with:** Task 2.4

**Technical Requirements:**

Create `src/components/settings/ConnectionSuccessModal.tsx`:

```typescript
// src/components/settings/ConnectionSuccessModal.tsx

'use client';

import { useRouter } from 'next/navigation';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SynthesisSummary } from '@/components/clarity-canvas/SynthesisSummary';
import { SynthesisDetails } from '@/components/clarity-canvas/SynthesisDetails';
import type { BaseSynthesis } from '@/lib/clarity-canvas/types';

interface ConnectionSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  synthesis: BaseSynthesis;
}

export function ConnectionSuccessModal({
  open,
  onOpenChange,
  synthesis
}: ConnectionSuccessModalProps) {
  const router = useRouter();

  const handleExplore = () => {
    onOpenChange(false);
    router.push('/explore');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-4">
          <div className="w-16 h-16 rounded-full bg-green-500/20 mx-auto flex items-center justify-center mb-4">
            <Check size={32} className="text-green-500" />
          </div>
          <DialogTitle className="text-xl text-white">
            Clarity Canvas Connected
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary */}
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <SynthesisSummary synthesis={synthesis} />
          </div>

          {/* What we'll use */}
          <div>
            <p className="text-sm text-zinc-400 mb-4">
              Here's what we'll use to personalize your experience:
            </p>
            <SynthesisDetails synthesis={synthesis} defaultExpanded />
          </div>

          {/* CTA */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <p className="text-sm text-zinc-400 text-center">
              Your Explore chat will now suggest contacts based on these
              goals and priorities.
            </p>
            <Button
              onClick={handleExplore}
              className="w-full bg-gold-primary hover:bg-gold-light text-black"
            >
              <Sparkles size={16} className="mr-2" />
              Explore Your Network
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Implementation Steps:**
1. Create `src/components/settings/ConnectionSuccessModal.tsx`
2. Show success checkmark and title
3. Display SynthesisSummary
4. Display SynthesisDetails (expanded by default)
5. Add CTA to navigate to Explore

**Acceptance Criteria:**
- [ ] Modal displays synthesis summary
- [ ] All detail sections expanded
- [ ] "Explore Your Network" navigates to /explore
- [ ] Modal dismissible

---

### Task 2.6: Integrate ClarityCanvasCard into Settings Page

**Description:** Add ClarityCanvasCard to settings page and handle success modal
**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.4, Task 2.5
**Can run parallel with:** None

**Technical Requirements:**

Modify `src/app/(dashboard)/settings/page.tsx`:

1. Fetch Clarity Canvas state on load
2. Add ClarityCanvasCard after Account card
3. Handle `?clarity_connected=true` query param to show success modal
4. Fetch synthesis for modal display

```typescript
// Add to imports
import { ClarityCanvasCard } from '@/components/settings/ClarityCanvasCard';
import { ConnectionSuccessModal } from '@/components/settings/ConnectionSuccessModal';
import type { BaseSynthesis } from '@/lib/clarity-canvas/types';

// Add state in component
const [clarityConnected, setClarityConnected] = useState(false);
const [claritySynthesis, setClaritySynthesis] = useState<BaseSynthesis | null>(null);
const [claritySyncedAt, setClaritySyncedAt] = useState<string | null>(null);
const [showSuccessModal, setShowSuccessModal] = useState(false);

// Add to useEffect (after fetchUserProfile)
const fetchClarityStatus = async () => {
  try {
    const response = await fetch('/api/clarity-canvas/synthesis');
    if (response.ok) {
      const data = await response.json();
      setClarityConnected(data.connected);
      setClaritySynthesis(data.synthesis);
      setClaritySyncedAt(data.syncedAt);
    }
  } catch (error) {
    console.error('Failed to fetch Clarity Canvas status:', error);
  }
};

// Check for success query param
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('clarity_connected') === 'true') {
    fetchClarityStatus().then(() => {
      setShowSuccessModal(true);
    });
    // Clean up URL
    window.history.replaceState({}, '', '/settings');
  } else {
    fetchClarityStatus();
  }
}, []);

// Add card after Account section (inside the space-y-6 div)
{/* Integrations Section */}
<ClarityCanvasCard
  initialConnected={clarityConnected}
  initialSynthesis={claritySynthesis}
  initialSyncedAt={claritySyncedAt}
/>

// Add modal at end of component (before closing div)
{claritySynthesis && (
  <ConnectionSuccessModal
    open={showSuccessModal}
    onOpenChange={setShowSuccessModal}
    synthesis={claritySynthesis}
  />
)}
```

**Implementation Steps:**
1. Add imports for new components
2. Add state for Clarity Canvas data
3. Add fetchClarityStatus function
4. Check for `clarity_connected` query param
5. Add ClarityCanvasCard between Account and Data Management
6. Add ConnectionSuccessModal

**Acceptance Criteria:**
- [ ] ClarityCanvasCard renders in settings
- [ ] Success modal shows after OAuth redirect
- [ ] Query param cleaned from URL
- [ ] Card reflects current connection state

---

## Phase 3: Explore Chat Enhancement

### Task 3.1: Create System Prompt Builder

**Description:** Create function to build enhanced system prompt with synthesis context
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.2
**Can run parallel with:** Phase 2 tasks

**Technical Requirements:**

Create `src/lib/clarity-canvas/prompts.ts`:

```typescript
// src/lib/clarity-canvas/prompts.ts

import type { BaseSynthesis } from './types';

/**
 * Build an enhanced system prompt for Explore chat
 * Injects Clarity Canvas context to personalize recommendations
 */
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

**Implementation Steps:**
1. Create `src/lib/clarity-canvas/prompts.ts`
2. Implement `buildExploreSystemPrompt()` function
3. Handle null synthesis case
4. Include all synthesis sections in context
5. Add clear instructions for strategic recommendations

**Acceptance Criteria:**
- [ ] Returns base prompt when no synthesis
- [ ] Includes all synthesis sections when connected
- [ ] Instructions emphasize strategic fit
- [ ] Output format matches existing contact reference pattern

---

### Task 3.2: Update Explore Chat API Route

**Description:** Modify chat API to inject Clarity Canvas synthesis into prompt
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.1, Task 1.4, Task 3.1
**Can run parallel with:** None

**Technical Requirements:**

Update `src/app/api/chat/explore/route.ts`:

```typescript
// src/app/api/chat/explore/route.ts

import { streamText } from "ai";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { gpt4oMini } from "@/lib/openai";
import { buildExploreSystemPrompt } from "@/lib/clarity-canvas/prompts";
import { shouldRefreshSynthesis, fetchAndCacheSynthesis } from "@/lib/clarity-canvas/client";
import type { BaseSynthesis } from "@/lib/clarity-canvas/types";

// Input validation schema
const exploreRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      })
    )
    .min(1)
    .max(50),
});

// Sanitize text for prompt injection prevention
function sanitizeForPrompt(text: string | null): string {
  if (!text) return "";
  return text
    .replace(/(\[SYSTEM\]|\[ASSISTANT\]|\[USER\])/gi, "")
    .replace(/```/g, "'''")
    .substring(0, 500);
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const body = await request.json();
    const validatedInput = exploreRequestSchema.parse(body);

    // Fetch user with Clarity Canvas data
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        clarityCanvasConnected: true,
        clarityCanvasSynthesis: true,
        clarityCanvasSyncedAt: true,
      },
    });

    // Get synthesis if connected, with auto-refresh check
    let synthesis: BaseSynthesis | null = null;
    let synthesisError = false;

    if (dbUser?.clarityCanvasConnected) {
      try {
        synthesis = dbUser.clarityCanvasSynthesis as BaseSynthesis | null;

        // If synthesis is stale (>24h), try to refresh in background
        if (shouldRefreshSynthesis(dbUser.clarityCanvasSyncedAt)) {
          // Attempt refresh, but don't block on it
          fetchAndCacheSynthesis(user.id).catch(err => {
            console.error('[clarity-canvas] Background refresh failed:', err);
          });
        }
      } catch (error) {
        console.error('[clarity-canvas] Failed to get synthesis:', error);
        synthesisError = true;
      }
    }

    // Fetch user's contacts for context
    const contacts = await prisma.contact.findMany({
      where: { userId: user.id },
      include: { tags: true },
      take: 50,
      orderBy: { enrichmentScore: "desc" },
    });

    // Serialize contacts for prompt context with sanitization
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

    // Build enhanced system prompt with Clarity Canvas context
    const systemPrompt = `${buildExploreSystemPrompt(synthesis, contacts.length)}

## User's Contacts (${contacts.length} total)
${JSON.stringify(contactContext, null, 2)}

CRITICAL: When suggesting contacts, you MUST use their exact "id" field value from the JSON above.
Example: If a contact has "id": "cm4z5abc123", write [CONTACT: cm4z5abc123] NOT [CONTACT: their-email@example.com]
The id field looks like "cm..." followed by random characters. Always use this exact id value.`;

    const result = streamText({
      model: gpt4oMini(),
      system: systemPrompt,
      messages: validatedInput.messages,
    });

    const response = result.toTextStreamResponse();
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");

    // Add error flag for client-side toast
    if (synthesisError) {
      response.headers.set('X-Clarity-Canvas-Error', 'true');
    }

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response("Invalid request body", {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      });
    }
    console.error("Chat exploration error:", error);
    return new Response("Failed to process chat request", {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
```

**Implementation Steps:**
1. Add imports for Clarity Canvas modules
2. Fetch user's Clarity Canvas data
3. Check synthesis staleness and trigger background refresh
4. Replace static system prompt with `buildExploreSystemPrompt()`
5. Add `X-Clarity-Canvas-Error` header on failure

**Acceptance Criteria:**
- [ ] Synthesis injected into system prompt
- [ ] Stale synthesis triggers background refresh
- [ ] Error flag set in response headers
- [ ] Existing contact functionality unchanged

---

### Task 3.3: Add Error Toast in Explore Chat

**Description:** Show toast when Clarity Canvas API fails during chat
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 3.2
**Can run parallel with:** None

**Technical Requirements:**

Update the Explore page chat handling to check for error header:

```typescript
// In src/app/(dashboard)/explore/page.tsx or wherever chat fetch happens

// After receiving streaming response, check for error header
const handleSendMessage = async (message: string) => {
  // ... existing send logic ...

  const response = await fetch('/api/chat/explore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [...messages, { role: 'user', content: message }] }),
  });

  // Check for Clarity Canvas error
  if (response.headers.get('X-Clarity-Canvas-Error')) {
    toast({
      title: "Clarity Canvas temporarily unavailable",
      description: "Suggestions may be less personalized. Try refreshing your connection in Settings.",
      variant: "default", // or create a "warning" variant
    });
  }

  // ... continue with streaming response handling ...
};
```

**Implementation Steps:**
1. Find where chat API is called in Explore page
2. Add check for `X-Clarity-Canvas-Error` header
3. Show toast notification when error detected
4. Continue with normal response handling

**Acceptance Criteria:**
- [ ] Toast shown when API returns error header
- [ ] Toast has clear message and action
- [ ] Chat continues to work (graceful degradation)

---

### Task 3.4: Create Index Export for Clarity Canvas Module

**Description:** Create barrel export for all Clarity Canvas utilities
**Size:** Small
**Priority:** Low
**Dependencies:** All lib/clarity-canvas tasks
**Can run parallel with:** Any Phase 3 task

**Technical Requirements:**

Create `src/lib/clarity-canvas/index.ts`:

```typescript
// src/lib/clarity-canvas/index.ts

// Types
export type {
  BaseSynthesis,
  PersonaSummary,
  GoalSummary,
  PainPointSummary,
  ProjectSummary,
  ClarityCanvasTokens,
  SynthesisResponse,
} from './types';

// OAuth utilities
export {
  generatePKCE,
  getAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
} from './oauth';

// API client
export {
  getClarityClient,
  fetchAndCacheSynthesis,
  shouldRefreshSynthesis,
} from './client';

// Prompt builder
export { buildExploreSystemPrompt } from './prompts';
```

**Implementation Steps:**
1. Create `src/lib/clarity-canvas/index.ts`
2. Export all types from types.ts
3. Export all functions from oauth.ts, client.ts, prompts.ts

**Acceptance Criteria:**
- [ ] All exports work correctly
- [ ] Can import from `@/lib/clarity-canvas`

---

## Execution Strategy

### Parallel Execution Opportunities

```
Phase 1 (Foundation):
├── Task 1.1 (Schema) ──────────────────────────────►
├── Task 1.2 (Types) ───────────────────►
├── Task 1.3 (OAuth Utils) ─────────────────────────►
│                          └── Task 1.4 (API Client) ────────►
├── Task 1.5 (Start Route) ─────────────────────────►
├── Task 1.6 (Callback Route) ──────────────────────────────►
├── Task 1.7 (Disconnect Route) ────────────────────►
└── Task 1.8 (Synthesis Route) ─────────────────────►

Phase 2 (Settings UI):
├── Task 2.1 (SynthesisSummary) ────────►
├── Task 2.2 (SynthesisDetails) ────────────────►
├── Task 2.3 (DisconnectDialog) ────────►
│                               └── Task 2.4 (ClarityCanvasCard) ────────────►
├── Task 2.5 (SuccessModal) ────────────────────►
│                          └── Task 2.6 (Settings Integration) ────────►

Phase 3 (Explore Enhancement):
├── Task 3.1 (Prompt Builder) ────────────────►
│                             └── Task 3.2 (Chat API Update) ────────►
│                                                            └── Task 3.3 (Error Toast) ──►
└── Task 3.4 (Index Export) ──►
```

### Critical Path

1. Task 1.1 (Schema) → Task 1.4 (Client) → Task 1.6 (Callback) → Task 2.6 (Settings Integration)
2. Task 3.1 (Prompt Builder) → Task 3.2 (Chat API Update)

### Recommended Execution Order

1. **Day 1**: Tasks 1.1, 1.2, 1.3 (in parallel)
2. **Day 2**: Tasks 1.4, 1.5, 1.6, 1.7, 1.8 (1.4 depends on 1.2, 1.3)
3. **Day 3**: Tasks 2.1, 2.2, 2.3 (in parallel)
4. **Day 4**: Tasks 2.4, 2.5, 2.6, 3.1 (2.4/2.5 depend on 2.1-2.3)
5. **Day 5**: Tasks 3.2, 3.3, 3.4 (3.2 depends on 3.1)

---

## Summary

| Phase | Tasks | Est. Time |
|-------|-------|-----------|
| Phase 1: Foundation | 8 tasks | 1.5-2 days |
| Phase 2: Settings UI | 6 tasks | 1.5-2 days |
| Phase 3: Explore Enhancement | 4 tasks | 1 day |
| **Total** | **18 tasks** | **4-5 days** |

Note: One-time banner in Explore (from spec Section 8) was cut per validation feedback.
