'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  Bell,
  CalendarClock,
  Edit,
  ArrowLeft,
  Check,
  X,
  HelpCircle,
  Send,
  Trash2,
  ArrowUpDown,
  Link as LinkIcon,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { copyToClipboard } from '@/lib/utils';
import type { Profile, ProfileOverrides } from '@/lib/m33t/schemas';
import { mergeProfileWithOverrides } from '@/lib/m33t/profile-utils';
import { AttendeeProfileEditModal } from '@/components/m33t/AttendeeProfileEditModal';
import { AttendeeOrderModal } from '@/components/m33t/AttendeeOrderModal';
import { QuestionSetsManager, QuestionSetEditor } from '@/components/events/question-sets';
import { RsvpReminderDialog } from '@/components/m33t/RsvpReminderDialog';
import { EventReminderDialog } from '@/components/m33t/EventReminderDialog';
import { InviteDialog } from '@/components/m33t/InviteDialog';
import { NewRsvpsNotifyDialog } from '@/components/events/NewRsvpsNotifyDialog';
import { SMSHistoryPanel } from '@/components/m33t/sms';

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
  // Notification timestamps for eligibility calculation
  inviteSentAt: string | null;
  rsvpReminderSentAt: string | null;
  eventReminderSentAt: string | null;
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

interface QuestionSetData {
  id: string;
  internalId: string;
  title: string;
  description: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt: string | null;
  questions: import('@/lib/m33t/schemas').Question[];
  questionCount: number;
  completionStats: {
    total: number;
    completed: number;
    inProgress: number;
  };
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
  questionSets: QuestionSetData[];
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
  const [editingAttendeeId, setEditingAttendeeId] = useState<string | null>(null);
  const [deletingAttendeeId, setDeletingAttendeeId] = useState<string | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [questionSetView, setQuestionSetView] = useState<'list' | 'create' | string>('list');
  const [showRsvpReminderDialog, setShowRsvpReminderDialog] = useState(false);
  const [showEventReminderDialog, setShowEventReminderDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showNewRsvpsDialog, setShowNewRsvpsDialog] = useState(false);
  const [copyingLinkFor, setCopyingLinkFor] = useState<string | null>(null);
  const [smsHistoryAttendee, setSmsHistoryAttendee] = useState<{ id: string; name: string } | null>(null);

  const fetchEvent = useCallback(async () => {
    try {
      // Fetch event data and question sets in parallel
      const [eventRes, setsRes] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/events/${eventId}/question-sets`),
      ]);

      if (!eventRes.ok) throw new Error('Failed to fetch event');
      const eventData = await eventRes.json();

      // Question sets are optional - don't fail if API doesn't exist yet
      let questionSets: QuestionSetData[] = [];
      if (setsRes.ok) {
        const setsData = await setsRes.json();
        questionSets = setsData.questionSets || [];
      }

      setEvent({ ...eventData, questionSets });
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

  const handleCopyInviteLink = async (attendeeId: string, attendeeName: string) => {
    setCopyingLinkFor(attendeeId);
    try {
      const res = await fetch(`/api/events/${eventId}/attendees/${attendeeId}/invite-link`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to get invite link');
      }
      const data = await res.json();

      await copyToClipboard(data.url);

      toast.success(`Invite link copied for ${attendeeName}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to copy link');
    } finally {
      setCopyingLinkFor(null);
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

  // Calculate eligible counts for reminder buttons
  // RSVP Reminder: invited but not responded, haven't been reminded yet
  const eligibleForRsvpReminder = event.attendees.filter((a) =>
    a.inviteSentAt &&
    a.rsvpStatus === 'PENDING' &&
    !a.rsvpReminderSentAt
  ).length;

  // Event Reminder: confirmed attendees who haven't been reminded yet
  const eligibleForEventReminder = event.attendees.filter((a) =>
    a.rsvpStatus === 'CONFIRMED' &&
    !a.eventReminderSentAt
  ).length;

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
            onClick={() => setShowInviteDialog(true)}
            disabled={pendingCount === 0}
          >
            <Send className="w-4 h-4 mr-2" />
            Send Invitations ({pendingCount})
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowRsvpReminderDialog(true)}
            disabled={eligibleForRsvpReminder === 0}
          >
            <Bell className="w-4 h-4 mr-2" />
            RSVP Reminder ({eligibleForRsvpReminder})
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowEventReminderDialog(true)}
            disabled={eligibleForEventReminder === 0}
          >
            <CalendarClock className="w-4 h-4 mr-2" />
            Event Reminder ({eligibleForEventReminder})
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowNewRsvpsDialog(true)}
            disabled={confirmedCount === 0}
          >
            <Users className="w-4 h-4 mr-2" />
            New RSVPs Update
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

      {/* Question Sets Section */}
      <Card className="bg-bg-secondary border-border mb-6">
        <CardContent className="pt-6">
          {questionSetView === 'list' ? (
            <QuestionSetsManager
              eventId={eventId}
              questionSets={event.questionSets || []}
              onCreateSet={() => setQuestionSetView('create')}
              onEditSet={(setId) => setQuestionSetView(setId)}
            />
          ) : (
            <QuestionSetEditor
              eventId={eventId}
              questionSet={
                questionSetView !== 'create'
                  ? (event.questionSets || []).find((s) => s.id === questionSetView)
                  : undefined
              }
              onBack={() => {
                setQuestionSetView('list');
                fetchEvent(); // Refresh data when returning to list
              }}
            />
          )}
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
                // Merge base profile with organizer overrides, then fallback to linked contact
                const baseProfile = attendee.profile as Profile | null;
                const overrides = attendee.profileOverrides as ProfileOverrides | null;
                const profile = mergeProfileWithOverrides(baseProfile, overrides);
                const contact = attendee.contact;
                const role = profile?.role || contact?.title;
                const company = profile?.company || contact?.company;
                const expertise: string[] = profile?.expertise || (contact?.expertise ? contact.expertise.split(',').map((s: string) => s.trim()) : []);
                const currentFocus = profile?.currentFocus || contact?.whyNow;
                const cardSettings = event.cardSettings || {};

                return (
                  <div
                    key={attendee.id}
                    className="p-3 rounded-lg bg-bg-tertiary/50"
                  >
                    {/* Top row: Avatar + profile info + RSVP status */}
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-bg-tertiary text-gold-primary">
                          {getInitials(fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-text-primary font-medium truncate">{fullName}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            {RSVP_ICONS[attendee.rsvpStatus]}
                            <span className="text-sm text-text-secondary">{attendee.rsvpStatus}</span>
                          </div>
                        </div>
                        {/* Role and Company */}
                        {(cardSettings.role || cardSettings.company) && (role || company) && (
                          <p className="text-text-secondary text-sm truncate">
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
                    {/* Bottom row: badges + action buttons, aligned under profile text */}
                    <div className="flex items-center justify-between mt-2 ml-[3.25rem]">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        {attendee.overridesEditedBy && (
                          <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                            <Avatar className="h-5 w-5 shrink-0">
                              <AvatarFallback className="text-[10px] bg-gold-subtle text-gold-primary">
                                {getInitials(attendee.overridesEditedBy.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span>Edited by {attendee.overridesEditedBy.name}</span>
                          </div>
                        )}
                        {attendee.questionnaireCompletedAt && (
                          <Badge variant="outline" className="text-success border-success text-xs">
                            Profile Complete
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyInviteLink(attendee.id, fullName)}
                          disabled={copyingLinkFor === attendee.id}
                          className="text-text-tertiary hover:text-gold-primary h-8 w-8 p-0"
                          title="Copy invite link"
                        >
                          {copyingLinkFor === attendee.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <LinkIcon className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingAttendeeId(attendee.id)}
                          className="text-text-tertiary hover:text-gold-primary h-8 w-8 p-0"
                          title="Edit profile"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSmsHistoryAttendee({ id: attendee.id, name: fullName })}
                          className="text-text-tertiary hover:text-gold-primary h-8 w-8 p-0"
                          title="SMS History"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAttendee(attendee.id, fullName)}
                          disabled={deletingAttendeeId === attendee.id}
                          className="text-text-tertiary hover:text-error h-8 w-8 p-0"
                          title="Remove attendee"
                        >
                          {deletingAttendeeId === attendee.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
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

      {/* RSVP Reminder Dialog */}
      <RsvpReminderDialog
        isOpen={showRsvpReminderDialog}
        onClose={() => setShowRsvpReminderDialog(false)}
        eventId={eventId}
        eligibleCount={eligibleForRsvpReminder}
        onSuccess={fetchEvent}
      />

      {/* Event Reminder Dialog */}
      <EventReminderDialog
        isOpen={showEventReminderDialog}
        onClose={() => setShowEventReminderDialog(false)}
        eventId={eventId}
        eligibleCount={eligibleForEventReminder}
        onSuccess={fetchEvent}
      />

      {/* Invite Dialog with Channel Selection */}
      <InviteDialog
        isOpen={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        eventId={eventId}
        eligibleCount={pendingCount}
        onSuccess={fetchEvent}
      />

      {/* New RSVPs Notify Dialog */}
      <NewRsvpsNotifyDialog
        isOpen={showNewRsvpsDialog}
        onClose={() => setShowNewRsvpsDialog(false)}
        eventId={eventId}
        eventName={event.name}
        eventDate={eventDate}
      />

      {/* SMS History Panel */}
      {smsHistoryAttendee && (
        <SMSHistoryPanel
          eventId={eventId}
          attendeeId={smsHistoryAttendee.id}
          attendeeName={smsHistoryAttendee.name}
          onClose={() => setSmsHistoryAttendee(null)}
          onRetry={async (messageId) => {
            const response = await fetch(`/api/events/${eventId}/sms/${messageId}/retry`, {
              method: 'POST',
            });
            if (!response.ok) {
              const data = await response.json();
              toast.error(data.error || 'Failed to retry SMS');
            } else {
              toast.success('SMS retry sent successfully');
            }
          }}
        />
      )}
    </div>
  );
}
