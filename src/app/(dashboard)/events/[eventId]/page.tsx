'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Loader2,
  Calendar,
  Clock,
  MapPin,
  Users,
  Sparkles,
  // Bell, - removed, unused
  Edit,
  ArrowLeft,
  Check,
  X,
  HelpCircle,
  Send,
  Trash2,
  ArrowUpDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { Profile } from '@/lib/m33t/schemas';
import { AttendeeProfileEditModal } from '@/components/m33t/AttendeeProfileEditModal';
import { AttendeeOrderModal } from '@/components/m33t/AttendeeOrderModal';

interface AttendeeContact {
  id: string;
  firstName: string;
  lastName: string | null;
  primaryEmail: string | null;
  title: string | null;
  company: string | null;
  expertise: string | null;
  interests: string | null;
  whyNow: string | null;
}

interface AttendeeData {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  rsvpStatus: 'PENDING' | 'CONFIRMED' | 'MAYBE' | 'DECLINED';
  questionnaireCompletedAt: string | null;
  profile: Profile | null;
  profileOverrides: Record<string, unknown> | null;
  overridesEditedAt: string | null;
  contact: AttendeeContact | null;
  addedBy: { id: string; name: string } | null;
  overridesEditedBy: { id: string; name: string } | null;
}

interface CardSettings {
  role?: boolean;
  company?: boolean;
  expertise?: boolean;
  lookingFor?: boolean;
  canHelp?: boolean;
  whyNow?: boolean;
  conversationStarters?: boolean;
}

interface EventData {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  venueName: string;
  venueAddress: string;
  capacity: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  matchesPerAttendee: number;
  revealTiming: string;
  cardSettings: CardSettings;
  attendees: AttendeeData[];
  _count: {
    attendees: number;
    matches: number;
  };
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-bg-tertiary text-text-secondary',
  PUBLISHED: 'bg-gold-subtle text-gold-primary',
  ACTIVE: 'bg-success/20 text-success',
  COMPLETED: 'bg-blue-500/20 text-blue-400',
  CANCELLED: 'bg-error/20 text-error',
};

const RSVP_ICONS: Record<string, React.ReactNode> = {
  CONFIRMED: <Check className="w-4 h-4 text-success" />,
  DECLINED: <X className="w-4 h-4 text-error" />,
  MAYBE: <HelpCircle className="w-4 h-4 text-warning" />,
  PENDING: <Clock className="w-4 h-4 text-text-tertiary" />,
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function EventOverviewPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingNotifications, setSendingNotifications] = useState(false);
  const [editingAttendeeId, setEditingAttendeeId] = useState<string | null>(null);
  const [deletingAttendeeId, setDeletingAttendeeId] = useState<string | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  const fetchEvent = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}`);
      if (!res.ok) throw new Error('Failed to fetch event');
      const data = await res.json();
      setEvent(data);
    } catch (error) {
      toast.error('Failed to load event');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const handleSendInvitations = async () => {
    setSendingNotifications(true);
    try {
      const res = await fetch(`/api/events/${eventId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'invitation' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invitations');
      }

      toast.success(`Sent ${data.sent} invitations`);
      fetchEvent(); // Refresh to show updated status
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send invitations');
    } finally {
      setSendingNotifications(false);
    }
  };

  const handleDeleteAttendee = async (attendeeId: string, attendeeName: string) => {
    if (!confirm(`Are you sure you want to remove ${attendeeName} from this event?`)) {
      return;
    }

    setDeletingAttendeeId(attendeeId);
    try {
      const res = await fetch(`/api/events/${eventId}/attendees/${attendeeId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove attendee');
      }

      toast.success(`${attendeeName} has been removed`);
      fetchEvent(); // Refresh to show updated list
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove attendee');
    } finally {
      setDeletingAttendeeId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-secondary">Event not found</p>
      </div>
    );
  }

  const eventDate = new Date(event.date);
  const confirmedCount = event.attendees.filter((a) => a.rsvpStatus === 'CONFIRMED').length;
  const pendingCount = event.attendees.filter((a) => a.rsvpStatus === 'PENDING').length;
  const profilesComplete = event.attendees.filter((a) => a.questionnaireCompletedAt).length;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Back Button */}
      <Button variant="ghost" className="mb-4" onClick={() => router.push('/events')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        All Events
      </Button>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Badge className={STATUS_COLORS[event.status]}>{event.status}</Badge>
        </div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">{event.name}</h1>
        {event.tagline && <p className="text-lg text-text-secondary">{event.tagline}</p>}
      </div>

      {/* Event Details Card */}
      <Card className="bg-bg-secondary border-border mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start">
                <Calendar className="w-5 h-5 mr-3 text-gold-primary mt-0.5" />
                <div>
                  <p className="text-text-primary font-medium">
                    {format(eventDate, 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-text-secondary text-sm">
                    {event.startTime} - {event.endTime} ({event.timezone})
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <MapPin className="w-5 h-5 mr-3 text-gold-primary mt-0.5" />
                <div>
                  <p className="text-text-primary font-medium">{event.venueName}</p>
                  <p className="text-text-secondary text-sm">{event.venueAddress}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <Users className="w-5 h-5 mr-3 text-gold-primary" />
                <p className="text-text-primary">
                  Capacity: <span className="font-medium">{event.capacity}</span>
                </p>
              </div>

              <div className="flex items-center">
                <Sparkles className="w-5 h-5 mr-3 text-gold-primary" />
                <p className="text-text-primary">
                  Matches per attendee: <span className="font-medium">{event.matchesPerAttendee}</span>
                </p>
              </div>
            </div>
          </div>

          {event.description && (
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-text-secondary">{event.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-bg-secondary border-border">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-3xl font-bold text-text-primary">{event._count.attendees}</p>
            <p className="text-sm text-text-secondary">Total Attendees</p>
          </CardContent>
        </Card>

        <Card className="bg-bg-secondary border-border">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-3xl font-bold text-success">{confirmedCount}</p>
            <p className="text-sm text-text-secondary">Confirmed</p>
          </CardContent>
        </Card>

        <Card className="bg-bg-secondary border-border">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-3xl font-bold text-warning">{pendingCount}</p>
            <p className="text-sm text-text-secondary">Pending RSVP</p>
          </CardContent>
        </Card>

        <Card className="bg-bg-secondary border-border">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-3xl font-bold text-gold-primary">{event._count.matches}</p>
            <p className="text-sm text-text-secondary">Matches Created</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-bg-secondary border-border mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => router.push(`/events/${eventId}/edit`)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Event
          </Button>

          <Button
            variant="outline"
            onClick={handleSendInvitations}
            disabled={sendingNotifications || pendingCount === 0}
          >
            {sendingNotifications ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Send Invitations ({pendingCount})
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowOrderModal(true)}
          >
            <ArrowUpDown className="w-4 h-4 mr-2" />
            Reorder Attendees
          </Button>

          <Button
            className="bg-gold-primary hover:bg-gold-light text-bg-primary"
            onClick={() => router.push(`/events/${eventId}/matches`)}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Manage Matches
          </Button>
        </CardContent>
      </Card>

      {/* Attendee List */}
      <Card className="bg-bg-secondary border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Attendees</CardTitle>
              <CardDescription>
                {profilesComplete} of {confirmedCount} confirmed attendees have completed profiles
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/events/${eventId}/attendees/add`)}
            >
              Add Attendee
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {event.attendees.length === 0 ? (
            <p className="text-text-secondary text-center py-8">No attendees yet</p>
          ) : (
            <div className="space-y-2">
              {event.attendees.map((attendee) => {
                const fullName = `${attendee.firstName} ${attendee.lastName || ''}`.trim();
                // Get profile data from attendee.profile or fallback to linked contact
                // Profile follows canonical ProfileSchema from @/lib/m33t/schemas
                const profile = attendee.profile as Profile | null;
                const contact = attendee.contact;
                const role = profile?.role || contact?.title;
                const company = profile?.company || contact?.company;
                const expertise: string[] = profile?.expertise || (contact?.expertise ? contact.expertise.split(',').map((s: string) => s.trim()) : []);
                const currentFocus = profile?.currentFocus || contact?.whyNow;
                const cardSettings = event.cardSettings || {};

                return (
                  <div
                    key={attendee.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-bg-tertiary/50"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-bg-tertiary text-gold-primary">
                          {getInitials(fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-text-primary font-medium">{fullName}</p>
                        {/* Role and Company */}
                        {(cardSettings.role || cardSettings.company) && (role || company) && (
                          <p className="text-text-secondary text-sm">
                            {cardSettings.role && role && <span>{role}</span>}
                            {cardSettings.role && cardSettings.company && role && company && <span> @ </span>}
                            {cardSettings.company && company && <span>{company}</span>}
                          </p>
                        )}
                        {/* Expertise tags */}
                        {cardSettings.expertise && expertise.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {expertise.slice(0, 3).map((exp, i) => (
                              <span key={i} className="text-xs px-2 py-0.5 bg-gold-subtle rounded text-gold-primary">
                                {exp}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Current Focus (maps to whyNow in cardSettings) - max 150 chars for ~3 lines */}
                        {cardSettings.whyNow && currentFocus && (
                          <p className="text-xs text-gold-primary mt-1 italic">
                            {currentFocus.length > 150
                              ? `${currentFocus.slice(0, 150).trim()}...`
                              : currentFocus}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {attendee.overridesEditedBy && (
                        <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[10px] bg-gold-subtle text-gold-primary">
                              {getInitials(attendee.overridesEditedBy.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span>Edited by {attendee.overridesEditedBy.name}</span>
                        </div>
                      )}
                      {attendee.questionnaireCompletedAt && (
                        <Badge variant="outline" className="text-success border-success">
                          Profile Complete
                        </Badge>
                      )}
                      <div className="flex items-center gap-1">
                        {RSVP_ICONS[attendee.rsvpStatus]}
                        <span className="text-sm text-text-secondary">{attendee.rsvpStatus}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingAttendeeId(attendee.id)}
                        className="text-text-tertiary hover:text-gold-primary"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAttendee(attendee.id, fullName)}
                        disabled={deletingAttendeeId === attendee.id}
                        className="text-text-tertiary hover:text-error"
                      >
                        {deletingAttendeeId === attendee.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendee Profile Edit Modal */}
      {editingAttendeeId && (
        <AttendeeProfileEditModal
          eventId={eventId}
          attendeeId={editingAttendeeId}
          isOpen={!!editingAttendeeId}
          onClose={() => setEditingAttendeeId(null)}
          onSave={() => {
            setEditingAttendeeId(null);
            fetchEvent(); // Refresh to show updated data
          }}
        />
      )}

      {/* Attendee Order Modal */}
      <AttendeeOrderModal
        eventId={eventId}
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        onSave={() => {
          fetchEvent(); // Refresh to show updated order
        }}
      />
    </div>
  );
}
