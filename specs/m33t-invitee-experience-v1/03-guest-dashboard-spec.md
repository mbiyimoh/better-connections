# M33T Guest Dashboard & Profile Management

**Status:** Ready for Implementation
**Author:** Claude Code
**Date:** 2026-01-27
**Slug:** m33t-invitee-experience-v1-dashboard
**Depends On:** `02-specification.md` (Auth Foundation)
**Related Ideation:** `01-ideation.md` (Section 7, Spec B)

---

## Overview

Implement the authenticated guest dashboard for M33T invitees, providing a centralized hub to manage their profile, view events they're invited to, and access event-specific features. The dashboard is M33T-branded (distinct from Better Contacts) and serves as the post-RSVP home for verified invitees.

---

## Background / Problem Statement

### Current State
- After completing RSVP, invitees have no persistent "home" to return to
- Profile editing happens only during the RSVP questionnaire flow
- Invitees cannot see which events they're associated with
- No way to update profile after initial submission
- Phone number changes require contacting organizers

### Why This Matters
1. **Profile Control:** Invitees need to manage how they appear to other attendees
2. **Multi-Event Support:** Same person may be invited to multiple M33T events
3. **Ongoing Engagement:** Dashboard enables pre-event anticipation and engagement
4. **Data Accuracy:** Self-service updates reduce organizer workload

### Core Problem (First Principles)
Authenticated invitees need a place to:
- See and edit their public-facing profile
- View all events they're invited to
- Access event-specific features (directory, matches)
- Manage their communication preferences

---

## Goals

- Create M33T-branded guest dashboard at `/guest/**` routes
- Enable invitees to view and edit all displayed profile fields
- Show list of events the invitee is associated with
- Provide quick access to event landing pages and directories
- Encourage photo uploads as primary profile enhancement
- Support phone number updates with re-verification
- Maintain clear separation from Better Contacts UI

---

## Non-Goals

- Better Contacts feature access or activation prompts
- Event creation or organizer features
- Match reveal experience (separate Spec D)
- Post-event follow-up features
- Admin/organizer impersonation of guest view
- Notification preference management (future enhancement)

---

## Technical Dependencies

### From Spec A (Auth Foundation)
- Authenticated User with `accountOrigin: 'M33T_INVITEE'`
- Phone verification system
- Route protection middleware for `/guest/**`
- EventAttendee → User linking via `userId`

### Existing Components to Reuse
| Component | Location | Adaptation Needed |
|-----------|----------|-------------------|
| TradingCard | `src/components/m33t/TradingCard.tsx` | Use as profile preview |
| AttendeeProfileEditModal | `src/components/m33t/AttendeeProfileEditModal.tsx` | Adapt for self-editing |
| Card, Badge, Button | `src/components/ui/*` | Direct reuse |
| Avatar | `src/components/ui/avatar.tsx` | Direct reuse |
| Design tokens | `src/lib/design-system.ts` | Direct reuse |

### New Dependencies
| Library | Purpose |
|---------|---------|
| `@uploadthing/react` or similar | Profile photo uploads |

---

## Detailed Design

### 1. Route Structure

```
/guest
├── /events                    # List of events invitee is associated with
├── /events/[eventId]          # Event detail with actions
├── /events/[eventId]/directory # Attendee directory (Spec C)
├── /profile                   # View/edit own profile
└── /settings                  # Phone, notifications (future)
```

### 2. Database Queries

#### Get User's Events
```typescript
// Returns all events where user is an attendee
const userEvents = await prisma.event.findMany({
  where: {
    attendees: {
      some: {
        userId: currentUser.id
      }
    }
  },
  include: {
    attendees: {
      where: { userId: currentUser.id },
      select: {
        id: true,
        rsvpStatus: true,
        questionnaireCompletedAt: true,
        profile: true,
        tradingCard: true,
      }
    },
    _count: {
      select: {
        attendees: {
          where: { rsvpStatus: { in: ['CONFIRMED', 'MAYBE'] } }
        }
      }
    }
  },
  orderBy: { eventDate: 'asc' }
});
```

#### Get User's Profile Data
```typescript
// Aggregate profile from all EventAttendee records + User
const userProfile = await prisma.user.findUnique({
  where: { id: currentUser.id },
  include: {
    linkedAttendees: {
      include: {
        event: {
          select: { id: true, name: true }
        }
      }
    }
  }
});
```

### 3. Guest Layout Component

```typescript
// src/app/guest/layout.tsx

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-helpers';
import { GuestShell } from '@/components/guest/GuestShell';

export default async function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?redirect=/guest/events');
  }

  return (
    <GuestShell user={user}>
      {children}
    </GuestShell>
  );
}
```

### 4. Guest Shell Component

```typescript
// src/components/guest/GuestShell.tsx

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar, User, LogOut, Menu, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AuthUser } from '@/lib/auth-helpers';

interface GuestShellProps {
  user: AuthUser;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: '/guest/events', label: 'My Events', icon: Calendar },
  { href: '/guest/profile', label: 'My Profile', icon: User },
];

export function GuestShell({ user, children }: GuestShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-bg-primary/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/guest/events" className="flex items-center gap-2">
              <span className="text-xl font-semibold text-gold-primary">M33T</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-gold-subtle text-gold-primary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatarUrl} />
                <AvatarFallback className="bg-gold-subtle text-gold-primary text-xs">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border"
          >
            <div className="px-4 py-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium',
                      isActive
                        ? 'bg-gold-subtle text-gold-primary'
                        : 'text-text-secondary'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
              <button
                onClick={() => signOut()}
                className="flex items-center gap-3 px-3 py-2 w-full text-left text-sm text-text-secondary hover:text-text-primary"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </motion.nav>
        )}
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
```

### 5. Events List Page

```typescript
// src/app/guest/events/page.tsx

import { Suspense } from 'react';
import { getCurrentUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { EventsListClient } from './EventsListClient';
import { Skeleton } from '@/components/ui/skeleton';

export default async function GuestEventsPage() {
  const user = await getCurrentUser();

  const events = await prisma.event.findMany({
    where: {
      attendees: {
        some: { userId: user!.id }
      }
    },
    include: {
      attendees: {
        where: { userId: user!.id },
        select: {
          id: true,
          rsvpStatus: true,
          questionnaireCompletedAt: true,
        }
      },
      _count: {
        select: {
          attendees: {
            where: { rsvpStatus: { in: ['CONFIRMED', 'MAYBE'] } }
          }
        }
      }
    },
    orderBy: { eventDate: 'asc' }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">My Events</h1>
        <p className="text-text-secondary mt-1">
          Events you've been invited to
        </p>
      </div>

      <EventsListClient events={events} />
    </div>
  );
}
```

### 6. Event Card Component

```typescript
// src/components/guest/EventCard.tsx

'use client';

import Link from 'next/link';
import { format, isPast, isFuture, isToday } from 'date-fns';
import { Calendar, MapPin, Users, ChevronRight, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface EventCardProps {
  event: {
    id: string;
    name: string;
    tagline?: string | null;
    eventDate: Date;
    startTime?: string | null;
    venueName?: string | null;
    venueCity?: string | null;
    slug: string;
    attendees: {
      rsvpStatus: string;
      questionnaireCompletedAt: Date | null;
    }[];
    _count: {
      attendees: number;
    };
  };
}

export function EventCard({ event }: EventCardProps) {
  const attendee = event.attendees[0];
  const eventDate = new Date(event.eventDate);
  const isPastEvent = isPast(eventDate) && !isToday(eventDate);
  const isUpcoming = isFuture(eventDate) || isToday(eventDate);

  const statusConfig = {
    CONFIRMED: { label: 'Confirmed', color: 'bg-emerald-500/20 text-emerald-400' },
    MAYBE: { label: 'Maybe', color: 'bg-amber-500/20 text-amber-400' },
    PENDING: { label: 'Invited', color: 'bg-zinc-500/20 text-zinc-400' },
    DECLINED: { label: 'Declined', color: 'bg-red-500/20 text-red-400' },
  };

  const status = statusConfig[attendee?.rsvpStatus as keyof typeof statusConfig] || statusConfig.PENDING;

  return (
    <Link href={`/guest/events/${event.id}`}>
      <Card className={cn(
        'group transition-all hover:border-gold-primary/50',
        isPastEvent && 'opacity-60'
      )}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Event Name */}
              <h3 className="font-semibold text-text-primary truncate">
                {event.name}
              </h3>

              {/* Tagline */}
              {event.tagline && (
                <p className="text-sm text-text-secondary mt-0.5 truncate">
                  {event.tagline}
                </p>
              )}

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-text-tertiary">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(eventDate, 'MMM d, yyyy')}
                  {event.startTime && ` at ${event.startTime}`}
                </span>

                {(event.venueName || event.venueCity) && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {event.venueCity || event.venueName}
                  </span>
                )}

                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {event._count.attendees} attending
                </span>
              </div>

              {/* Status Badges */}
              <div className="flex items-center gap-2 mt-3">
                <Badge className={status.color}>
                  {status.label}
                </Badge>

                {attendee?.questionnaireCompletedAt ? (
                  <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Profile Complete
                  </Badge>
                ) : isUpcoming && (
                  <Badge variant="outline" className="text-amber-400 border-amber-400/30">
                    <Clock className="h-3 w-3 mr-1" />
                    Profile Incomplete
                  </Badge>
                )}
              </div>
            </div>

            {/* Arrow */}
            <ChevronRight className="h-5 w-5 text-text-tertiary group-hover:text-gold-primary transition-colors flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

### 7. Event Detail Page

```typescript
// src/app/guest/events/[eventId]/page.tsx

import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { getCurrentUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Calendar, MapPin, Users, ExternalLink,
  UserCircle, Edit, Clock
} from 'lucide-react';

export default async function GuestEventDetailPage({
  params,
}: {
  params: { eventId: string };
}) {
  const user = await getCurrentUser();

  // Verify user has access to this event
  const event = await prisma.event.findFirst({
    where: {
      id: params.eventId,
      attendees: {
        some: { userId: user!.id }
      }
    },
    include: {
      attendees: {
        where: { userId: user!.id },
        include: {
          contact: true,
        }
      },
      _count: {
        select: {
          attendees: {
            where: { rsvpStatus: { in: ['CONFIRMED', 'MAYBE'] } }
          }
        }
      }
    }
  });

  if (!event) {
    notFound();
  }

  const attendee = event.attendees[0];
  const eventDate = new Date(event.eventDate);
  const profileComplete = !!attendee?.questionnaireCompletedAt;

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/guest/events"
        className="text-sm text-text-secondary hover:text-text-primary"
      >
        &larr; Back to Events
      </Link>

      {/* Event Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">
          {event.name}
        </h1>
        {event.tagline && (
          <p className="text-text-secondary mt-1">{event.tagline}</p>
        )}
      </div>

      {/* Event Details Card */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 text-text-secondary">
              <Calendar className="h-5 w-5 text-gold-primary" />
              <div>
                <p className="font-medium text-text-primary">
                  {format(eventDate, 'EEEE, MMMM d, yyyy')}
                </p>
                {event.startTime && (
                  <p className="text-sm">{event.startTime}</p>
                )}
              </div>
            </div>

            {event.venueName && (
              <div className="flex items-center gap-3 text-text-secondary">
                <MapPin className="h-5 w-5 text-gold-primary" />
                <div>
                  <p className="font-medium text-text-primary">{event.venueName}</p>
                  {event.venueCity && (
                    <p className="text-sm">{event.venueCity}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 text-text-secondary">
              <Users className="h-5 w-5 text-gold-primary" />
              <div>
                <p className="font-medium text-text-primary">
                  {event._count.attendees} Attending
                </p>
                <p className="text-sm">Confirmed & Maybe</p>
              </div>
            </div>
          </div>

          {/* Public Landing Page Link */}
          {event.slug && (
            <div className="pt-4 border-t border-border">
              <Link
                href={`/m33t/${event.slug}`}
                target="_blank"
                className="inline-flex items-center gap-2 text-sm text-gold-primary hover:text-gold-light"
              >
                View Public Event Page
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Your Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-gold-primary" />
            Your RSVP
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Status</span>
            <Badge className={
              attendee.rsvpStatus === 'CONFIRMED'
                ? 'bg-emerald-500/20 text-emerald-400'
                : attendee.rsvpStatus === 'MAYBE'
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-zinc-500/20 text-zinc-400'
            }>
              {attendee.rsvpStatus === 'CONFIRMED' ? 'Confirmed' :
               attendee.rsvpStatus === 'MAYBE' ? 'Maybe' : 'Pending'}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Profile</span>
            {profileComplete ? (
              <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">
                Complete
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-400 border-amber-400/30">
                <Clock className="h-3 w-3 mr-1" />
                Incomplete
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          asChild
          className="bg-gold-primary hover:bg-gold-light text-bg-primary"
        >
          <Link href={`/guest/events/${event.id}/directory`}>
            <Users className="h-4 w-4 mr-2" />
            Browse Attendees
          </Link>
        </Button>

        <Button
          asChild
          variant="outline"
        >
          <Link href={`/guest/profile?event=${event.id}`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit My Profile
          </Link>
        </Button>
      </div>

      {/* Incomplete Profile Prompt */}
      {!profileComplete && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-text-primary">
                  Complete your profile
                </h3>
                <p className="text-sm text-text-secondary mt-1">
                  Help other attendees get to know you before the event.
                  A complete profile increases your chances of great matches.
                </p>
                <Button
                  asChild
                  size="sm"
                  className="mt-3 bg-amber-500 hover:bg-amber-600 text-white"
                >
                  <Link href={`/rsvp/${attendee.rsvpToken}/questionnaire`}>
                    Complete Profile
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

### 8. Profile Page

```typescript
// src/app/guest/profile/page.tsx

import { getCurrentUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { ProfileViewClient } from './ProfileViewClient';

export default async function GuestProfilePage({
  searchParams,
}: {
  searchParams: { event?: string };
}) {
  const user = await getCurrentUser();

  // Get user data with all linked attendee profiles
  const userData = await prisma.user.findUnique({
    where: { id: user!.id },
    include: {
      linkedAttendees: {
        include: {
          event: {
            select: { id: true, name: true, eventDate: true }
          }
        },
        orderBy: {
          event: { eventDate: 'desc' }
        }
      }
    }
  });

  // Determine which event's profile to show
  const selectedEventId = searchParams.event || userData?.linkedAttendees[0]?.eventId;
  const selectedAttendee = userData?.linkedAttendees.find(
    a => a.eventId === selectedEventId
  ) || userData?.linkedAttendees[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">My Profile</h1>
        <p className="text-text-secondary mt-1">
          This is how you appear to other attendees
        </p>
      </div>

      <ProfileViewClient
        user={userData}
        attendees={userData?.linkedAttendees || []}
        selectedAttendee={selectedAttendee}
      />
    </div>
  );
}
```

### 9. Profile View/Edit Client Component

```typescript
// src/app/guest/profile/ProfileViewClient.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Camera, Edit2, Check, X, Loader2 } from 'lucide-react';
import { TradingCard } from '@/components/m33t/TradingCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProfileViewClientProps {
  user: any;
  attendees: any[];
  selectedAttendee: any;
}

export function ProfileViewClient({
  user,
  attendees,
  selectedAttendee,
}: ProfileViewClientProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(selectedAttendee?.eventId);

  // Form state
  const [formData, setFormData] = useState({
    name: selectedAttendee?.profile?.name || user?.name || '',
    photoUrl: selectedAttendee?.profile?.photoUrl || '',
    role: selectedAttendee?.profile?.role || '',
    company: selectedAttendee?.profile?.company || '',
    location: selectedAttendee?.profile?.location || '',
    expertise: selectedAttendee?.profile?.expertise || [],
    seekingSummary: selectedAttendee?.profile?.seekingSummary || '',
    offeringSummary: selectedAttendee?.profile?.offeringSummary || '',
    currentFocus: selectedAttendee?.profile?.currentFocus || '',
  });

  const [newTag, setNewTag] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(
        `/api/guest/events/${selectedEventId}/profile`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }
      );

      if (!res.ok) throw new Error('Failed to save');

      toast.success('Profile updated!');
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      toast.error('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.expertise.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        expertise: [...prev.expertise, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      expertise: prev.expertise.filter(t => t !== tag)
    }));
  };

  const currentAttendee = attendees.find(a => a.eventId === selectedEventId);

  return (
    <div className="space-y-6">
      {/* Event Selector (if multiple events) */}
      {attendees.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <Label className="text-sm text-text-secondary">
              Viewing profile for:
            </Label>
            <Select
              value={selectedEventId}
              onValueChange={(value) => {
                setSelectedEventId(value);
                router.push(`/guest/profile?event=${value}`);
              }}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {attendees.map((attendee) => (
                  <SelectItem key={attendee.eventId} value={attendee.eventId}>
                    {attendee.event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Profile Preview */}
      {!isEditing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Profile Preview</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </CardHeader>
            <CardContent>
              <TradingCard
                data={{
                  name: formData.name,
                  photoUrl: formData.photoUrl,
                  headline: formData.role
                    ? `${formData.role}${formData.company ? ` @ ${formData.company}` : ''}`
                    : formData.company || '',
                  expertise: formData.expertise,
                  currentFocus: formData.currentFocus,
                  seekingSummary: formData.seekingSummary,
                  offeringSummary: formData.offeringSummary,
                }}
                level="L3"
                expandable
                defaultExpanded
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Edit Form */}
      {isEditing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Edit Profile</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-gold-primary hover:bg-gold-light"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  Save
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Photo Upload */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={formData.photoUrl} />
                    <AvatarFallback className="bg-gold-subtle text-gold-primary text-xl">
                      {formData.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-gold-primary text-bg-primary hover:bg-gold-light"
                    onClick={() => {/* TODO: Implement photo upload */}}
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">Profile Photo</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Add a photo to help others recognize you
                  </p>
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Your name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="City, State"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role / Title</Label>
                  <Input
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    placeholder="What you do"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Where you work"
                  />
                </div>
              </div>

              {/* Expertise Tags */}
              <div className="space-y-2">
                <Label>Expertise / Skills</Label>
                <div className="flex flex-wrap gap-2">
                  {formData.expertise.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="bg-gold-subtle text-gold-primary cursor-pointer hover:bg-gold-subtle/50"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add expertise..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddTag}
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* Current Focus */}
              <div className="space-y-2">
                <Label htmlFor="currentFocus">What are you working on?</Label>
                <Textarea
                  id="currentFocus"
                  value={formData.currentFocus}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentFocus: e.target.value }))}
                  placeholder="What's your current focus or project?"
                  rows={2}
                />
              </div>

              {/* Seeking / Offering */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="seekingSummary">What are you looking for?</Label>
                  <Textarea
                    id="seekingSummary"
                    value={formData.seekingSummary}
                    onChange={(e) => setFormData(prev => ({ ...prev, seekingSummary: e.target.value }))}
                    placeholder="Connections, advice, opportunities..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="offeringSummary">What can you offer?</Label>
                  <Textarea
                    id="offeringSummary"
                    value={formData.offeringSummary}
                    onChange={(e) => setFormData(prev => ({ ...prev, offeringSummary: e.target.value }))}
                    placeholder="How can you help others?"
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Photo Upload Encouragement */}
      {!formData.photoUrl && !isEditing && (
        <Card className="border-gold-primary/30 bg-gold-subtle/10">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-gold-subtle">
                <Camera className="h-5 w-5 text-gold-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-text-primary">
                  Add a profile photo
                </h3>
                <p className="text-sm text-text-secondary mt-1">
                  Profiles with photos get 3x more engagement.
                  Help others put a face to your name!
                </p>
                <Button
                  size="sm"
                  className="mt-3 bg-gold-primary hover:bg-gold-light"
                  onClick={() => setIsEditing(true)}
                >
                  Add Photo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

### 10. Guest Profile API

```typescript
// src/app/api/guest/events/[eventId]/profile/route.ts

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const ProfileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  photoUrl: z.string().url().nullable().optional(),
  role: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  expertise: z.array(z.string()).optional(),
  seekingSummary: z.string().nullable().optional(),
  offeringSummary: z.string().nullable().optional(),
  currentFocus: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is an attendee of this event
    const attendee = await prisma.eventAttendee.findFirst({
      where: {
        eventId: params.eventId,
        userId: user.id,
      },
    });

    if (!attendee) {
      return NextResponse.json({ error: 'Not an attendee' }, { status: 403 });
    }

    const body = await request.json();
    const data = ProfileUpdateSchema.parse(body);

    // Update the profile field on EventAttendee
    const currentProfile = (attendee.profile as Record<string, any>) || {};
    const updatedProfile = {
      ...currentProfile,
      ...data,
    };

    // Also update tradingCard for consistency
    const currentTradingCard = (attendee.tradingCard as Record<string, any>) || {};
    const updatedTradingCard = {
      ...currentTradingCard,
      name: data.name || currentTradingCard.name,
      photoUrl: data.photoUrl ?? currentTradingCard.photoUrl,
      headline: data.role
        ? `${data.role}${data.company ? ` @ ${data.company}` : ''}`
        : currentTradingCard.headline,
      expertise: data.expertise || currentTradingCard.expertise,
      currentFocus: data.currentFocus ?? currentTradingCard.currentFocus,
      seekingSummary: data.seekingSummary ?? currentTradingCard.seekingSummary,
      offeringSummary: data.offeringSummary ?? currentTradingCard.offeringSummary,
    };

    const updated = await prisma.eventAttendee.update({
      where: { id: attendee.id },
      data: {
        profile: updatedProfile,
        tradingCard: updatedTradingCard,
      },
    });

    return NextResponse.json({ success: true, attendee: updated });
  } catch (error) {
    console.error('Profile update error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const attendee = await prisma.eventAttendee.findFirst({
      where: {
        eventId: params.eventId,
        userId: user.id,
      },
      include: {
        event: {
          select: { id: true, name: true, eventDate: true }
        }
      }
    });

    if (!attendee) {
      return NextResponse.json({ error: 'Not an attendee' }, { status: 403 });
    }

    return NextResponse.json({ attendee });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

---

## User Experience

### First Visit After RSVP
1. Complete RSVP → Verify invite → Questionnaire → Phone verification
2. Redirected to `/rsvp/[token]/complete` with "Go to Dashboard" CTA
3. Dashboard shows profile card preview + "This is how you appear to others"
4. Encouraged to add photo if missing
5. Can browse to events list or edit profile

### Returning Visit
1. Log in (or already logged in via SSO)
2. Redirected to `/guest/events`
3. See list of all events they're invited to
4. Click event → see event details + actions
5. Can browse directory or edit profile from there

### Multi-Event User
1. Same user invited to multiple M33T events
2. Profile page shows event selector dropdown
3. Can maintain different profile data per event (via profileOverrides)
4. Or sync profile across events (future enhancement)

---

## Testing Strategy

### Unit Tests
```typescript
// __tests__/api/guest/profile.test.ts

describe('Guest Profile API', () => {
  it('should update profile for authenticated attendee', async () => {
    // Mock authenticated user who is an attendee
    const res = await PATCH(request, { params: { eventId: 'event-1' } });
    expect(res.status).toBe(200);
  });

  it('should reject non-attendees', async () => {
    // Mock authenticated user who is NOT an attendee
    const res = await PATCH(request, { params: { eventId: 'event-1' } });
    expect(res.status).toBe(403);
  });

  it('should validate profile data', async () => {
    // Invalid expertise (not an array)
    const res = await PATCH(request, {
      body: { expertise: 'not-an-array' }
    });
    expect(res.status).toBe(400);
  });
});
```

### E2E Tests
```typescript
// e2e/guest-dashboard.spec.ts

test.describe('Guest Dashboard', () => {
  test('can view events list', async ({ page }) => {
    await loginAsGuest(page);
    await page.goto('/guest/events');

    await expect(page.locator('h1')).toContainText('My Events');
    await expect(page.locator('[data-testid="event-card"]')).toHaveCount(1);
  });

  test('can edit profile', async ({ page }) => {
    await loginAsGuest(page);
    await page.goto('/guest/profile');

    await page.click('text=Edit');
    await page.fill('input[id="role"]', 'Software Engineer');
    await page.click('text=Save');

    await expect(page.locator('text=Profile updated!')).toBeVisible();
  });

  test('can navigate to event detail', async ({ page }) => {
    await loginAsGuest(page);
    await page.goto('/guest/events');

    await page.click('[data-testid="event-card"]');
    await expect(page.locator('text=Browse Attendees')).toBeVisible();
  });
});
```

---

## Security Considerations

### Access Control
- All `/guest/**` routes require authentication via middleware
- Profile API verifies user is attendee of the specific event
- Users can only edit their own profile data
- No cross-user data exposure

### Data Validation
- Zod schemas validate all input
- URL validation for photoUrl
- Array validation for expertise tags
- Sanitize user input before storage

### Rate Limiting
- Profile updates limited to 10/minute per user
- Photo uploads limited to 5/hour per user

---

## Documentation

### Files to Create
- `developer-guides/13-m33t-guest-dashboard-guide.md`

### CLAUDE.md Updates
Add section on Guest Dashboard patterns including:
- Route structure
- Profile data flow
- Event selector pattern
- Trading card integration

---

## Implementation Phases

### Phase 1: Layout & Events List
1. Create `/guest/layout.tsx` with GuestShell
2. Create `/guest/events/page.tsx` with EventCard
3. Wire up navigation between events list and details

### Phase 2: Event Detail Page
1. Create `/guest/events/[eventId]/page.tsx`
2. Add status display and action buttons
3. Add incomplete profile prompt

### Phase 3: Profile View/Edit
1. Create `/guest/profile/page.tsx`
2. Implement ProfileViewClient with edit mode
3. Create profile update API endpoint
4. Integrate TradingCard for preview

### Phase 4: Photo Upload
1. Add photo upload component
2. Integrate with storage (Uploadthing or similar)
3. Add photo encouragement messaging

### Phase 5: Polish
1. Add loading states and skeletons
2. Implement mobile responsive design
3. Add empty states
4. E2E testing

---

## Open Questions (Resolved)

All questions resolved from ideation doc:
- **Profile fields:** All displayed fields editable
- **Photo emphasis:** Encourage with prominent CTA
- **Multi-event:** Show event selector, maintain per-event profiles
- **Branding:** M33T-branded, separate from Better Contacts

---

## References

- Auth Foundation: `specs/m33t-invitee-experience-v1/02-specification.md`
- Ideation: `specs/m33t-invitee-experience-v1/01-ideation.md`
- TradingCard Component: `src/components/m33t/TradingCard.tsx`
- Profile Edit Modal: `src/components/m33t/AttendeeProfileEditModal.tsx`
- Design System: `src/lib/design-system.ts`
