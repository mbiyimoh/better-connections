# OG Images for Link Sharing - Developer Guide

## Overview

This guide documents the Open Graph (OG) image system for Better Connections, enabling rich link previews when sharing URLs on social media, messaging apps, and other platforms.

**Technologies:** Next.js ImageResponse API, React, Server Components

---

## Architecture

### Two Approaches

| Approach | When to Use | Runtime | Example |
|----------|-------------|---------|---------|
| Static file convention | Routes without database queries | Default (auto) | `app/m33t/[slug]/opengraph-image.tsx` |
| API route | Routes needing Prisma/database | Must be 'nodejs' | `app/api/og/m33t/route.tsx` |

### File Structure

```
app/
├── m33t/[slug]/
│   ├── page.tsx                    # Event landing page
│   └── opengraph-image.tsx         # Dynamic OG image (uses API)
├── api/og/
│   └── m33t/
│       └── route.tsx               # OG image API (database access)
```

---

## Technical Implementation

### Static File Convention (opengraph-image.tsx)

Next.js automatically serves these as OG images at the route path. Best for routes that don't need database access or can fetch via API.

```typescript
// app/m33t/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og';

// Required exports for Next.js metadata
export const alt = 'Event preview image';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const runtime = 'edge'; // Or 'nodejs' if using Prisma

export default async function Image({ params }: { params: { slug: string } }) {
  // Fetch data via API (not Prisma directly in edge runtime)
  const event = await fetch(`${baseUrl}/api/public/events/${params.slug}`).then(r => r.json());

  return new ImageResponse(
    <div style={{ /* JSX with inline styles */ }}>
      {/* Content */}
    </div>,
    { ...size }
  );
}
```

### API Route Pattern (for Prisma/Database)

**Critical:** Prisma is incompatible with Edge Runtime. Must explicitly set `runtime = 'nodejs'`.

```typescript
// app/api/og/m33t/route.tsx
import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';  // REQUIRED for Prisma

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');
  const event = await prisma.event.findUnique({ where: { slug } });

  return new ImageResponse(<div>...</div>, { width: 1200, height: 630 });
}
```

### Metadata Integration

```typescript
// In page.tsx
import type { Metadata } from 'next';

export async function generateMetadata({ params }): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bettercontacts.ai';

  // For static convention, Next.js auto-generates the URL
  // For API route:
  const ogImageUrl = `${baseUrl}/api/og/m33t?slug=${encodeURIComponent(slug)}`;

  return {
    title: 'Event Title',
    description: 'Event description',
    openGraph: {
      title: 'Event Title',
      description: 'Event description',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: 'Event preview' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Event Title',
      description: 'Event description',
      images: [ogImageUrl],
    },
  };
}
```

---

## Design Specifications

### Color Palette (33 Strategies Brand)

```typescript
const GOLD = '#d4a54a';           // Primary accent
const BG_PRIMARY = '#0a0a0f';     // Main background
const TEXT_PRIMARY = '#f5f5f5';   // Headlines, primary text
const TEXT_MUTED = '#71717a';     // Secondary text, labels
const TEXT_DIM = '#52525b';       // Tertiary text, subdued
```

### Typography

| Element | Font | Size | Style |
|---------|------|------|-------|
| Large headline | Instrument Serif (custom) | 130px | Normal weight, gold |
| Tagline | Georgia, serif | 32-40px | Normal weight, white |
| Date/location | system-ui | 28-32px | Normal, muted |
| Brand mark | Georgia, serif | 28px | Italic |

### Custom Font Loading (Google Fonts)

**Critical:** `@vercel/og` only supports woff and ttf formats - NOT woff2.

```typescript
// Load custom font from Google Fonts (woff format)
async function loadInstrumentSerif(): Promise<ArrayBuffer> {
  // Use old browser user agent to get woff format (not woff2)
  const cssResponse = await fetch(
    'https://fonts.googleapis.com/css2?family=Instrument+Serif&display=swap',
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)',
      },
    }
  );
  const css = await cssResponse.text();

  // Extract font URL - handles dynamic Google URLs
  const fontUrlMatch = css.match(/url\(([^)]+)\)\s*format\(['"]woff['"]\)/);
  if (!fontUrlMatch?.[1]) throw new Error('Could not find font URL');

  const fontResponse = await fetch(fontUrlMatch[1]);
  return fontResponse.arrayBuffer();
}

// In ImageResponse options
return new ImageResponse(<div>...</div>, {
  width: 1200,
  height: 630,
  fonts: [
    {
      name: 'Instrument Serif',
      data: await loadInstrumentSerif(),
      style: 'normal',
      weight: 400,
    },
  ],
});
```

### Dimensions

- **Canvas:** 1200 x 630px (standard OG image ratio)
- **Padding:** 60px vertical, 80px horizontal
- **Gold bottom border:** 4px height, gradient fade

---

## Layout Templates

### Template: M33T Event (Left-Aligned)

```
┌──────────────────────────────────────────────────────────────┐
│  ○ (gold glow)                                ○ (glow)       │
│                                                              │
│  No Edges.                     ← gold, 130px Instrument Serif│
│                                                              │
│  Building at the speed of thought.    ← white, 38px Georgia  │
│                                                              │
│  3.12.26  •  Austin, TX               ← muted, 28px system   │
│                                                              │
│                                               ○ (glow)       │
├──────────────────────────────────────────────────────────────┤
│▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░│ ← gold gradient L→R    │
└──────────────────────────────────────────────────────────────┘
```

### Template: Portal/Product (Left-Aligned)

```
┌──────────────────────────────────────────────────────────────┐
│                                               ○ (glow)       │
│  Better Contacts                                             │
│                                                              │
│                                                              │
│  EVENT                                ← gold monospace label │
│  Event Name                           ← 80px Georgia serif   │
│                                                              │
│  Tagline or description here          ← 32px, muted          │
│                                                              │
│  ● bettercontacts.ai                  ← gold dot + domain    │
│                                               ○ (glow)       │
├──────────────────────────────────────────────────────────────┤
│▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░│ ← gold gradient 4px   │
└──────────────────────────────────────────────────────────────┘
```

---

## Background Effects

### Gold Glow Pattern

```typescript
// Primary centered glow (800px)
{
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '800px',
  height: '800px',
  borderRadius: '50%',
  background: `radial-gradient(circle, ${GOLD}18 0%, transparent 50%)`,
}

// Secondary top-right glow (600px)
{
  position: 'absolute',
  top: '-150px',
  right: '-150px',
  width: '600px',
  height: '600px',
  borderRadius: '50%',
  background: `radial-gradient(circle, ${GOLD}12 0%, transparent 60%)`,
}
```

### Gold Bottom Border

```typescript
// Centered fade
background: `linear-gradient(90deg, transparent, ${GOLD}60, ${GOLD}, ${GOLD}60, transparent)`

// Left-to-right fade
background: `linear-gradient(90deg, ${GOLD}, ${GOLD}40, transparent)`
```

---

## Implementation Example

```typescript
// app/api/og/m33t/route.tsx
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

const GOLD = '#d4a54a';
const BG_PRIMARY = '#0a0a0f';

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');

  // Fetch event data or use hardcoded values for specific events
  const eventConfig = getEventConfig(slug);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: BG_PRIMARY,
          position: 'relative',
        }}
      >
        {/* Gold glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '800px',
            height: '800px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${GOLD}18 0%, transparent 50%)`,
          }}
        />

        {/* Main headline */}
        <div
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '120px',
            color: GOLD,
            marginBottom: '20px',
          }}
        >
          {eventConfig.headline}
        </div>

        {/* Tagline */}
        <div
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '36px',
            color: '#f5f5f5',
            marginBottom: '40px',
          }}
        >
          {eventConfig.tagline}
        </div>

        {/* Date and location */}
        <div
          style={{
            fontFamily: 'system-ui',
            fontSize: '28px',
            color: '#71717a',
          }}
        >
          {eventConfig.dateLocation}
        </div>

        {/* Gold bottom border */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: `linear-gradient(90deg, transparent, ${GOLD}60, ${GOLD}, ${GOLD}60, transparent)`,
          }}
        />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
```

---

## Common Gotchas

| Issue | Cause | Solution |
|-------|-------|----------|
| OG image blank/fails | Prisma in Edge Runtime | Add `export const runtime = 'nodejs'` |
| Image not updating | Caching | Add `?v=timestamp` to URL or redeploy |
| "Unsupported OpenType signature wOF2" | woff2 font format not supported | Use IE user agent to get woff format from Google Fonts |
| Custom fonts not loading | Wrong font format | Only woff/ttf supported, NOT woff2 |
| Image not showing | Missing metadata | Ensure both `openGraph.images` and `twitter.images` are set |
| Wrong image shown | Social platform cache | Use debug tools to clear cache |

---

## Testing & Debugging

### Local Preview

Visit the route directly in your browser:
- Static: `http://localhost:3333/m33t/no-edges-33-strategies-launch/opengraph-image`
- API: `http://localhost:3333/api/og/m33t?slug=no-edges-33-strategies-launch`

### Debug Tools

1. **Facebook:** https://developers.facebook.com/tools/debug/
2. **Twitter:** https://cards-dev.twitter.com/validator
3. **LinkedIn:** https://www.linkedin.com/post-inspector/

### Verify Metadata

```bash
curl -I https://bettercontacts.ai/m33t/no-edges-33-strategies-launch | grep -i og
```

---

## Personalized RSVP OG Images

### When to Use

When generating invite links with JWT tokens, use a personalized OG image showing the invitee's name.

**URL Pattern:**
```
/api/og/m33t/rsvp?token={jwt_token}
```

### Implementation

```typescript
// app/api/og/m33t/rsvp/route.tsx
import { verifyRSVPToken } from '@/lib/m33t/tokens';
import { loadInstrumentSerif } from '@/lib/og-fonts';

export const runtime = 'nodejs';  // Required for Prisma

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  // Resolve invitee name and event from token
  let firstName = '';
  let eventConfig: EventConfig = getEventConfig(null);

  if (token) {
    try {
      const payload = verifyRSVPToken(token);
      if (payload) {
        const [attendee, event] = await Promise.all([
          prisma.eventAttendee.findUnique({
            where: { id: payload.attendeeId },
            select: { firstName: true },
          }),
          prisma.event.findUnique({
            where: { id: payload.eventId },
            select: { name: true },
          }),
        ]);

        if (attendee) firstName = attendee.firstName;
        if (event) eventConfig = getEventConfig(event.name);
      }
    } catch {
      // Invalid/expired token - fall back to generic
    }
  }

  const displayName = firstName || 'You';

  return new ImageResponse(
    <div>{/* Layout with displayName */}</div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Instrument Serif',
          data: await loadInstrumentSerif(),
          style: 'normal',
          weight: 400,
        },
      ],
    }
  );
}
```

### Layout Pattern

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                           ○ (gold glow)                      │
│                                                              │
│                       John                  ← 168px, gold    │
│                   You're Invited            ← 59px, white    │
│                                                              │
│                                                              │
│  ┌────────────────────────────────────────────────┐         │
│  │ No Edges. Building at the speed of thought.    │ 51px    │
│  │ 3.12.26  •  Austin, TX                         │ 30px    │
│  └────────────────────────────────────────────────┘         │
│                                               ○ (glow)       │
├──────────────────────────────────────────────────────────────┤
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░│ ← gold gradient       │
└──────────────────────────────────────────────────────────────┘
```

### Key Details

| Element | Specs |
|---------|-------|
| Invitee name | 168px (≤10 chars), 132px (>10 chars) Instrument Serif, gold |
| "You're Invited" | 59px Georgia, white, 0.9 opacity |
| Vertical position | marginTop: -80px (raised high to avoid bottom crowding) |
| Headline + tagline | Single line, 51px, gold + white |
| Date/location | 30px system-ui, muted (2x normal size) |
| Fallback | "You're Invited" if token invalid/expired |

### Metadata Integration

```typescript
// app/m33t/[slug]/page.tsx
export async function generateMetadata({ params, searchParams }): Promise<Metadata> {
  const { slug } = await params;
  const { token } = await searchParams;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bettercontacts.ai';

  // Use personalized OG image when invitee token is present
  const ogImageUrl = token
    ? `${baseUrl}/api/og/m33t/rsvp?token=${encodeURIComponent(token)}`
    : `${baseUrl}/api/og/m33t?slug=${encodeURIComponent(slug)}`;

  return {
    openGraph: { images: [{ url: ogImageUrl, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', images: [ogImageUrl] },
  };
}
```

### Gotchas

- **Font scaling:** Names >10 characters use 132px to prevent overflow
- **Token verification:** Always use try/catch - invalid tokens should show generic fallback
- **Event config:** Extract event-specific branding from event name (e.g., "NO EDGES")
- **Performance:** Prisma queries run in parallel with `Promise.all()`

---

## File Inventory

| File | Purpose |
|------|---------|
| `app/api/og/m33t/route.tsx` | M33T event OG image API |
| `app/api/og/m33t/rsvp/route.tsx` | Personalized RSVP OG image API |
| `app/m33t/[slug]/page.tsx` | Event page with metadata generation |
| `lib/design-system.ts` | Color constants |
| `lib/og-fonts.ts` | Custom font loading |

**Location:** `app/api/og/`, `app/m33t/[slug]/`
