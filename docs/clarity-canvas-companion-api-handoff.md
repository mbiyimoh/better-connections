# Better Contacts + Clarity Canvas Integration Handoff

This document provides everything needed to integrate Better Contacts with the Clarity Companion API.

## Overview

The integration allows Better Contacts users to connect their Clarity Canvas profile, enabling the AI to:
1. Understand the user's business context, goals, and personas
2. Personalize networking recommendations based on their strategic priorities
3. Fetch additional profile details on-demand via AI tools

## Architecture

```
┌─────────────────────┐     OAuth 2.0 + PKCE      ┌──────────────────────┐
│   Better Contacts   │ ◄────────────────────────► │  33 Strategies       │
│   (AI Product)      │                            │  (OAuth Provider)    │
└─────────────────────┘                            └──────────────────────┘
         │                                                   │
         │ Bearer Token                                      │
         ▼                                                   ▼
┌─────────────────────┐                            ┌──────────────────────┐
│ Companion API       │ ◄────────────────────────► │ Clarity Canvas       │
│ /api/companion/*    │                            │ Profile Data         │
└─────────────────────┘                            └──────────────────────┘
```

## Step 1: Register OAuth Client

Before coding, register Better Contacts as an OAuth client on 33 Strategies.

### Option A: Via Admin API (Requires @33strategies.ai login)

```bash
curl -X POST https://33strategies.ai/api/admin/oauth-clients \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-auth-cookie>" \
  -d '{
    "clientId": "better-contacts",
    "clientName": "Better Contacts",
    "redirectUris": [
      "http://localhost:3000/api/auth/callback/clarity-canvas",
      "https://bettercontacts.app/api/auth/callback/clarity-canvas"
    ],
    "scope": "read:profile read:synthesis search:profile",
    "isFirstParty": false
  }'
```

**Response (SAVE THIS - secret shown only once):**
```json
{
  "success": true,
  "clientId": "better-contacts",
  "clientSecret": "abc123xyz789..."
}
```

### Option B: Direct Database (Dev/Testing)

```sql
INSERT INTO "OAuthClient" (
  "clientId",
  "clientSecret",
  "clientName",
  "redirectUris",
  "grantTypes",
  "scope",
  "isFirstParty",
  "isActive"
) VALUES (
  'better-contacts',
  '$2b$10$...',  -- bcrypt hash of secret
  'Better Contacts',
  ARRAY['http://localhost:3000/api/auth/callback/clarity-canvas'],
  ARRAY['authorization_code', 'refresh_token'],
  'read:profile read:synthesis search:profile',
  false,
  true
);
```

## Step 2: Environment Variables

Add to Better Contacts `.env`:

```bash
# Clarity Canvas OAuth
CLARITY_CANVAS_CLIENT_ID=better-contacts
CLARITY_CANVAS_CLIENT_SECRET=<from-registration>
CLARITY_CANVAS_ISSUER=https://33strategies.ai

# API Base URL
CLARITY_CANVAS_API_URL=https://33strategies.ai/api/companion
```

## Step 3: OAuth Implementation

### 3.1 OAuth Routes Structure

```
app/
├── api/
│   └── auth/
│       └── callback/
│           └── clarity-canvas/
│               └── route.ts    # OAuth callback handler
├── settings/
│   └── integrations/
│       └── page.tsx           # "Connect Clarity Canvas" button
└── lib/
    └── clarity-canvas/
        ├── oauth.ts           # OAuth utilities
        ├── client.ts          # API client
        └── tools.ts           # AI tool definitions
```

### 3.2 OAuth Utilities

```typescript
// lib/clarity-canvas/oauth.ts

import crypto from 'crypto';

const ISSUER = process.env.CLARITY_CANVAS_ISSUER!;
const CLIENT_ID = process.env.CLARITY_CANVAS_CLIENT_ID!;
const CLIENT_SECRET = process.env.CLARITY_CANVAS_CLIENT_SECRET!;

/**
 * Generate PKCE challenge pair
 */
export function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');

  return { verifier, challenge };
}

/**
 * Build authorization URL
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
 * Refresh access token
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

### 3.3 OAuth Callback Route

```typescript
// app/api/auth/callback/clarity-canvas/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCodeForTokens } from '@/lib/clarity-canvas/oauth';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth'; // Your existing auth

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle user denial
  if (error) {
    return NextResponse.redirect(
      new URL('/settings/integrations?error=access_denied', request.url)
    );
  }

  // Validate state (CSRF protection)
  const cookieStore = await cookies();
  const storedState = cookieStore.get('clarity_oauth_state')?.value;
  const codeVerifier = cookieStore.get('clarity_code_verifier')?.value;

  if (!state || state !== storedState || !codeVerifier) {
    return NextResponse.redirect(
      new URL('/settings/integrations?error=invalid_state', request.url)
    );
  }

  // Get current user
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  try {
    // Exchange code for tokens
    const redirectUri = new URL(
      '/api/auth/callback/clarity-canvas',
      process.env.NEXT_PUBLIC_APP_URL
    ).toString();

    const tokens = await exchangeCodeForTokens(code!, redirectUri, codeVerifier);

    // Store tokens for user (encrypted in production)
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        clarityCanvasAccessToken: tokens.access_token,
        clarityCanvasRefreshToken: tokens.refresh_token,
        clarityCanvasTokenExpiry: new Date(
          Date.now() + tokens.expires_in * 1000
        ),
        clarityCanvasConnected: true,
      },
    });

    // Clear OAuth cookies
    const response = NextResponse.redirect(
      new URL('/settings/integrations?success=connected', request.url)
    );
    response.cookies.delete('clarity_oauth_state');
    response.cookies.delete('clarity_code_verifier');

    return response;
  } catch (error) {
    console.error('[clarity-canvas] OAuth error:', error);
    return NextResponse.redirect(
      new URL('/settings/integrations?error=token_exchange_failed', request.url)
    );
  }
}
```

### 3.4 Connect Button Component

```typescript
// components/ClarityCanvasConnect.tsx

'use client';

import { useState } from 'react';
import { LinkIcon, Check, Loader2 } from 'lucide-react';

interface Props {
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function ClarityCanvasConnect({ isConnected, onConnect, onDisconnect }: Props) {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);

    // Generate PKCE and state
    const response = await fetch('/api/clarity-canvas/auth/start', {
      method: 'POST',
    });

    const { authUrl } = await response.json();

    // Redirect to 33 Strategies consent screen
    window.location.href = authUrl;
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await fetch('/api/clarity-canvas/auth/disconnect', { method: 'POST' });
      onDisconnect();
    } finally {
      setLoading(false);
    }
  };

  if (isConnected) {
    return (
      <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
        <div className="flex items-center gap-3">
          <Check className="w-5 h-5 text-green-500" />
          <div>
            <p className="text-sm font-medium text-white">Clarity Canvas Connected</p>
            <p className="text-xs text-gray-400">Your AI now understands your business context</p>
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={loading}
          className="text-sm text-gray-400 hover:text-red-400 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Disconnect'}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-3 bg-[#d4a54a] text-black rounded-lg hover:bg-[#e5b85b] transition-colors font-medium"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <LinkIcon className="w-4 h-4" />
      )}
      Connect Clarity Canvas
    </button>
  );
}
```

### 3.5 Auth Start Route

```typescript
// app/api/clarity-canvas/auth/start/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';
import { generatePKCE, getAuthorizationUrl } from '@/lib/clarity-canvas/oauth';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // Require auth
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Generate PKCE
  const { verifier, challenge } = generatePKCE();

  // Generate state for CSRF protection
  const state = nanoid(32);

  // Build redirect URI
  const redirectUri = new URL(
    '/api/auth/callback/clarity-canvas',
    process.env.NEXT_PUBLIC_APP_URL
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
  });

  cookieStore.set('clarity_code_verifier', verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
  });

  return NextResponse.json({ authUrl });
}
```

## Step 4: Companion API Client

```typescript
// lib/clarity-canvas/client.ts

import { refreshAccessToken } from './oauth';
import { prisma } from '@/lib/prisma';

const API_URL = process.env.CLARITY_CANVAS_API_URL!;

interface ClarityCanvasClient {
  getBaseSynthesis(): Promise<BaseSynthesis>;
  getProfileIndex(): Promise<ProfileIndex>;
  getProfileSection(sectionId: string): Promise<ProfileSection>;
  searchProfile(query: string, maxResults?: number): Promise<SearchResult[]>;
}

/**
 * Create a Clarity Canvas API client for a user
 */
export async function getClarityClient(userId: string): Promise<ClarityCanvasClient | null> {
  // Fetch user's tokens
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      clarityCanvasAccessToken: true,
      clarityCanvasRefreshToken: true,
      clarityCanvasTokenExpiry: true,
      clarityCanvasConnected: true,
    },
  });

  if (!user?.clarityCanvasConnected || !user.clarityCanvasAccessToken) {
    return null;
  }

  // Check if token needs refresh
  let accessToken = user.clarityCanvasAccessToken;

  if (user.clarityCanvasTokenExpiry && user.clarityCanvasTokenExpiry < new Date()) {
    try {
      const tokens = await refreshAccessToken(user.clarityCanvasRefreshToken!);
      accessToken = tokens.access_token;

      // Update stored tokens
      await prisma.user.update({
        where: { id: userId },
        data: {
          clarityCanvasAccessToken: tokens.access_token,
          clarityCanvasRefreshToken: tokens.refresh_token,
          clarityCanvasTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
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

  // Return client with authenticated fetch
  const authFetch = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  };

  return {
    async getBaseSynthesis() {
      const { synthesis } = await authFetch('/synthesis/base');
      return synthesis;
    },

    async getProfileIndex() {
      return authFetch('/profile/index');
    },

    async getProfileSection(sectionId: string) {
      return authFetch(`/profile/section/${sectionId}`);
    },

    async searchProfile(query: string, maxResults = 5) {
      const { results } = await authFetch('/profile/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, maxResults }),
      });
      return results;
    },
  };
}
```

## Step 5: AI Integration

### 5.1 Tool Definitions

```typescript
// lib/clarity-canvas/tools.ts

export const CLARITY_CANVAS_TOOLS = [
  {
    name: 'get_profile_index',
    description:
      "Get an overview of the user's Clarity Canvas profile sections with token counts. Use this to understand what information is available before fetching specific sections.",
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_profile_section',
    description:
      "Retrieve a specific section of the user's Clarity Canvas profile. Use when you need more detail about goals, personas, pain points, etc.",
    input_schema: {
      type: 'object',
      properties: {
        section: {
          type: 'string',
          enum: ['individual', 'role', 'organization', 'goals', 'network', 'projects'],
          description: 'Which profile section to retrieve',
        },
      },
      required: ['section'],
    },
  },
  {
    name: 'search_profile',
    description:
      "Search the user's Clarity Canvas profile using natural language. Use when looking for specific information that might be across multiple sections.",
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language search query',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum results to return (default: 5)',
        },
      },
      required: ['query'],
    },
  },
];
```

### 5.2 System Prompt with Context

```typescript
// lib/clarity-canvas/prompts.ts

import type { BaseSynthesis } from './types';

export function buildSystemPrompt(synthesis: BaseSynthesis | null): string {
  const basePrompt = `You are Better Contacts, an AI-powered networking assistant that helps professionals build meaningful connections.`;

  if (!synthesis) {
    return `${basePrompt}

The user has not connected their Clarity Canvas profile. You can still help with general networking advice, but you won't have context about their specific business goals or target personas.

Tip: Suggest they connect their Clarity Canvas profile for personalized recommendations.`;
  }

  return `${basePrompt}

## User Context (from Clarity Canvas)

${JSON.stringify(synthesis, null, 2)}

## Using This Context

1. Reference their goals and priorities when recommending connections
2. Consider their target personas when evaluating networking opportunities
3. Understand their company stage and industry for relevant advice
4. Use their pain points to identify helpful connections

## Fetching More Context

You have tools to get more details from their Clarity Canvas:
- Use \`get_profile_index\` to see available sections
- Use \`get_profile_section\` to fetch specific sections
- Use \`search_profile\` to find information by topic

Fetch additional context BEFORE responding when you identify a gap.`;
}
```

### 5.3 Tool Handler

```typescript
// lib/clarity-canvas/tool-handler.ts

import { getClarityClient } from './client';

export async function handleClarityCanvasTool(
  userId: string,
  toolName: string,
  input: Record<string, unknown>
): Promise<string> {
  const client = await getClarityClient(userId);

  if (!client) {
    return JSON.stringify({
      error: 'Clarity Canvas not connected',
      suggestion: 'Ask the user to connect their Clarity Canvas profile in settings.',
    });
  }

  try {
    switch (toolName) {
      case 'get_profile_index': {
        const index = await client.getProfileIndex();
        return JSON.stringify(index);
      }

      case 'get_profile_section': {
        const section = await client.getProfileSection(input.section as string);
        return JSON.stringify(section);
      }

      case 'search_profile': {
        const results = await client.searchProfile(
          input.query as string,
          input.maxResults as number | undefined
        );
        return JSON.stringify(results);
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (error) {
    console.error('[clarity-canvas] Tool error:', error);
    return JSON.stringify({
      error: 'Failed to fetch from Clarity Canvas',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
```

### 5.4 Chat Integration Example

```typescript
// app/api/chat/route.ts (example integration)

import Anthropic from '@anthropic-ai/sdk';
import { auth } from '@/lib/auth';
import { getClarityClient } from '@/lib/clarity-canvas/client';
import { buildSystemPrompt } from '@/lib/clarity-canvas/prompts';
import { CLARITY_CANVAS_TOOLS } from '@/lib/clarity-canvas/tools';
import { handleClarityCanvasTool } from '@/lib/clarity-canvas/tool-handler';

const anthropic = new Anthropic();

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { messages } = await request.json();

  // Fetch user's Clarity Canvas context
  const clarityClient = await getClarityClient(session.user.id);
  let synthesis = null;

  if (clarityClient) {
    try {
      synthesis = await clarityClient.getBaseSynthesis();
    } catch (error) {
      console.error('[chat] Failed to fetch synthesis:', error);
    }
  }

  // Build system prompt with context
  const systemPrompt = buildSystemPrompt(synthesis);

  // Include Clarity Canvas tools if connected
  const tools = clarityClient ? CLARITY_CANVAS_TOOLS : [];

  // Initial API call
  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    system: systemPrompt,
    tools,
    messages,
  });

  // Handle tool use loop
  while (response.stop_reason === 'tool_use') {
    const toolUseBlock = response.content.find(
      (block) => block.type === 'tool_use'
    );

    if (!toolUseBlock || toolUseBlock.type !== 'tool_use') break;

    // Execute tool
    const toolResult = await handleClarityCanvasTool(
      session.user.id,
      toolUseBlock.name,
      toolUseBlock.input as Record<string, unknown>
    );

    // Continue conversation with tool result
    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages: [
        ...messages,
        { role: 'assistant', content: response.content },
        {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: toolUseBlock.id,
              content: toolResult,
            },
          ],
        },
      ],
    });
  }

  // Extract text response
  const textContent = response.content.find((block) => block.type === 'text');

  return Response.json({
    message: textContent?.type === 'text' ? textContent.text : '',
  });
}
```

## Step 6: Database Schema Changes

Add to Better Contacts Prisma schema:

```prisma
model User {
  // ... existing fields ...

  // Clarity Canvas OAuth
  clarityCanvasConnected     Boolean   @default(false)
  clarityCanvasAccessToken   String?   @db.Text
  clarityCanvasRefreshToken  String?   @db.Text
  clarityCanvasTokenExpiry   DateTime?
}
```

## Step 7: Testing

### Manual OAuth Flow Test

1. Click "Connect Clarity Canvas" button
2. Should redirect to `33strategies.ai/api/oauth/authorize?...`
3. Login with @33strategies.ai account (or client portal)
4. See consent screen with requested permissions
5. Click "Allow"
6. Should redirect back to Better Contacts with success message
7. Verify tokens stored in database

### API Test

```bash
# With valid access token
curl https://33strategies.ai/api/companion/synthesis/base \
  -H "Authorization: Bearer <access_token>"
```

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `invalid_client` | Client not registered | Check `OAuthClient` table |
| `invalid_redirect_uri` | URI mismatch | Verify exact match including trailing slashes |
| `access_denied` | User clicked Deny | Handle gracefully, show retry option |
| `invalid_grant` | Code expired/reused | Codes expire in 5 min, single-use |
| `insufficient_scope` | Wrong scopes requested | Check client's allowed scopes |

## Security Checklist

- [ ] Store client secret in environment variable, never in code
- [ ] Use PKCE for all authorization requests
- [ ] Validate state parameter to prevent CSRF
- [ ] Store tokens encrypted at rest
- [ ] Implement token rotation on refresh
- [ ] Handle revocation gracefully

## API Reference Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/companion/synthesis/base` | GET | Get ~800 token synthesis |
| `/api/companion/profile/index` | GET | List available sections |
| `/api/companion/profile/section/:id` | GET | Get section details |
| `/api/companion/profile/search` | POST | Search profile |
| `/api/companion/cache/validate` | POST | Check cache validity |

## Required Scopes

| Scope | Description |
|-------|-------------|
| `read:profile` | Access profile sections |
| `read:synthesis` | Access base synthesis |
| `search:profile` | Search across profile |
