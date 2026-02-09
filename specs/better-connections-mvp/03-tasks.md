# Task Breakdown: Better Connections MVP

**Generated:** 2025-12-12
**Source:** specs/better-connections-mvp/02-specification.md
**Last Decompose:** 2025-12-12
**Mode:** Full

---

## Overview

Better Connections is a personal CRM / contact enrichment tool that transforms static contact data into dynamic, context-rich profiles. The core differentiator is the "Why Now" field — capturing not just who someone is, but why they matter to the user's current goals.

**Tech Stack:**
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Prisma + Supabase PostgreSQL
- Supabase Auth
- OpenAI GPT-4o-mini
- Framer Motion
- TanStack Query + Zustand

**Total Tasks:** 42
**Phases:** 5
**Estimated Complexity:** Large

---

## Task Summary by Phase

| Phase | Name | Tasks | Priority |
|-------|------|-------|----------|
| 1 | Core Infrastructure | 10 | Critical |
| 2 | Contact Management | 10 | High |
| 3 | Enrichment System | 8 | High |
| 4 | AI Features | 8 | Medium |
| 5 | Polish & Deployment | 6 | Medium |

---

## Phase 1: Core Infrastructure (Foundation)

### Task 1.1: Initialize Next.js Project with TypeScript

**Description:** Create the foundational Next.js 14 project with TypeScript configuration and App Router setup.

**Size:** Small
**Priority:** Critical
**Dependencies:** None
**Can run parallel with:** None (must complete first)

**Technical Requirements:**
- Next.js 14.x+ with App Router
- TypeScript 5.x+ with strict mode
- Node.js 18+ runtime

**Implementation Steps:**

```bash
# Create Next.js project
npx create-next-app@latest better-connections --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

cd better-connections

# Verify structure
ls -la src/app/
```

**Project Structure to Create:**
```
better-connections/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   ├── lib/
│   ├── hooks/
│   └── stores/
├── prisma/
├── public/
├── tsconfig.json
├── tailwind.config.ts
└── package.json
```

**TypeScript Configuration (tsconfig.json additions):**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**Acceptance Criteria:**
- [ ] Next.js 14 project created with App Router
- [ ] TypeScript strict mode enabled
- [ ] Project runs with `npm run dev`
- [ ] Basic folder structure established
- [ ] ESLint configured and passing

---

### Task 1.2: Configure Tailwind CSS with Design System

**Description:** Set up Tailwind CSS with the complete Better Connections design system including dark theme, gold accent, and glassmorphism utilities.

**Size:** Medium
**Priority:** Critical
**Dependencies:** Task 1.1
**Can run parallel with:** Task 1.3

**Technical Requirements:**
- Tailwind CSS 3.x+
- Custom color palette from design spec
- CSS custom properties for theming
- Glassmorphism utility classes

**Implementation - tailwind.config.ts:**
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Background
        bg: {
          primary: "#0D0D0F",
          secondary: "#1A1A1F",
          tertiary: "#252529",
        },
        // Text
        text: {
          primary: "#FFFFFF",
          secondary: "#A0A0A8",
          tertiary: "#606068",
        },
        // Gold Accent
        gold: {
          primary: "#C9A227",
          light: "#E5C766",
          subtle: "rgba(201, 162, 39, 0.15)",
        },
        // Category Colors
        category: {
          relationship: "#3B82F6",
          opportunity: "#22C55E",
          expertise: "#A855F7",
          interest: "#F59E0B",
        },
        // Semantic
        success: "#4ADE80",
        warning: "#FBBF24",
        error: "#EF4444",
        // Border
        border: "rgba(255, 255, 255, 0.08)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      fontSize: {
        display: "32px",
        heading: "24px",
        title: "18px",
        body: "14px",
        small: "13px",
        caption: "11px",
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        "2xl": "48px",
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      backdropBlur: {
        glass: "12px",
        "glass-medium": "16px",
        "glass-strong": "20px",
      },
    },
  },
  plugins: [],
};

export default config;
```

**Implementation - globals.css:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-primary: #0D0D0F;
  --bg-secondary: #1A1A1F;
  --bg-tertiary: #252529;
  --bg-glass: rgba(26, 26, 31, 0.85);

  --text-primary: #FFFFFF;
  --text-secondary: #A0A0A8;
  --text-tertiary: #606068;

  --gold-primary: #C9A227;
  --gold-light: #E5C766;
  --gold-subtle: rgba(201, 162, 39, 0.15);

  --border: rgba(255, 255, 255, 0.08);
}

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

@layer utilities {
  .glass-subtle {
    background: rgba(26, 26, 31, 0.8);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .glass-medium {
    background: rgba(37, 37, 41, 0.9);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .glass-strong {
    background: rgba(45, 45, 50, 0.95);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
}
```

**Acceptance Criteria:**
- [ ] All design system colors available as Tailwind classes
- [ ] Glassmorphism utilities working (glass-subtle, glass-medium, glass-strong)
- [ ] Dark theme applied by default
- [ ] Typography scale matches spec
- [ ] Spacing scale matches spec (4px base)

---

### Task 1.3: Install and Configure shadcn/ui

**Description:** Set up shadcn/ui component library with dark theme defaults and install core components.

**Size:** Small
**Priority:** Critical
**Dependencies:** Task 1.1, Task 1.2
**Can run parallel with:** Task 1.4

**Technical Requirements:**
- shadcn/ui latest
- Dark mode configuration
- Core components for MVP

**Implementation Steps:**

```bash
# Initialize shadcn/ui
npx shadcn@latest init

# Select options:
# - Style: Default
# - Base color: Neutral
# - CSS variables: Yes
# - Tailwind config: tailwind.config.ts
# - Components: @/components/ui
# - Utils: @/lib/utils

# Install core components
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add table
npx shadcn@latest add badge
npx shadcn@latest add avatar
npx shadcn@latest add tabs
npx shadcn@latest add toast
npx shadcn@latest add form
npx shadcn@latest add select
npx shadcn@latest add textarea
npx shadcn@latest add separator
npx shadcn@latest add skeleton
npx shadcn@latest add sheet
npx shadcn@latest add scroll-area
```

**Update components.json for dark theme:**
```json
{
  "style": "default",
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

**Acceptance Criteria:**
- [ ] shadcn/ui initialized with dark theme
- [ ] All core components installed (button, input, card, dialog, table, etc.)
- [ ] Components render correctly with dark theme
- [ ] cn() utility available at @/lib/utils

---

### Task 1.4: Set Up Prisma with Supabase PostgreSQL

**Description:** Configure Prisma ORM with Supabase PostgreSQL and implement the complete database schema.

**Size:** Large
**Priority:** Critical
**Dependencies:** Task 1.1
**Can run parallel with:** Task 1.3

**Technical Requirements:**
- Prisma 5.x+
- Supabase PostgreSQL connection
- Complete schema from spec
- Database indexes for performance

**Implementation Steps:**

```bash
# Install Prisma
npm install prisma @prisma/client
npm install -D prisma

# Initialize Prisma
npx prisma init
```

**Implementation - prisma/schema.prisma:**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id                    String    @id @default(uuid())
  email                 String    @unique
  name                  String

  // Preferences
  emailNotifications    Boolean   @default(true)
  weeklyDigest          Boolean   @default(true)
  enrichmentReminders   Boolean   @default(false)

  // Metadata
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  lastLoginAt           DateTime?

  // Relations
  contacts              Contact[]
}

model Contact {
  id                    String    @id @default(uuid())
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Basic Info
  name                  String
  email                 String?
  title                 String?
  company               String?
  location              String?
  linkedinUrl           String?
  phone                 String?

  // Relationship Context
  howWeMet              String?   @db.Text
  relationshipStrength  Int       @default(1) // 1=Weak, 2=Casual, 3=Good, 4=Strong
  lastContactDate       DateTime?
  relationshipHistory   String?   @db.Text

  // Why Now (Key Differentiator)
  whyNow                String?   @db.Text

  // Profile
  expertise             String?   @db.Text
  interests             String?   @db.Text
  notes                 String?   @db.Text

  // Metadata
  enrichmentScore       Int       @default(0) // 0-100
  source                ContactSource @default(MANUAL)
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  lastEnrichedAt        DateTime?

  // Relations
  tags                  Tag[]

  @@index([userId])
  @@index([name])
  @@index([email])
  @@index([enrichmentScore])
}

model Tag {
  id        String      @id @default(uuid())
  contactId String
  contact   Contact     @relation(fields: [contactId], references: [id], onDelete: Cascade)
  text      String
  category  TagCategory

  @@index([contactId])
}

enum ContactSource {
  MANUAL
  CSV
  GOOGLE
  LINKEDIN
  ICLOUD
  OUTLOOK
}

enum TagCategory {
  RELATIONSHIP
  OPPORTUNITY
  EXPERTISE
  INTEREST
}
```

**Implementation - lib/db.ts:**
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

**Environment Variables (.env.local):**
```bash
# Supabase Database
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

**Run Migrations:**
```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (development)
npx prisma db push

# Or create migration (production)
npx prisma migrate dev --name init
```

**Acceptance Criteria:**
- [ ] Prisma schema matches specification exactly
- [ ] Database connection to Supabase working
- [ ] All indexes created for performance
- [ ] Prisma client singleton implemented
- [ ] `npx prisma studio` shows tables correctly

---

### Task 1.5: Implement Supabase Auth (Email/Password)

**Description:** Set up Supabase authentication with email/password flow, including signup, login, logout, and password reset.

**Size:** Large
**Priority:** Critical
**Dependencies:** Task 1.1, Task 1.4
**Can run parallel with:** Task 1.6

**Technical Requirements:**
- Supabase Auth JS client
- Server-side and client-side auth helpers
- Protected route middleware
- User sync with Prisma User table

**Install Dependencies:**
```bash
npm install @supabase/supabase-js @supabase/ssr
```

**Implementation - lib/supabase/client.ts:**
```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Implementation - lib/supabase/server.ts:**
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Handle cookies in Server Components
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Handle cookies in Server Components
          }
        },
      },
    }
  );
}
```

**Implementation - lib/supabase/middleware.ts:**
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Redirect to login if not authenticated and accessing protected routes
  if (!user && request.nextUrl.pathname.startsWith('/contacts')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (!user && request.nextUrl.pathname.startsWith('/enrich')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (!user && request.nextUrl.pathname.startsWith('/explore')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (!user && request.nextUrl.pathname.startsWith('/settings')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect to contacts if already authenticated and on auth pages
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/contacts', request.url));
  }

  return response;
}
```

**Implementation - middleware.ts (root):**
```typescript
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

**Implementation - lib/auth.ts:**
```typescript
import { createClient } from '@/lib/supabase/client';
import { prisma } from '@/lib/db';

export async function signUp(email: string, password: string, name: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  });

  if (error) throw error;

  // Create user in Prisma database
  if (data.user) {
    await prisma.user.create({
      data: {
        id: data.user.id,
        email: data.user.email!,
        name,
      },
    });
  }

  return data;
}

export async function signIn(email: string, password: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  // Update last login
  if (data.user) {
    await prisma.user.update({
      where: { id: data.user.id },
      data: { lastLoginAt: new Date() },
    });
  }

  return data;
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email: string) {
  const supabase = createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
  });

  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const supabase = createClient();

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
}
```

**Environment Variables to Add:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://hjmppbpunlhdbchbvgag.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Acceptance Criteria:**
- [ ] Sign up creates Supabase auth user AND Prisma user
- [ ] Sign in authenticates and updates lastLoginAt
- [ ] Sign out clears session
- [ ] Password reset sends email
- [ ] Protected routes redirect to login
- [ ] Authenticated users redirected from auth pages to /contacts

---

### Task 1.6: Create App Shell with Sidebar Navigation

**Description:** Build the main application layout with collapsible sidebar, navigation items, and user dropdown.

**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.2, Task 1.3, Task 1.5
**Can run parallel with:** Task 1.7

**Technical Requirements:**
- Collapsible sidebar
- Navigation with badges (contacts count, enrichment count)
- User avatar and dropdown
- Responsive design

**Implementation - components/layout/AppShell.tsx:**
```typescript
'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-bg-primary">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

**Implementation - components/layout/Sidebar.tsx:**
```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  Sparkles,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { href: '/contacts', icon: Users, label: 'Contacts', badge: null },
  { href: '/enrich', icon: Sparkles, label: 'Enrich', badge: '12' },
  { href: '/explore', icon: MessageSquare, label: 'Explore', badge: null },
  { href: '/settings', icon: Settings, label: 'Settings', badge: null },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-bg-secondary border-r border-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        {!collapsed && (
          <span className="text-xl font-bold text-gold-primary">BC</span>
        )}
        <button
          onClick={onToggle}
          className="p-2 rounded-md hover:bg-bg-tertiary text-text-secondary"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors",
                isActive
                  ? "bg-gold-subtle text-gold-primary"
                  : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
              )}
            >
              <item.icon size={20} />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="bg-gold-subtle text-gold-primary">
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section will be added in auth integration */}
    </div>
  );
}
```

**Implementation - components/layout/Header.tsx:**
```typescript
'use client';

import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const pageTitles: Record<string, string> = {
  '/contacts': 'Contacts',
  '/enrich': 'Enrich',
  '/explore': 'Explore',
  '/settings': 'Settings',
};

export function Header() {
  const pathname = usePathname();
  const title = Object.entries(pageTitles).find(([path]) =>
    pathname.startsWith(path)
  )?.[1] || 'Better Connections';

  return (
    <header className="h-16 border-b border-border bg-bg-secondary flex items-center justify-between px-6">
      <h1 className="text-xl font-semibold text-text-primary">{title}</h1>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="text-text-secondary">
          <Bell size={20} />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10 border-2 border-gold-primary">
                <AvatarFallback className="bg-bg-tertiary text-gold-primary">
                  MG
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-bg-secondary border-border">
            <DropdownMenuLabel className="text-text-primary">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem className="text-text-secondary hover:text-text-primary">
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="text-text-secondary hover:text-text-primary">
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem className="text-error">
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```

**Implementation - app/(dashboard)/layout.tsx:**
```typescript
import { AppShell } from '@/components/layout/AppShell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
```

**Acceptance Criteria:**
- [ ] Sidebar collapses and expands smoothly
- [ ] Navigation highlights active route
- [ ] Badges display on nav items
- [ ] User dropdown menu works
- [ ] Responsive on tablet/desktop

---

### Task 1.7: Build Basic Contact CRUD API Routes

**Description:** Implement the REST API endpoints for basic contact CRUD operations.

**Size:** Large
**Priority:** Critical
**Dependencies:** Task 1.4, Task 1.5
**Can run parallel with:** Task 1.6

**Technical Requirements:**
- GET /api/contacts - List with search, filter, sort, pagination
- POST /api/contacts - Create contact
- GET /api/contacts/[id] - Get single contact
- PUT /api/contacts/[id] - Update contact
- DELETE /api/contacts/[id] - Delete contact
- Authentication required for all endpoints
- Enrichment score calculated on save

**Implementation - lib/enrichment.ts:**
```typescript
import type { Contact, Tag } from '@prisma/client';

type ContactWithTags = Contact & { tags: Tag[] };

export function calculateEnrichmentScore(contact: Partial<ContactWithTags>): number {
  let score = 0;

  // Basic Info (35 points max from these)
  if (contact.name) score += 10;
  if (contact.email) score += 10;
  if (contact.title) score += 10;
  if (contact.company) score += 10;
  if (contact.location) score += 5;
  if (contact.linkedinUrl) score += 5;

  // Relationship Context (35 points)
  if (contact.howWeMet) score += 15;
  if (contact.whyNow) score += 20; // MOST VALUABLE FIELD

  // Organization (15 points)
  if (contact.tags && contact.tags.length > 0) score += 5;
  if (contact.notes) score += 10;

  return Math.min(score, 100);
}

export function getDaysSince(date: Date): number {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getEnrichmentPriority(contact: ContactWithTags): number {
  const score = contact.enrichmentScore;
  const daysSinceCreation = getDaysSince(contact.createdAt);
  const daysSinceEnrichment = contact.lastEnrichedAt
    ? getDaysSince(contact.lastEnrichedAt)
    : Infinity;

  let priority = 100 - score;
  if (daysSinceCreation < 7) priority += 20;
  if (daysSinceEnrichment === Infinity) priority += 30;
  if (contact.source === 'CSV') priority += 10;

  return priority;
}
```

**Implementation - lib/validation.ts:**
```typescript
import { z } from 'zod';

export const createContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
  title: z.string().optional(),
  company: z.string().optional(),
  location: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  phone: z.string().optional(),
  howWeMet: z.string().optional(),
  relationshipStrength: z.number().min(1).max(4).optional(),
  whyNow: z.string().optional(),
  expertise: z.string().optional(),
  interests: z.string().optional(),
  notes: z.string().optional(),
});

export const updateContactSchema = createContactSchema.partial();

export const contactQuerySchema = z.object({
  search: z.string().optional(),
  sortBy: z.enum(['name', 'email', 'company', 'enrichmentScore', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(25),
  minScore: z.coerce.number().min(0).max(100).optional(),
  maxScore: z.coerce.number().min(0).max(100).optional(),
  source: z.enum(['MANUAL', 'CSV', 'GOOGLE', 'LINKEDIN', 'ICLOUD', 'OUTLOOK']).optional(),
});
```

**Implementation - app/api/contacts/route.ts:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { createContactSchema, contactQuerySchema } from '@/lib/validation';
import { calculateEnrichmentScore } from '@/lib/enrichment';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = contactQuerySchema.parse(Object.fromEntries(searchParams));

    const { search, sortBy = 'createdAt', sortOrder = 'desc', page, limit, minScore, maxScore, source } = params;

    const where: any = { userId: user.id };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (minScore !== undefined) {
      where.enrichmentScore = { ...where.enrichmentScore, gte: minScore };
    }

    if (maxScore !== undefined) {
      where.enrichmentScore = { ...where.enrichmentScore, lte: maxScore };
    }

    if (source) {
      where.source = source;
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: { tags: true },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contact.count({ where }),
    ]);

    return NextResponse.json({
      contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = createContactSchema.parse(body);

    const enrichmentScore = calculateEnrichmentScore(data as any);

    const contact = await prisma.contact.create({
      data: {
        ...data,
        userId: user.id,
        enrichmentScore,
        email: data.email || null,
        linkedinUrl: data.linkedinUrl || null,
      },
      include: { tags: true },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
  }
}
```

**Implementation - app/api/contacts/[id]/route.ts:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { updateContactSchema } from '@/lib/validation';
import { calculateEnrichmentScore } from '@/lib/enrichment';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contact = await prisma.contact.findFirst({
      where: { id: params.id, userId: user.id },
      include: { tags: true },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json(contact);
  } catch (error) {
    console.error('Error fetching contact:', error);
    return NextResponse.json({ error: 'Failed to fetch contact' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const existing = await prisma.contact.findFirst({
      where: { id: params.id, userId: user.id },
      include: { tags: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = updateContactSchema.parse(body);

    // Merge with existing data for score calculation
    const merged = { ...existing, ...data };
    const enrichmentScore = calculateEnrichmentScore(merged);

    const contact = await prisma.contact.update({
      where: { id: params.id },
      data: {
        ...data,
        enrichmentScore,
        updatedAt: new Date(),
      },
      include: { tags: true },
    });

    return NextResponse.json(contact);
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const existing = await prisma.contact.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    await prisma.contact.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
  }
}
```

**Acceptance Criteria:**
- [ ] GET /api/contacts returns paginated contacts for authenticated user
- [ ] Search works across name, email, company, notes
- [ ] Sort by any column works (name, email, company, score, dates)
- [ ] Pagination returns correct metadata
- [ ] POST /api/contacts creates contact with calculated enrichment score
- [ ] PUT /api/contacts/[id] updates and recalculates score
- [ ] DELETE /api/contacts/[id] removes contact
- [ ] All endpoints require authentication
- [ ] Users can only access their own contacts

---

### Task 1.8: Create Basic Contacts Table Page

**Description:** Build the contacts list page with a data table showing all contacts with basic functionality.

**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.6, Task 1.7
**Can run parallel with:** Task 1.9

**Technical Requirements:**
- Data table with columns: Name, Email, Company, Score, Source, Actions
- Empty state when no contacts
- Loading skeleton
- Link to contact detail

**Install Dependencies:**
```bash
npm install @tanstack/react-query @tanstack/react-table
```

**Implementation - lib/providers.tsx:**
```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

**Implementation - hooks/use-contacts.ts:**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ContactsParams {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export function useContacts(params: ContactsParams = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) searchParams.set(key, String(value));
  });

  return useQuery({
    queryKey: ['contacts', params],
    queryFn: async () => {
      const res = await fetch(`/api/contacts?${searchParams}`);
      if (!res.ok) throw new Error('Failed to fetch contacts');
      return res.json();
    },
  });
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ['contact', id],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${id}`);
      if (!res.ok) throw new Error('Failed to fetch contact');
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create contact');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update contact');
      return res.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', id] });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete contact');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}
```

**Implementation - components/contacts/ContactsTable.tsx:**
```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreHorizontal, ArrowUpDown, Sparkles, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useContacts, useDeleteContact } from '@/hooks/use-contacts';

interface ContactsTableProps {
  search?: string;
}

export function ContactsTable({ search }: ContactsTableProps) {
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useContacts({
    search,
    sortBy,
    sortOrder,
    page,
    limit: 25,
  });

  const deleteContact = useDeleteContact();

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  if (isLoading) {
    return <ContactsTableSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-12 text-error">
        Failed to load contacts. Please try again.
      </div>
    );
  }

  if (!data?.contacts?.length) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary mb-4">No contacts yet</p>
        <Link href="/contacts/new">
          <Button className="bg-gold-primary hover:bg-gold-light text-bg-primary">
            Add Your First Contact
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-text-secondary">
              <Button variant="ghost" onClick={() => handleSort('name')} className="text-text-secondary">
                Name <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead className="text-text-secondary">Email</TableHead>
            <TableHead className="text-text-secondary">
              <Button variant="ghost" onClick={() => handleSort('company')} className="text-text-secondary">
                Company <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead className="text-text-secondary">
              <Button variant="ghost" onClick={() => handleSort('enrichmentScore')} className="text-text-secondary">
                Score <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead className="text-text-secondary">Source</TableHead>
            <TableHead className="text-text-secondary w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.contacts.map((contact: any) => (
            <TableRow key={contact.id} className="border-border hover:bg-bg-tertiary">
              <TableCell>
                <Link
                  href={`/contacts/${contact.id}`}
                  className="font-medium text-text-primary hover:text-gold-primary"
                >
                  {contact.name}
                </Link>
              </TableCell>
              <TableCell className="text-text-secondary">{contact.email || '-'}</TableCell>
              <TableCell className="text-text-secondary">{contact.company || '-'}</TableCell>
              <TableCell>
                <EnrichmentScoreBadge score={contact.enrichmentScore} />
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="border-border text-text-tertiary">
                  {contact.source}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-text-secondary">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-bg-secondary border-border">
                    <DropdownMenuItem asChild>
                      <Link href={`/enrich/${contact.id}`} className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" /> Enrich
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-error"
                      onClick={() => deleteContact.mutate(contact.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      {data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-4 border-t border-border">
          <p className="text-sm text-text-secondary">
            Page {data.pagination.page} of {data.pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="border-border"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
              disabled={page === data.pagination.totalPages}
              className="border-border"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function EnrichmentScoreBadge({ score }: { score: number }) {
  let variant: 'default' | 'secondary' | 'outline' = 'outline';
  let className = 'border-border text-text-tertiary';

  if (score >= 80) {
    className = 'bg-success/20 text-success border-success/30';
  } else if (score >= 50) {
    className = 'bg-gold-subtle text-gold-primary border-gold-primary/30';
  } else if (score >= 20) {
    className = 'bg-warning/20 text-warning border-warning/30';
  }

  return (
    <Badge variant="outline" className={className}>
      {score}%
    </Badge>
  );
}

function ContactsTableSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 px-4">
          <Skeleton className="h-6 w-32 bg-bg-tertiary" />
          <Skeleton className="h-6 w-48 bg-bg-tertiary" />
          <Skeleton className="h-6 w-32 bg-bg-tertiary" />
          <Skeleton className="h-6 w-16 bg-bg-tertiary" />
          <Skeleton className="h-6 w-20 bg-bg-tertiary" />
        </div>
      ))}
    </div>
  );
}
```

**Implementation - app/(dashboard)/contacts/page.tsx:**
```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ContactsTable } from '@/components/contacts/ContactsTable';

export default function ContactsPage() {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-bg-secondary border-border text-text-primary placeholder:text-text-tertiary"
          />
        </div>
        <div className="flex gap-2">
          <Link href="/contacts/import">
            <Button variant="outline" className="border-border text-text-secondary">
              <Upload className="h-4 w-4 mr-2" /> Import
            </Button>
          </Link>
          <Link href="/contacts/new">
            <Button className="bg-gold-primary hover:bg-gold-light text-bg-primary">
              <Plus className="h-4 w-4 mr-2" /> Add Contact
            </Button>
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-bg-secondary">
        <ContactsTable search={search} />
      </div>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Contacts table displays all columns correctly
- [ ] Sorting works on sortable columns
- [ ] Pagination shows correct page info
- [ ] Empty state shows when no contacts
- [ ] Loading skeleton displays while fetching
- [ ] Search filters contacts by name/email/company
- [ ] Row actions dropdown works (Enrich, Delete)

---

### Task 1.9: Build Auth Pages (Login, Signup, Forgot Password)

**Description:** Create the authentication UI pages for login, signup, and password reset.

**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.5
**Can run parallel with:** Task 1.8

**Implementation - app/(auth)/layout.tsx:**
```typescript
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gold-primary mb-2">Better Connections</h1>
          <p className="text-text-secondary">Your contacts are flat. Give them some depth.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
```

**Implementation - app/(auth)/login/page.tsx:**
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push('/contacts');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-bg-secondary border-border">
      <CardHeader>
        <CardTitle className="text-text-primary text-center">Sign In</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-error/10 text-error text-sm">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-text-secondary">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-bg-tertiary border-border text-text-primary"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-text-secondary">Password</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-gold-primary hover:text-gold-light"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-bg-tertiary border-border text-text-primary"
              placeholder="••••••••"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full bg-gold-primary hover:bg-gold-light text-bg-primary"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
          <p className="text-sm text-text-secondary text-center">
            Don't have an account?{' '}
            <Link href="/signup" className="text-gold-primary hover:text-gold-light">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
```

**Implementation - app/(auth)/signup/page.tsx:**
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { prisma } from '@/lib/db';
import { Loader2, Check, X } from 'lucide-react';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const passwordRequirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(password) },
    { label: 'Contains uppercase', met: /[A-Z]/.test(password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      if (error) throw error;

      // User will need to verify email before logging in
      // For now, redirect to login with success message
      router.push('/login?message=Check your email to verify your account');
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-bg-secondary border-border">
      <CardHeader>
        <CardTitle className="text-text-primary text-center">Create Account</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-error/10 text-error text-sm">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-text-secondary">Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-bg-tertiary border-border text-text-primary"
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-text-secondary">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-bg-tertiary border-border text-text-primary"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-text-secondary">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-bg-tertiary border-border text-text-primary"
              placeholder="••••••••"
            />
            <div className="space-y-1 mt-2">
              {passwordRequirements.map((req, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {req.met ? (
                    <Check className="h-3 w-3 text-success" />
                  ) : (
                    <X className="h-3 w-3 text-text-tertiary" />
                  )}
                  <span className={req.met ? 'text-success' : 'text-text-tertiary'}>
                    {req.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full bg-gold-primary hover:bg-gold-light text-bg-primary"
            disabled={loading || !passwordRequirements.every(r => r.met)}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account
          </Button>
          <p className="text-sm text-text-secondary text-center">
            Already have an account?{' '}
            <Link href="/login" className="text-gold-primary hover:text-gold-light">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
```

**Implementation - app/(auth)/forgot-password/page.tsx:**
```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="bg-bg-secondary border-border">
        <CardContent className="pt-6 text-center">
          <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-text-primary mb-2">Check your email</h2>
          <p className="text-text-secondary mb-4">
            We sent a password reset link to {email}
          </p>
          <Link href="/login">
            <Button variant="outline" className="border-border text-text-secondary">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to login
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-bg-secondary border-border">
      <CardHeader>
        <CardTitle className="text-text-primary text-center">Reset Password</CardTitle>
        <CardDescription className="text-text-secondary text-center">
          Enter your email and we'll send you a reset link
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-error/10 text-error text-sm">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-text-secondary">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-bg-tertiary border-border text-text-primary"
              placeholder="you@example.com"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full bg-gold-primary hover:bg-gold-light text-bg-primary"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Reset Link
          </Button>
          <Link
            href="/login"
            className="text-sm text-text-secondary hover:text-text-primary flex items-center justify-center"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to login
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
```

**Acceptance Criteria:**
- [ ] Login page authenticates users successfully
- [ ] Signup creates new user account
- [ ] Password requirements shown and validated
- [ ] Forgot password sends reset email
- [ ] Success/error states displayed correctly
- [ ] Redirect to /contacts after successful auth
- [ ] Links between auth pages work

---

### Task 1.10: Set Up Environment and Run Initial Test

**Description:** Configure all environment variables, run database migrations, and verify the complete Phase 1 stack works end-to-end.

**Size:** Small
**Priority:** Critical
**Dependencies:** All Phase 1 tasks
**Can run parallel with:** None

**Technical Requirements:**
- All environment variables configured
- Database schema deployed
- Auth flow working
- Basic CRUD operations functional

**Environment Setup Checklist:**

```bash
# .env.local
# Database
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=https://hjmppbpunlhdbchbvgag.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# OpenAI (for Phase 4)
OPENAI_API_KEY=sk-...
```

**Verification Steps:**

```bash
# 1. Generate Prisma client
npx prisma generate

# 2. Push schema to database
npx prisma db push

# 3. Verify tables created
npx prisma studio
# Should show User, Contact, Tag tables

# 4. Start dev server
npm run dev

# 5. Test auth flow
# - Navigate to http://localhost:3000/signup
# - Create account
# - Verify redirect to /contacts
# - Check Prisma Studio for new User record

# 6. Test contact CRUD
# - Create contact via UI
# - Verify in contacts table
# - Edit contact
# - Delete contact
```

**Acceptance Criteria:**
- [ ] All environment variables configured
- [ ] Prisma client generated without errors
- [ ] Database schema deployed to Supabase
- [ ] Sign up creates user in both Supabase Auth and Prisma
- [ ] Login authenticates and redirects correctly
- [ ] Contacts CRUD works end-to-end
- [ ] No console errors in browser
- [ ] No server errors in terminal

---

## Phase 2: Contact Management

### Task 2.1: Complete Contacts Table with Search/Filter/Sort

**Description:** Enhance the contacts table with full search, multiple filters, and comprehensive sorting capabilities.

**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.8
**Can run parallel with:** Task 2.2

**Technical Requirements:**
- Multi-column search (name, email, company, notes, whyNow)
- Filter by enrichment score range
- Filter by source
- Filter by tag category
- Filter by relationship strength
- Debounced search input (300ms)
- URL-based filter state (shareable links)

**Implementation - components/contacts/ContactFilters.tsx:**
```typescript
'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useState } from 'react';

const sources = ['MANUAL', 'CSV', 'GOOGLE', 'LINKEDIN', 'ICLOUD', 'OUTLOOK'];
const relationships = [
  { value: '1', label: 'Weak' },
  { value: '2', label: 'Casual' },
  { value: '3', label: 'Good' },
  { value: '4', label: 'Strong' },
];

export function ContactFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100]);

  const updateParams = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1'); // Reset to first page on filter change
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearch = useDebouncedCallback((term: string) => {
    updateParams('search', term || null);
  }, 300);

  const activeFilters = [
    searchParams.get('source'),
    searchParams.get('relationship'),
    searchParams.get('minScore'),
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    router.push(pathname);
  };

  return (
    <div className="flex items-center gap-4">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
        <Input
          placeholder="Search contacts..."
          defaultValue={searchParams.get('search') || ''}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 bg-bg-secondary border-border text-text-primary placeholder:text-text-tertiary"
        />
      </div>

      {/* Filter Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="border-border text-text-secondary relative">
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
            {activeFilters > 0 && (
              <Badge className="ml-2 bg-gold-primary text-bg-primary h-5 w-5 p-0 flex items-center justify-center">
                {activeFilters}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 bg-bg-secondary border-border">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-text-primary">Filters</h4>
              {activeFilters > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-text-secondary">
                  <X className="h-4 w-4 mr-1" /> Clear all
                </Button>
              )}
            </div>

            {/* Source Filter */}
            <div className="space-y-2">
              <label className="text-sm text-text-secondary">Source</label>
              <Select
                value={searchParams.get('source') || ''}
                onValueChange={(value) => updateParams('source', value || null)}
              >
                <SelectTrigger className="bg-bg-tertiary border-border">
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent className="bg-bg-secondary border-border">
                  <SelectItem value="">All sources</SelectItem>
                  {sources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Relationship Strength Filter */}
            <div className="space-y-2">
              <label className="text-sm text-text-secondary">Relationship</label>
              <Select
                value={searchParams.get('relationship') || ''}
                onValueChange={(value) => updateParams('relationship', value || null)}
              >
                <SelectTrigger className="bg-bg-tertiary border-border">
                  <SelectValue placeholder="Any strength" />
                </SelectTrigger>
                <SelectContent className="bg-bg-secondary border-border">
                  <SelectItem value="">Any strength</SelectItem>
                  {relationships.map((rel) => (
                    <SelectItem key={rel.value} value={rel.value}>
                      {rel.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Score Range Filter */}
            <div className="space-y-2">
              <label className="text-sm text-text-secondary">
                Enrichment Score: {scoreRange[0]}% - {scoreRange[1]}%
              </label>
              <Slider
                value={scoreRange}
                onValueChange={(value) => setScoreRange(value as [number, number])}
                onValueCommit={(value) => {
                  updateParams('minScore', value[0] > 0 ? String(value[0]) : null);
                  updateParams('maxScore', value[1] < 100 ? String(value[1]) : null);
                }}
                min={0}
                max={100}
                step={5}
                className="py-4"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
```

**Install Required Dependencies:**
```bash
npm install use-debounce
npx shadcn@latest add popover slider
```

**Acceptance Criteria:**
- [ ] Search filters across all text fields with 300ms debounce
- [ ] Source filter shows only contacts from selected source
- [ ] Relationship filter works correctly
- [ ] Score range slider filters contacts
- [ ] Filters persist in URL (shareable)
- [ ] Clear all filters resets to default view
- [ ] Active filter count badge displays correctly

---

### Task 2.2: Add Pagination (25 per page)

**Description:** Implement full pagination controls with page size selection and keyboard navigation.

**Size:** Small
**Priority:** High
**Dependencies:** Task 1.8
**Can run parallel with:** Task 2.1

**Technical Requirements:**
- 25 contacts per page default
- Page size options: 10, 25, 50, 100
- Page navigation controls
- Keyboard shortcuts (← →)
- Show "X of Y contacts"

**Implementation - components/contacts/Pagination.tsx:**
```typescript
'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function Pagination({ total, page, limit, totalPages }: PaginationProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const updateParams = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, router]);

  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      updateParams('page', String(newPage));
    }
  }, [totalPages, updateParams]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        goToPage(page - 1);
      } else if (e.key === 'ArrowRight') {
        goToPage(page + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [page, goToPage]);

  const startRecord = (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between px-4 py-4 border-t border-border">
      <div className="flex items-center gap-4">
        <p className="text-sm text-text-secondary">
          Showing <span className="font-medium text-text-primary">{startRecord}</span> to{' '}
          <span className="font-medium text-text-primary">{endRecord}</span> of{' '}
          <span className="font-medium text-text-primary">{total}</span> contacts
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">Per page:</span>
          <Select
            value={String(limit)}
            onValueChange={(value) => {
              const params = new URLSearchParams(searchParams.toString());
              params.set('limit', value);
              params.set('page', '1');
              router.push(`${pathname}?${params.toString()}`);
            }}
          >
            <SelectTrigger className="w-[70px] h-8 bg-bg-tertiary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-bg-secondary border-border">
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 border-border"
          onClick={() => goToPage(1)}
          disabled={page === 1}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 border-border"
          onClick={() => goToPage(page - 1)}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-3 text-sm text-text-secondary">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 border-border"
          onClick={() => goToPage(page + 1)}
          disabled={page === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 border-border"
          onClick={() => goToPage(totalPages)}
          disabled={page === totalPages}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Pagination shows correct record range
- [ ] Page size selector works (10, 25, 50, 100)
- [ ] First/Last page buttons work
- [ ] Previous/Next buttons work
- [ ] Keyboard shortcuts work (← →)
- [ ] Disabled state when at boundaries

---

### Task 2.3: Build Contact Detail Page with All Sections

**Description:** Create the full contact detail view with all profile sections, inline editing, and quick actions.

**Size:** Large
**Priority:** High
**Dependencies:** Task 1.7, Task 1.8
**Can run parallel with:** Task 2.4

**Technical Requirements:**
- Profile header with avatar, name, title, company
- Why Now section (highlighted)
- Basic Info section (email, phone, location, LinkedIn)
- Relationship section (how we met, strength, history)
- Profile section (expertise, interests)
- Tags section with category colors
- Notes section
- Quick actions (Edit, Enrich, Delete)
- Relationship strength visual (dots)

**Implementation - app/(dashboard)/contacts/[id]/page.tsx:**
```typescript
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { ContactDetailView } from '@/components/contacts/ContactDetailView';

interface ContactPageProps {
  params: { id: string };
}

export default async function ContactPage({ params }: ContactPageProps) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const contact = await prisma.contact.findFirst({
    where: { id: params.id, userId: user.id },
    include: { tags: true },
  });

  if (!contact) {
    notFound();
  }

  return <ContactDetailView contact={contact} />;
}
```

**Implementation - components/contacts/ContactDetailView.tsx:**
```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Building2,
  Calendar,
  Sparkles,
  Trash2,
  Edit,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RelationshipStrength } from './RelationshipStrength';
import { TagList } from './TagList';
import { useDeleteContact } from '@/hooks/use-contacts';
import type { Contact, Tag } from '@prisma/client';

interface ContactDetailViewProps {
  contact: Contact & { tags: Tag[] };
}

const categoryColors = {
  RELATIONSHIP: 'bg-category-relationship/20 text-category-relationship border-category-relationship/30',
  OPPORTUNITY: 'bg-category-opportunity/20 text-category-opportunity border-category-opportunity/30',
  EXPERTISE: 'bg-category-expertise/20 text-category-expertise border-category-expertise/30',
  INTEREST: 'bg-category-interest/20 text-category-interest border-category-interest/30',
};

export function ContactDetailView({ contact }: ContactDetailViewProps) {
  const router = useRouter();
  const deleteContact = useDeleteContact();

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this contact?')) {
      await deleteContact.mutateAsync(contact.id);
      router.push('/contacts');
    }
  };

  const initials = contact.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <Link href="/contacts" className="inline-flex items-center text-text-secondary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Contacts
      </Link>

      {/* Profile Header */}
      <Card className="bg-bg-secondary border-border">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20 border-2 border-gold-primary">
                <AvatarFallback className="bg-bg-tertiary text-gold-primary text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-text-primary">{contact.name}</h1>
                {contact.title && (
                  <p className="text-text-secondary">
                    {contact.title}
                    {contact.company && ` at ${contact.company}`}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2">
                  <RelationshipStrength strength={contact.relationshipStrength} />
                  <Badge variant="outline" className="border-border text-text-tertiary">
                    {contact.source}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      contact.enrichmentScore >= 80
                        ? 'bg-success/20 text-success border-success/30'
                        : contact.enrichmentScore >= 50
                        ? 'bg-gold-subtle text-gold-primary border-gold-primary/30'
                        : 'bg-warning/20 text-warning border-warning/30'
                    }
                  >
                    {contact.enrichmentScore}% enriched
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/enrich/${contact.id}`}>
                <Button variant="outline" className="border-border text-text-secondary">
                  <Sparkles className="h-4 w-4 mr-2" /> Enrich
                </Button>
              </Link>
              <Link href={`/contacts/${contact.id}/edit`}>
                <Button variant="outline" className="border-border text-text-secondary">
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </Button>
              </Link>
              <Button variant="outline" className="border-error text-error" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Why Now - Highlighted Section */}
      {contact.whyNow && (
        <Card className="bg-gold-subtle border-gold-primary/30">
          <CardHeader>
            <CardTitle className="text-gold-primary flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Why Now
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-text-primary whitespace-pre-wrap">{contact.whyNow}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card className="bg-bg-secondary border-border">
          <CardHeader>
            <CardTitle className="text-text-primary">Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {contact.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-text-tertiary" />
                <a href={`mailto:${contact.email}`} className="text-text-secondary hover:text-gold-primary">
                  {contact.email}
                </a>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-text-tertiary" />
                <span className="text-text-secondary">{contact.phone}</span>
              </div>
            )}
            {contact.location && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-text-tertiary" />
                <span className="text-text-secondary">{contact.location}</span>
              </div>
            )}
            {contact.company && (
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-text-tertiary" />
                <span className="text-text-secondary">{contact.company}</span>
              </div>
            )}
            {contact.linkedinUrl && (
              <div className="flex items-center gap-3">
                <Linkedin className="h-4 w-4 text-text-tertiary" />
                <a
                  href={contact.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-secondary hover:text-gold-primary flex items-center gap-1"
                >
                  LinkedIn <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            {contact.lastContactDate && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-text-tertiary" />
                <span className="text-text-secondary">
                  Last contact: {format(new Date(contact.lastContactDate), 'MMM d, yyyy')}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Relationship */}
        <Card className="bg-bg-secondary border-border">
          <CardHeader>
            <CardTitle className="text-text-primary">Relationship</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {contact.howWeMet && (
              <div>
                <p className="text-sm text-text-tertiary mb-1">How We Met</p>
                <p className="text-text-secondary">{contact.howWeMet}</p>
              </div>
            )}
            {contact.relationshipHistory && (
              <div>
                <p className="text-sm text-text-tertiary mb-1">History</p>
                <p className="text-text-secondary whitespace-pre-wrap">{contact.relationshipHistory}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile */}
        <Card className="bg-bg-secondary border-border">
          <CardHeader>
            <CardTitle className="text-text-primary">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {contact.expertise && (
              <div>
                <p className="text-sm text-text-tertiary mb-1">Expertise</p>
                <p className="text-text-secondary">{contact.expertise}</p>
              </div>
            )}
            {contact.interests && (
              <div>
                <p className="text-sm text-text-tertiary mb-1">Interests</p>
                <p className="text-text-secondary">{contact.interests}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tags */}
        <Card className="bg-bg-secondary border-border">
          <CardHeader>
            <CardTitle className="text-text-primary">Tags</CardTitle>
          </CardHeader>
          <CardContent>
            {contact.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {contact.tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className={categoryColors[tag.category]}
                  >
                    {tag.text}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-text-tertiary">No tags added</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {contact.notes && (
        <Card className="bg-bg-secondary border-border">
          <CardHeader>
            <CardTitle className="text-text-primary">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-text-secondary whitespace-pre-wrap">{contact.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <div className="text-sm text-text-tertiary flex gap-6">
        <span>Created: {format(new Date(contact.createdAt), 'MMM d, yyyy')}</span>
        <span>Updated: {format(new Date(contact.updatedAt), 'MMM d, yyyy')}</span>
        {contact.lastEnrichedAt && (
          <span>Last enriched: {format(new Date(contact.lastEnrichedAt), 'MMM d, yyyy')}</span>
        )}
      </div>
    </div>
  );
}
```

**Implementation - components/contacts/RelationshipStrength.tsx:**
```typescript
import { cn } from '@/lib/utils';

interface RelationshipStrengthProps {
  strength: number;
  showLabel?: boolean;
}

const strengthLabels = ['', 'Weak', 'Casual', 'Good', 'Strong'];

export function RelationshipStrength({ strength, showLabel = true }: RelationshipStrengthProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={cn(
              'w-2 h-2 rounded-full',
              level <= strength ? 'bg-gold-primary' : 'bg-bg-tertiary'
            )}
          />
        ))}
      </div>
      {showLabel && (
        <span className="text-sm text-text-secondary">{strengthLabels[strength]}</span>
      )}
    </div>
  );
}
```

**Install Required Dependencies:**
```bash
npm install date-fns
```

**Acceptance Criteria:**
- [ ] Profile header displays correctly with avatar and badges
- [ ] Why Now section highlighted with gold styling
- [ ] All info sections render with correct data
- [ ] Tags display with category colors
- [ ] Quick action buttons work (Edit, Enrich, Delete)
- [ ] Relationship strength dots display correctly
- [ ] Back to contacts link works
- [ ] Empty fields don't show sections

---

### Task 2.4: Implement Tags System (CRUD + Categories)

**Description:** Build the complete tags management system with category-based coloring, adding/removing tags, and autocomplete.

**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.7
**Can run parallel with:** Task 2.1, Task 2.2

**Technical Requirements:**
- Tag CRUD API endpoints
- Tag input with autocomplete suggestions
- Category-based coloring (relationship, opportunity, expertise, interest)
- Add/remove tags from contact detail and edit views
- Tag management in contact form

**Files to create/modify:**
- `src/app/api/tags/route.ts` - List all tags for autocomplete
- `src/app/api/contacts/[id]/tags/route.ts` - Add/remove tags from contact
- `src/components/contacts/TagInput.tsx` - Tag input with autocomplete
- Update `ContactForm.tsx` to include tag management

**Acceptance Criteria:**
- [ ] Tags API returns all user's tags for autocomplete
- [ ] Can add new tags with category selection
- [ ] Can remove tags from contacts
- [ ] Tags display with correct category colors
- [ ] Autocomplete suggests existing tags while typing

---

### Task 2.5: CSV Import with Field Mapping

**Description:** Build CSV import functionality with drag-and-drop upload, field mapping UI, and validation.

**Size:** Large
**Priority:** High
**Dependencies:** Task 1.7
**Can run parallel with:** Task 2.6

**Technical Requirements:**
- Drag and drop CSV file upload
- CSV parsing with papaparse
- Field mapping UI (map CSV columns to contact fields)
- Preview of first 5 rows before import
- Validation and error reporting
- Progress indicator during import
- Skip duplicates option (by email)

**Files to create:**
- `src/app/(dashboard)/contacts/import/page.tsx` - Import page
- `src/components/contacts/CsvImport.tsx` - CSV import wizard
- `src/components/contacts/FieldMapper.tsx` - Field mapping UI
- `src/app/api/contacts/import/csv/route.ts` - CSV import endpoint

**Dependencies to install:**
```bash
npm install papaparse @types/papaparse
```

**Acceptance Criteria:**
- [ ] Can drag and drop or click to upload CSV
- [ ] Shows preview of CSV data
- [ ] Can map CSV columns to contact fields
- [ ] Validates required fields (name)
- [ ] Shows progress during import
- [ ] Reports success/error counts
- [ ] Handles duplicates gracefully

---

### Task 2.6: CSV Export

**Description:** Export all contacts (or filtered selection) to CSV format.

**Size:** Small
**Priority:** Medium
**Dependencies:** Task 1.7, Task 2.1
**Can run parallel with:** Task 2.5

**Technical Requirements:**
- Export all contacts button
- Respects current filters (export filtered results)
- Includes all contact fields
- Proper CSV formatting with headers
- Filename includes date

**Files to create:**
- `src/app/api/contacts/export/route.ts` - CSV export endpoint
- Update `ContactsTable.tsx` with export button

**Acceptance Criteria:**
- [ ] Export button downloads CSV file
- [ ] CSV includes all contact fields
- [ ] Respects current filter state
- [ ] Proper filename format (contacts-YYYY-MM-DD.csv)
- [ ] Handles special characters correctly

---

### Task 2.7: Bulk Selection and Actions

**Description:** Enable selecting multiple contacts for bulk operations (delete, export, tag).

**Size:** Medium
**Priority:** Medium
**Dependencies:** Task 1.8, Task 2.1
**Can run parallel with:** Task 2.5, Task 2.6

**Technical Requirements:**
- Checkbox column for row selection
- "Select all" checkbox in header
- Bulk action toolbar appears when contacts selected
- Bulk delete with confirmation
- Clear selection action

**Files to modify:**
- `src/components/contacts/ContactsTable.tsx` - Add selection state
- `src/app/api/contacts/bulk/route.ts` - Bulk operations endpoint

**Acceptance Criteria:**
- [ ] Can select individual contacts
- [ ] "Select all" selects visible page
- [ ] Bulk action bar shows when contacts selected
- [ ] Bulk delete works with confirmation
- [ ] Selection count displays correctly
- [ ] Can clear selection

---

### Task 2.8: Contact Edit Page

**Description:** Create dedicated edit page for contacts with all fields editable.

**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.7, Task 1.8
**Can run parallel with:** Task 2.4

**Technical Requirements:**
- Full contact form with all fields
- Pre-populated with existing data
- Relationship strength selector
- Tag management
- Save and Cancel buttons
- Unsaved changes warning

**Files to create:**
- `src/app/(dashboard)/contacts/[id]/edit/page.tsx` - Edit page
- Reuse/enhance `ContactForm.tsx` for edit mode

**Acceptance Criteria:**
- [ ] Edit page loads with contact data
- [ ] All fields are editable
- [ ] Save updates contact correctly
- [ ] Cancel returns to detail page
- [ ] Form validation works
- [ ] Success toast on save

---

## Phase 3: Enrichment System

**STATUS: COMPLETED** (2025-12-12)

### Task 3.1: Add Enrichment Priority Function

**Description:** Extend the enrichment module with a priority calculation function that determines which contacts need enrichment most urgently.

**Size:** Small
**Priority:** High
**Dependencies:** None (lib/enrichment.ts already exists)

**Technical Requirements:**
- Calculate priority based on enrichment score (lower score = higher priority)
- Factor in days since last enrichment
- Factor in days since contact was added
- Return priority value 0-100

**Files to modify:**
- `src/lib/enrichment.ts` - Add `getEnrichmentPriority` function

**Acceptance Criteria:**
- [ ] Priority function returns 0-100 value
- [ ] New contacts with low scores get highest priority
- [ ] Never-enriched contacts get bonus priority

---

### Task 3.2: Enrichment Queue API

**Description:** Build API endpoints for the enrichment queue including list, stats, and skip functionality.

**Size:** Medium
**Priority:** High
**Dependencies:** Task 3.1

**Technical Requirements:**
- GET /api/enrichment/queue - Returns prioritized list of contacts needing enrichment
- GET /api/enrichment/stats - Returns enrichment statistics (total, enriched, pending)
- POST /api/enrichment/[id]/skip - Mark contact as skipped in queue
- Filter by source, limit results

**Files to create:**
- `src/app/api/enrichment/queue/route.ts`
- `src/app/api/enrichment/stats/route.ts`
- `src/app/api/enrichment/[id]/skip/route.ts`

**Acceptance Criteria:**
- [ ] Queue returns contacts sorted by priority
- [ ] Stats endpoint returns correct counts
- [ ] Skip moves contact to end of queue

---

### Task 3.3: Enrichment Queue Page

**Description:** Build the enrichment queue UI showing prioritized contacts with stats overview.

**Size:** Medium
**Priority:** High
**Dependencies:** Task 3.2

**Technical Requirements:**
- Stats card showing total/enriched/pending counts
- List of contacts needing enrichment with priority badges
- Filter tabs (All, High, Medium, Low priority)
- Start session button
- Skip action on each contact
- Shows reason why contact needs enrichment

**Files to create/modify:**
- `src/app/(dashboard)/enrich/page.tsx` - Queue page (replace placeholder)
- `src/components/enrichment/EnrichmentQueue.tsx` - Queue list component
- `src/components/enrichment/EnrichmentStats.tsx` - Stats card component

**Acceptance Criteria:**
- [ ] Shows prioritized list of contacts
- [ ] Stats card displays correct numbers
- [ ] Can filter by priority level
- [ ] Start button navigates to enrichment session
- [ ] Skip removes contact from immediate queue

---

### Task 3.4: Circular Timer Component

**Description:** Build the circular countdown timer for the enrichment session.

**Size:** Small
**Priority:** High
**Dependencies:** None

**Technical Requirements:**
- 30-second default duration
- Circular SVG progress indicator
- Color transitions (gold → amber → red in last 10 seconds)
- +30 seconds button (max 60 seconds)
- Pause/Resume button
- Pulse animation in last 10 seconds

**Files to create:**
- `src/components/enrichment/EnrichmentTimer.tsx`

**Dependencies to install:**
```bash
npm install framer-motion
```

**Acceptance Criteria:**
- [ ] Timer counts down from 30 seconds
- [ ] Visual progress ring updates smoothly
- [ ] Color changes to red in last 10 seconds
- [ ] +30 button extends time (max 60)
- [ ] Pause/Resume works correctly

---

### Task 3.5: Enrichment Bubbles Component

**Description:** Build the animated bubble display that shows captured insights during enrichment.

**Size:** Medium
**Priority:** High
**Dependencies:** Task 3.4

**Technical Requirements:**
- Animated bubbles with spring physics (scale 0.8 → 1.05 → 1.0)
- Category-colored dots (blue/green/purple/amber)
- Staggered entrance animation
- Organic layout (not grid)
- Combo effect for multi-category statements

**Files to create:**
- `src/components/enrichment/EnrichmentBubbles.tsx`
- `src/components/enrichment/EnrichmentBubble.tsx`

**Acceptance Criteria:**
- [ ] Bubbles animate in with spring physics
- [ ] Colors match category (relationship/opportunity/expertise/interest)
- [ ] New bubbles appear with stagger effect
- [ ] Layout feels organic, not rigid

---

### Task 3.6: Enrichment Session Page

**Description:** Build the gamified enrichment session UI with timer, input, and bubbles.

**Size:** Large
**Priority:** High
**Dependencies:** Task 3.4, Task 3.5

**Technical Requirements:**
- Contact info header
- Circular timer
- Text input area (voice input optional for MVP)
- Real-time bubble generation as user types
- Timer controls (+30 sec, pause)
- Auto-complete when timer ends

**Files to create:**
- `src/app/(dashboard)/enrich/[id]/page.tsx` - Session page
- `src/components/enrichment/EnrichmentSession.tsx` - Main session component

**Acceptance Criteria:**
- [ ] Shows contact being enriched
- [ ] Timer counts down from 30 seconds
- [ ] User can type/paste enrichment text
- [ ] Bubbles appear as text is processed
- [ ] Session ends when timer completes

---

### Task 3.7: Post-Enrichment Summary

**Description:** Build the summary view shown after enrichment session completes.

**Size:** Medium
**Priority:** High
**Dependencies:** Task 3.6

**Technical Requirements:**
- Success animation
- Count of insights captured
- Categorized list of captured info
- Optional AI follow-up question
- "Next Contact" button for streak mode
- "Done" button to return to queue

**Files to create:**
- `src/components/enrichment/EnrichmentSummary.tsx`

**Acceptance Criteria:**
- [ ] Shows success state with animation
- [ ] Displays captured insights by category
- [ ] Next Contact button works
- [ ] Done button returns to queue

---

### Task 3.8: Enrichment Save & Score Update

**Description:** Wire up enrichment saves to update contact data and recalculate score.

**Size:** Medium
**Priority:** High
**Dependencies:** Task 3.6, Task 3.7

**Technical Requirements:**
- POST /api/enrichment/[id]/save - Save enrichment data
- Parse text input to extract structured data
- Update relevant contact fields (whyNow, expertise, interests, etc.)
- Recalculate enrichment score
- Update lastEnrichedAt timestamp
- Create tags from categories if appropriate

**Files to create:**
- `src/app/api/enrichment/[id]/save/route.ts`
- `src/lib/enrichment-parser.ts` - Parse enrichment text into structured data

**Acceptance Criteria:**
- [ ] Enrichment text saved to contact
- [ ] Enrichment score recalculated
- [ ] lastEnrichedAt timestamp updated
- [ ] Tags created if applicable
- [ ] Contact detail shows updated info

---

## Phase 4: AI Features

### Task 4.1: Configure Vercel AI SDK with OpenAI

**Description:** Set up the Vercel AI SDK and OpenAI integration for chat exploration and content generation.

**Size:** Small
**Priority:** Critical
**Dependencies:** None

**Technical Requirements:**
- Install @ai-sdk/openai and ai packages
- Create lib/openai.ts with GPT-4o-mini configuration
- Add system prompts for exploration and intro drafting
- Set up OPENAI_API_KEY environment variable

**Files to create:**
- `src/lib/openai.ts` - OpenAI client and prompts

**Implementation:**
```typescript
// src/lib/openai.ts
import { openai } from '@ai-sdk/openai';

export const gpt4oMini = openai('gpt-4o-mini');

export const EXPLORATION_SYSTEM_PROMPT = `
You are an AI assistant helping a user explore their professional network.
You have access to their contact database.

When suggesting contacts, format them as:
[CONTACT: {contact_id}] {name} - {reason_for_suggestion}

For each suggested contact, provide a "Why Now" explanation that:
- Is contextual to the user's current query
- References specific attributes of the contact
- Explains the strategic value of reaching out

Be helpful, concise, and focus on actionable insights about their network.
`;

export const DRAFT_INTRO_SYSTEM_PROMPT = `
Write a brief, warm introduction message. The email should:
- Feel personal, not templated
- Reference shared context
- Have a clear but soft ask
- Match a professional but warm tone
- Be 2-3 sentences maximum
`;
```

**Acceptance Criteria:**
- [ ] AI SDK packages installed
- [ ] OpenAI client configured
- [ ] System prompts defined
- [ ] OPENAI_API_KEY in .env.local

---

### Task 4.2: Build Chat Exploration API

**Description:** Create the streaming chat API endpoint that processes user queries and returns AI responses with contact suggestions.

**Size:** Medium
**Priority:** High
**Dependencies:** Task 4.1

**Technical Requirements:**
- POST /api/chat/explore - Streaming chat endpoint
- Fetch user's top 100 contacts for context
- Use streamText from Vercel AI SDK
- Include contact data in system prompt
- Stream response back to client

**Files to create:**
- `src/app/api/chat/explore/route.ts`

**Acceptance Criteria:**
- [ ] Streaming responses work
- [ ] User contacts included in context
- [ ] Contact suggestions formatted correctly
- [ ] Authentication required

---

### Task 4.3: Build Chat Exploration Page Layout

**Description:** Create the split-panel chat exploration page with chat on left and contact cards on right.

**Size:** Large
**Priority:** High
**Dependencies:** Task 4.2

**Technical Requirements:**
- Split-panel layout (45% chat, 55% contacts)
- Chat message list with auto-scroll
- Input field with send button
- Contact panel with filtering
- Responsive for smaller screens

**Files to create:**
- `src/app/(dashboard)/explore/page.tsx`
- `src/components/chat/ChatExplorer.tsx`
- `src/components/chat/ChatMessage.tsx`
- `src/components/chat/ChatInput.tsx`

**Acceptance Criteria:**
- [ ] Split panel layout works
- [ ] Chat messages render correctly
- [ ] User can send messages
- [ ] Streaming responses display in real-time

---

### Task 4.4: Create Contact Recommendation Cards

**Description:** Build the contact card component for the exploration panel that shows contact info with dynamic "Why Now" context.

**Size:** Medium
**Priority:** High
**Dependencies:** Task 4.3

**Technical Requirements:**
- Card with avatar, name, title, company
- "Why Now" section with contextual relevance
- Hover state with additional info (location, last contact)
- Expandable for full profile view
- Action buttons (Draft Intro, Pin, View)

**Files to create:**
- `src/components/chat/ContactCard.tsx`
- `src/components/chat/ContactPanel.tsx`

**Acceptance Criteria:**
- [ ] Cards display contact info
- [ ] "Why Now" shows contextual relevance
- [ ] Hover reveals more info
- [ ] Expand shows full profile
- [ ] Actions work correctly

---

### Task 4.5: Parse AI Contact Suggestions

**Description:** Parse the AI response to extract contact suggestions and map them to actual contacts for display.

**Size:** Medium
**Priority:** High
**Dependencies:** Task 4.3, Task 4.4

**Technical Requirements:**
- Parse [CONTACT: {id}] format from AI response
- Match IDs to actual contacts in database
- Generate dynamic "Why Now" from AI context
- Handle multiple suggestions per response
- Update contact panel as suggestions arrive

**Files to create:**
- `src/lib/chat-parser.ts` - Parse AI responses

**Acceptance Criteria:**
- [ ] Contact IDs extracted from responses
- [ ] Contacts fetched and displayed
- [ ] "Why Now" populated from AI context
- [ ] Panel updates in real-time

---

### Task 4.6: Build Draft Intro Modal

**Description:** Create the modal for drafting personalized introduction emails using AI.

**Size:** Medium
**Priority:** Medium
**Dependencies:** Task 4.4

**Technical Requirements:**
- Modal triggered from contact card action
- Show contact context (name, how met, why now)
- Optional user intent input
- Generate intro using GPT-4o-mini
- Copy to clipboard functionality
- Regenerate with different angle option

**Files to create:**
- `src/components/chat/DraftIntroModal.tsx`
- `src/app/api/chat/draft-intro/route.ts`

**Acceptance Criteria:**
- [ ] Modal opens from Draft Intro action
- [ ] Shows contact context
- [ ] Generates personalized intro
- [ ] Copy to clipboard works
- [ ] Can regenerate

---

### Task 4.7: Add Contact Pinning Feature

**Description:** Allow users to pin high-potential contacts during exploration for later action.

**Size:** Small
**Priority:** Low
**Dependencies:** Task 4.4

**Technical Requirements:**
- Pin button on contact cards
- Visual indicator for pinned contacts
- Pinned contacts stay at top of list
- Pins persist during session (not saved to DB for MVP)

**Files to modify:**
- `src/components/chat/ContactCard.tsx` - Add pin functionality
- `src/components/chat/ContactPanel.tsx` - Sort pinned to top

**Acceptance Criteria:**
- [ ] Pin button works
- [ ] Pinned contacts show indicator
- [ ] Pinned contacts sorted to top
- [ ] Can unpin contacts

---

### Task 4.8: Implement Reverse Lookup Feature

**Description:** Allow users to quickly look up a contact by name or email to get context before a meeting or responding to outreach.

**Size:** Medium
**Priority:** Medium
**Dependencies:** Task 4.3

**Technical Requirements:**
- Search input in explore page header
- Instant search as user types
- Show matching contact card(s)
- Display "How you know them" context
- Quick actions available

**Files to modify:**
- `src/app/(dashboard)/explore/page.tsx` - Add search functionality
- `src/components/chat/ContactPanel.tsx` - Filter by search

**Acceptance Criteria:**
- [ ] Search input works
- [ ] Matches contacts by name/email
- [ ] Shows relationship context
- [ ] Can take quick actions

---

## Phase 5: Polish & Deployment

### Task 5.1: Complete Settings Page

**Description:** Build a functional settings page with account information, logout functionality, and data management options.

**Dependencies:** Phase 1 Auth

**Technical Requirements:**
- Display user profile info (name, email)
- Logout button with confirmation
- Export contacts as CSV
- Delete account option with confirmation
- Theme toggle (if time permits)

**Files to create/modify:**
- `src/app/(dashboard)/settings/page.tsx` - Full settings page
- `src/components/settings/AccountSection.tsx` - Account info
- `src/components/settings/DataSection.tsx` - Export/delete

**Acceptance Criteria:**
- [ ] User info displayed
- [ ] Logout works correctly
- [ ] Export contacts as CSV works
- [ ] Delete account has confirmation dialog

---

### Task 5.2: Add Loading States & Skeletons

**Description:** Add loading skeletons and states to all major pages for better UX.

**Dependencies:** All page components

**Technical Requirements:**
- Skeleton components for contact list
- Skeleton for contact detail page
- Skeleton for enrichment queue
- Loading states for AI chat
- Suspense boundaries where appropriate

**Files to create/modify:**
- `src/components/ui/skeleton.tsx` - Base skeleton component
- `src/components/contacts/ContactListSkeleton.tsx`
- `src/components/contacts/ContactDetailSkeleton.tsx`
- Update page components with loading states

**Acceptance Criteria:**
- [ ] All pages show skeletons while loading
- [ ] No layout shift when content loads
- [ ] Smooth transitions

---

### Task 5.3: Comprehensive Error Handling

**Description:** Add error boundaries, toast notifications, and user-friendly error messages throughout the app.

**Dependencies:** All components

**Technical Requirements:**
- Global error boundary component
- Toast notification system (already have sonner)
- Form validation error display
- API error handling with user feedback
- Network error recovery

**Files to create/modify:**
- `src/components/ErrorBoundary.tsx` - Global error boundary
- `src/app/error.tsx` - App-level error page
- Update API routes with consistent error responses

**Acceptance Criteria:**
- [ ] Errors don't crash the app
- [ ] Users see helpful error messages
- [ ] Toast notifications for actions

---

### Task 5.4: Responsive Design Adjustments

**Description:** Ensure the application works well on tablets and mobile devices.

**Dependencies:** All UI components

**Technical Requirements:**
- Collapsible sidebar on mobile
- Responsive contact cards
- Mobile-friendly forms
- Touch-friendly buttons
- Proper spacing on small screens

**Files to modify:**
- `src/components/layout/Sidebar.tsx` - Mobile drawer
- `src/app/(dashboard)/contacts/page.tsx` - Responsive grid
- Various component styling updates

**Acceptance Criteria:**
- [ ] Usable on tablet (768px+)
- [ ] Usable on mobile (375px+)
- [ ] No horizontal scroll
- [ ] Touch targets 44px minimum

---

### Task 5.5: Performance Optimization for 500+ Contacts

**Description:** Optimize the application to handle 500+ contacts without performance degradation.

**Dependencies:** Contact list, API routes

**Technical Requirements:**
- Virtual scrolling for contact list
- Pagination on API endpoints
- Debounced search
- Optimized re-renders with React.memo
- Database query optimization

**Files to modify:**
- `src/app/(dashboard)/contacts/page.tsx` - Add virtualization
- `src/app/api/contacts/route.ts` - Pagination
- Consider using react-virtual or similar

**Acceptance Criteria:**
- [ ] 500 contacts load in <2 seconds
- [ ] Scrolling remains smooth
- [ ] Search is responsive
- [ ] No memory leaks

---

### Task 5.6: Create Docker Configuration

**Description:** Create Dockerfile and docker-compose for containerized deployment.

**Dependencies:** None

**Technical Requirements:**
- Multi-stage Dockerfile for optimized builds
- Production-ready Node.js configuration
- Environment variable handling
- Health check endpoint
- docker-compose for local testing

**Files to create:**
- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`
- `src/app/api/health/route.ts` - Health check endpoint

**Acceptance Criteria:**
- [ ] Docker build succeeds
- [ ] Container runs correctly
- [ ] Health check works
- [ ] Environment variables configured

---

### Task 5.7: Deploy to Railway

**Description:** Deploy the application to Railway with proper configuration.

**Dependencies:** Task 5.6

**Technical Requirements:**
- Railway project setup
- Environment variables configured
- Database connection (use existing Supabase PostgreSQL)
- Custom domain (optional)
- SSL/HTTPS enabled

**Deployment Steps:**
1. Create Railway project
2. Connect GitHub repository
3. Configure environment variables
4. Deploy and verify
5. Set up monitoring

**Acceptance Criteria:**
- [ ] App accessible on Railway URL
- [ ] Database connected
- [ ] Auth working in production
- [ ] AI features functional

---

### Task 5.8: Production Testing & Bug Fixes

**Description:** Final testing of all features in production environment and fixing any bugs found.

**Dependencies:** Task 5.7

**Technical Requirements:**
- Test all user flows end-to-end
- Verify auth flow
- Test contact CRUD operations
- Test enrichment workflow
- Test AI chat features
- Performance testing
- Fix any bugs discovered

**Test Scenarios:**
1. Sign up → Import contacts → Enrich → Explore
2. Full contact lifecycle (create, edit, delete)
3. Bulk operations
4. AI chat conversation
5. Draft intro generation

**Acceptance Criteria:**
- [ ] All critical paths work
- [ ] No P0/P1 bugs
- [ ] Performance acceptable
- [ ] Ready for users

---

## Summary

This task breakdown covers all phases for the Better Connections MVP. Each task includes:

- Clear description and scope
- Technical requirements from spec
- Implementation code examples
- Dependencies and parallel opportunities
- Acceptance criteria

**Phase Breakdown:**
- Phase 1: 10 tasks (Core Infrastructure) - COMPLETED
- Phase 2: 8 tasks (Contact Management) - COMPLETED
- Phase 3: 8 tasks (Enrichment System) - COMPLETED
- Phase 4: 8 tasks (AI Features) - COMPLETED
- Phase 5: 8 tasks (Polish & Deployment) - Tasks 5.1-5.8

**Critical Path:** Tasks 1.1 → 1.4 → 1.5 → 1.7 → 1.8 → 2.3 → 3.1 → 4.1 → 5.7

**Parallel Opportunities:**
- Tasks 1.2, 1.3 can run parallel after 1.1
- Tasks 1.6, 1.7 can run parallel after 1.4, 1.5
- Tasks 2.1-2.4 can run mostly in parallel
- Tasks 3.2-3.4 can run parallel after 3.1

---

*Generated: 2025-12-12*
*Source: Better Connections MVP Specification v1.0*
