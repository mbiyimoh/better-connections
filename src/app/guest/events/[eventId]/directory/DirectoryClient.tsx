'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, X } from 'lucide-react';
import type { RSVPStatus } from '@prisma/client';

interface AttendeeData {
  id: string;
  firstName: string;
  lastName?: string | null;
  rsvpStatus: RSVPStatus;
  profile: Record<string, unknown> | null;
  tradingCard: Record<string, unknown> | null;
  isCurrentUser: boolean;
}

interface DirectoryClientProps {
  attendees: AttendeeData[];
  eventId: string;
  currentUserId: string;
}

const statusColors: Record<RSVPStatus, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-zinc-500/20', text: 'text-zinc-400' },
  CONFIRMED: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  MAYBE: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  DECLINED: { bg: 'bg-red-500/20', text: 'text-red-400' },
};

const statusLabels: Record<RSVPStatus, string> = {
  PENDING: 'Invited',
  CONFIRMED: 'Confirmed',
  MAYBE: 'Maybe',
  DECLINED: 'Declined',
};

export function DirectoryClient({
  attendees,
  eventId,
  currentUserId,
}: DirectoryClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAttendee, setSelectedAttendee] = useState<AttendeeData | null>(null);
  const [statusFilter, setStatusFilter] = useState<RSVPStatus | 'ALL'>('ALL');

  // Filter attendees based on search and status
  const filteredAttendees = attendees.filter((attendee) => {
    // Extract typed values for safe comparison
    const role = typeof attendee.profile?.role === 'string' ? attendee.profile.role : '';
    const company = typeof attendee.profile?.company === 'string' ? attendee.profile.company : '';
    const expertise = Array.isArray(attendee.tradingCard?.expertise)
      ? (attendee.tradingCard.expertise as string[])
      : [];

    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === '' ||
      `${attendee.firstName} ${attendee.lastName || ''}`.toLowerCase().includes(searchLower) ||
      role.toLowerCase().includes(searchLower) ||
      company.toLowerCase().includes(searchLower) ||
      expertise.some((e) => e.toLowerCase().includes(searchLower));

    const matchesStatus = statusFilter === 'ALL' || attendee.rsvpStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Count by status
  const statusCounts = {
    ALL: attendees.length,
    CONFIRMED: attendees.filter((a) => a.rsvpStatus === 'CONFIRMED').length,
    MAYBE: attendees.filter((a) => a.rsvpStatus === 'MAYBE').length,
    PENDING: attendees.filter((a) => a.rsvpStatus === 'PENDING').length,
  };

  return (
    <>
      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, role, company, or expertise..."
            className="pl-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['ALL', 'CONFIRMED', 'MAYBE', 'PENDING'] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className="gap-2"
            >
              {status === 'ALL' ? 'All' : statusLabels[status]}
              <span className="text-xs opacity-70">({statusCounts[status]})</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Attendee Grid */}
      {filteredAttendees.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-secondary">No attendees match your search.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAttendees.map((attendee) => (
            <AttendeeCard
              key={attendee.id}
              attendee={attendee}
              onClick={() => setSelectedAttendee(attendee)}
            />
          ))}
        </div>
      )}

      {/* Profile Modal */}
      <Dialog open={!!selectedAttendee} onOpenChange={() => setSelectedAttendee(null)}>
        <DialogContent className="max-w-lg">
          {selectedAttendee && (
            <ProfileModalContent
              attendee={selectedAttendee}
              statusColors={statusColors}
              statusLabels={statusLabels}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProfileModalContent({
  attendee,
  statusColors,
  statusLabels,
}: {
  attendee: AttendeeData;
  statusColors: Record<RSVPStatus, { bg: string; text: string }>;
  statusLabels: Record<RSVPStatus, string>;
}) {
  // Extract typed values from JSON fields
  const role = typeof attendee.profile?.role === 'string' ? attendee.profile.role : null;
  const company = typeof attendee.profile?.company === 'string' ? attendee.profile.company : null;
  const location = typeof attendee.profile?.location === 'string' ? attendee.profile.location : null;
  const expertise = Array.isArray(attendee.tradingCard?.expertise)
    ? (attendee.tradingCard.expertise as string[])
    : [];
  const currentFocus = typeof attendee.tradingCard?.currentFocus === 'string'
    ? attendee.tradingCard.currentFocus
    : null;
  const seeking = typeof attendee.tradingCard?.seeking === 'string'
    ? attendee.tradingCard.seeking
    : null;
  const offering = typeof attendee.tradingCard?.offering === 'string'
    ? attendee.tradingCard.offering
    : null;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gold-subtle flex items-center justify-center text-xl font-bold text-gold-primary">
            {attendee.firstName?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              {attendee.firstName} {attendee.lastName}
              {attendee.isCurrentUser && (
                <Badge variant="outline" className="text-xs">You</Badge>
              )}
            </div>
            {(role || company) && (
              <p className="text-sm text-text-secondary font-normal">
                {role}
                {role && company && ' at '}
                {company}
              </p>
            )}
          </div>
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 mt-4">
        {location && (
          <div>
            <p className="text-sm text-text-tertiary mb-1">Location</p>
            <p className="text-sm">{location}</p>
          </div>
        )}

        {expertise.length > 0 && (
          <div>
            <p className="text-sm text-text-tertiary mb-2">Expertise</p>
            <div className="flex flex-wrap gap-2">
              {expertise.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {currentFocus && (
          <div>
            <p className="text-sm text-text-tertiary mb-1">Current Focus</p>
            <p className="text-sm">{currentFocus}</p>
          </div>
        )}

        {seeking && (
          <div>
            <p className="text-sm text-text-tertiary mb-1">Looking For</p>
            <p className="text-sm">{seeking}</p>
          </div>
        )}

        {offering && (
          <div>
            <p className="text-sm text-text-tertiary mb-1">Can Offer</p>
            <p className="text-sm">{offering}</p>
          </div>
        )}

        {/* RSVP Status */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-tertiary">RSVP Status</span>
            <Badge
              className={`${statusColors[attendee.rsvpStatus].bg} ${statusColors[attendee.rsvpStatus].text} border-0`}
            >
              {statusLabels[attendee.rsvpStatus]}
            </Badge>
          </div>
        </div>
      </div>
    </>
  );
}

function AttendeeCard({
  attendee,
  onClick,
}: {
  attendee: AttendeeData;
  onClick: () => void;
}) {
  const status = statusColors[attendee.rsvpStatus];
  const role = attendee.profile?.role as string | undefined;
  const company = attendee.profile?.company as string | undefined;
  const expertise = (attendee.tradingCard?.expertise as string[]) || [];

  return (
    <Card
      className="p-4 hover:border-gold-primary transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gold-subtle flex items-center justify-center text-lg font-bold text-gold-primary flex-shrink-0">
          {attendee.firstName?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-text-primary truncate">
              {attendee.firstName} {attendee.lastName}
            </h3>
            {attendee.isCurrentUser && (
              <Badge variant="outline" className="text-xs flex-shrink-0">You</Badge>
            )}
          </div>
          {(role || company) && (
            <p className="text-sm text-text-secondary truncate">
              {role}
              {role && company && ' at '}
              {company}
            </p>
          )}
          {expertise.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {expertise.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {expertise.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{expertise.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
        <Badge className={`${status.bg} ${status.text} border-0 flex-shrink-0`}>
          {statusLabels[attendee.rsvpStatus]}
        </Badge>
      </div>
    </Card>
  );
}
