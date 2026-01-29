'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  RefreshCw,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Users,
  MessageCircle,
  Target,
  Send,
  UserPlus,
} from 'lucide-react';
import { MatchRevealDialog } from '@/components/m33t/MatchRevealDialog';
import { ManualMatchDialog } from '@/components/m33t/ManualMatchDialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import type { Profile } from '@/lib/m33t/schemas';

interface MatchData {
  id: string;
  position: number;
  score: number;
  whyMatch: string[];
  conversationStarters: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVEALED';
  isManual: boolean;
  curatorNotes: string | null;
  attendee: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
    profile: Profile | null;
  };
  matchedWith: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
    profile: Profile | null;
  };
}

interface EventData {
  id: string;
  name: string;
  matchesPerAttendee: number;
  status: string;
  _count: {
    attendees: number;
    matches: number;
  };
}

interface AttendeeData {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  rsvpStatus: string;
  matchRevealSentAt: string | null;
  _count?: {
    matches: number;
  };
}

type StatusFilter = 'all' | 'PENDING' | 'APPROVED' | 'REJECTED';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function MatchCard({
  match,
  onApprove,
  onReject,
  isLoading,
}: {
  match: MatchData;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isLoading: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const matchedWith = match.matchedWith;
  const profile = matchedWith.profile;
  const fullName = `${matchedWith.firstName} ${matchedWith.lastName || ''}`.trim();

  return (
    <Card className="bg-bg-tertiary/50 border-border">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Position badge */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gold-subtle flex items-center justify-center">
            <span className="text-sm font-semibold text-gold-primary">#{match.position}</span>
          </div>

          {/* Avatar */}
          <Avatar className="h-12 w-12">
            <AvatarImage src={profile?.photoUrl || undefined} alt={fullName} />
            <AvatarFallback className="bg-bg-tertiary text-gold-primary">
              {getInitials(fullName)}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-text-primary truncate">{fullName}</h4>
              {match.isManual && (
                <Badge variant="outline" className="text-xs">
                  Manual
                </Badge>
              )}
              <Badge
                variant={
                  match.status === 'APPROVED'
                    ? 'default'
                    : match.status === 'REJECTED'
                      ? 'destructive'
                      : 'secondary'
                }
                className="text-xs"
              >
                {match.status}
              </Badge>
            </div>
            {profile?.role && (
              <p className="text-sm text-text-secondary">
                {profile.role}
                {profile.company && ` at ${profile.company}`}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-text-tertiary">Score: {match.score}</span>
              {profile?.expertise && profile.expertise.length > 0 && (
                <div className="flex gap-1">
                  {profile.expertise.slice(0, 2).map((skill, i) => (
                    <Badge key={i} variant="outline" className="text-xs py-0">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {match.status === 'PENDING' && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-success hover:text-success hover:bg-success/10"
                  onClick={() => onApprove(match.id)}
                  disabled={isLoading}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-error hover:text-error hover:bg-error/10"
                  onClick={() => onReject(match.id)}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-border space-y-4">
                {/* Why Match */}
                {match.whyMatch.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-2 flex items-center">
                      <Target className="w-3.5 h-3.5 mr-1.5" />
                      Why This Match
                    </h5>
                    <ul className="space-y-1">
                      {match.whyMatch.map((reason, i) => (
                        <li key={i} className="text-sm text-text-secondary flex items-start">
                          <span className="text-gold-primary mr-2">•</span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Conversation Starters */}
                {match.conversationStarters.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-2 flex items-center">
                      <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                      Conversation Starters
                    </h5>
                    <ul className="space-y-1">
                      {match.conversationStarters.map((starter, i) => (
                        <li key={i} className="text-sm text-text-secondary italic">
                          &ldquo;{starter}&rdquo;
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Curator Notes */}
                {match.curatorNotes && (
                  <div>
                    <h5 className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-1">
                      Notes
                    </h5>
                    <p className="text-sm text-text-secondary">{match.curatorNotes}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

function AttendeeMatchGroup({
  attendeeName,
  matches,
  onApprove,
  onReject,
  loadingMatchId,
}: {
  attendeeId: string; // Required for key prop in parent
  attendeeName: string;
  matches: MatchData[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  loadingMatchId: string | null;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const pendingCount = matches.filter((m) => m.status === 'PENDING').length;
  const approvedCount = matches.filter((m) => m.status === 'APPROVED').length;

  return (
    <Card className="bg-bg-secondary border-border">
      <CardHeader
        className="cursor-pointer hover:bg-bg-tertiary/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-bg-tertiary text-gold-primary">
                {getInitials(attendeeName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{attendeeName}</CardTitle>
              <CardDescription>
                {matches.length} matches • {approvedCount} approved • {pendingCount} pending
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <Badge variant="secondary" className="bg-warning/20 text-warning">
                {pendingCount} to review
              </Badge>
            )}
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="pt-0 space-y-3">
              {matches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onApprove={onApprove}
                  onReject={onReject}
                  isLoading={loadingMatchId === match.id}
                />
              ))}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default function MatchCurationPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [attendees, setAttendees] = useState<AttendeeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loadingMatchId, setLoadingMatchId] = useState<string | null>(null);
  const [showRevealDialog, setShowRevealDialog] = useState(false);
  const [showManualMatchDialog, setShowManualMatchDialog] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [eventRes, matchesRes] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/events/${eventId}/matches`),
      ]);

      if (!eventRes.ok || !matchesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [eventData, matchesData] = await Promise.all([eventRes.json(), matchesRes.json()]);

      setEvent(eventData);
      setMatches(matchesData);
      // Extract attendees from event data for dialogs
      if (eventData.attendees) {
        setAttendees(eventData.attendees);
      }
    } catch (error) {
      toast.error('Failed to load match data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerateMatches = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/events/${eventId}/matches/generate`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate matches');
      }

      toast.success(`Generated ${data.generated} matches for ${data.attendeesMatched} attendees`);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate matches');
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateMatch = async (matchId: string, status: 'APPROVED' | 'REJECTED') => {
    setLoadingMatchId(matchId);
    try {
      const res = await fetch(`/api/events/${eventId}/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        throw new Error('Failed to update match');
      }

      // Update local state
      setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, status } : m)));

      toast.success(`Match ${status.toLowerCase()}`);
    } catch {
      toast.error('Failed to update match');
    } finally {
      setLoadingMatchId(null);
    }
  };

  const handleBulkApprove = async () => {
    const pendingMatches = matches.filter((m) => m.status === 'PENDING');
    if (pendingMatches.length === 0) {
      toast.info('No pending matches to approve');
      return;
    }

    setGenerating(true);
    try {
      await Promise.all(
        pendingMatches.map((m) =>
          fetch(`/api/events/${eventId}/matches/${m.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'APPROVED' }),
          })
        )
      );

      toast.success(`Approved ${pendingMatches.length} matches`);
      fetchData();
    } catch {
      toast.error('Failed to bulk approve');
    } finally {
      setGenerating(false);
    }
  };

  // Group matches by attendee
  const filteredMatches =
    statusFilter === 'all' ? matches : matches.filter((m) => m.status === statusFilter);

  const matchesByAttendee = filteredMatches.reduce(
    (acc, match) => {
      const key = match.attendee.id;
      if (!acc[key]) {
        acc[key] = {
          attendeeName: `${match.attendee.firstName} ${match.attendee.lastName || ''}`.trim(),
          matches: [],
        };
      }
      acc[key].matches.push(match);
      return acc;
    },
    {} as Record<string, { attendeeName: string; matches: MatchData[] }>
  );

  // Stats
  const totalMatches = matches.length;
  const pendingCount = matches.filter((m) => m.status === 'PENDING').length;
  const approvedCount = matches.filter((m) => m.status === 'APPROVED').length;
  const rejectedCount = matches.filter((m) => m.status === 'REJECTED').length;

  // Calculate eligible attendees for match reveal:
  // - Must be CONFIRMED
  // - Must have at least one APPROVED match
  // - Must not have already received reveal notification
  const eligibleForReveal = attendees.filter((a) => {
    if (a.rsvpStatus !== 'CONFIRMED') return false;
    if (a.matchRevealSentAt) return false;
    // Check if they have approved matches
    const hasApprovedMatches = matches.some(
      (m) => m.attendee.id === a.id && m.status === 'APPROVED'
    );
    return hasApprovedMatches;
  }).length;

  // Attendee options for manual match dialog
  const attendeeOptions = attendees
    .filter((a) => a.rsvpStatus === 'CONFIRMED')
    .map((a) => ({
      id: a.id,
      name: `${a.firstName} ${a.lastName || ''}`.trim(),
      email: a.email,
    }));

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

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary mb-2">Curate Connections</h1>
        <p className="text-text-secondary">{event.name}</p>
      </div>

      {/* Stats & Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-bg-secondary border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-gold-primary" />
              <div>
                <p className="text-2xl font-bold text-text-primary">{totalMatches}</p>
                <p className="text-xs text-text-secondary">Total Matches</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-bg-secondary border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-warning/20 flex items-center justify-center">
                <span className="text-xs text-warning font-bold">{pendingCount}</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-warning">{pendingCount}</p>
                <p className="text-xs text-text-secondary">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-bg-secondary border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-success" />
              <div>
                <p className="text-2xl font-bold text-success">{approvedCount}</p>
                <p className="text-xs text-text-secondary">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-bg-secondary border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <X className="w-5 h-5 text-error" />
              <div>
                <p className="text-2xl font-bold text-error">{rejectedCount}</p>
                <p className="text-xs text-text-secondary">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[140px] bg-bg-secondary">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Button variant="outline" onClick={handleBulkApprove} disabled={generating}>
              <Check className="w-4 h-4 mr-2" />
              Approve All ({pendingCount})
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => setShowManualMatchDialog(true)}
            disabled={attendeeOptions.length < 2}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Match
          </Button>

          {approvedCount > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowRevealDialog(true)}
              disabled={eligibleForReveal === 0}
              className="border-gold-primary/50 text-gold-primary hover:bg-gold-subtle"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Reveals ({eligibleForReveal})
            </Button>
          )}

          <Button
            onClick={handleGenerateMatches}
            disabled={generating}
            className="bg-gold-primary hover:bg-gold-light text-bg-primary"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {totalMatches > 0 ? 'Regenerate Matches' : 'Generate Matches'}
          </Button>

          <Button variant="ghost" size="icon" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Match Groups */}
      {Object.keys(matchesByAttendee).length === 0 ? (
        <Card className="bg-bg-secondary border-border">
          <CardContent className="py-12 text-center">
            <Sparkles className="w-12 h-12 text-gold-primary mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-text-primary mb-2">No matches yet</h3>
            <p className="text-text-secondary mb-4">
              Generate matches once you have at least 2 confirmed attendees with completed profiles.
            </p>
            <Button
              onClick={handleGenerateMatches}
              disabled={generating}
              className="bg-gold-primary hover:bg-gold-light text-bg-primary"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Generate Matches
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(matchesByAttendee).map(([attendeeId, { attendeeName, matches }]) => (
            <AttendeeMatchGroup
              key={attendeeId}
              attendeeId={attendeeId}
              attendeeName={attendeeName}
              matches={matches.sort((a, b) => a.position - b.position)}
              onApprove={(id) => handleUpdateMatch(id, 'APPROVED')}
              onReject={(id) => handleUpdateMatch(id, 'REJECTED')}
              loadingMatchId={loadingMatchId}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <MatchRevealDialog
        isOpen={showRevealDialog}
        onClose={() => setShowRevealDialog(false)}
        eventId={eventId}
        eligibleCount={eligibleForReveal}
        onSuccess={fetchData}
      />

      <ManualMatchDialog
        isOpen={showManualMatchDialog}
        onClose={() => setShowManualMatchDialog(false)}
        eventId={eventId}
        attendees={attendeeOptions}
        onSuccess={fetchData}
      />
    </div>
  );
}
