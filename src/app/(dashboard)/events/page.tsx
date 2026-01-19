'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Loader2,
  Plus,
  Calendar,
  MapPin,
  Users,
  MoreHorizontal,
  Edit,
  Trash,
  Eye,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface EventData {
  id: string;
  name: string;
  tagline: string | null;
  date: string;
  startTime: string;
  venueName: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  _count: {
    attendees: number;
    matches: number;
  };
}

type StatusFilter = 'all' | 'DRAFT' | 'PUBLISHED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-bg-tertiary text-text-secondary',
  PUBLISHED: 'bg-gold-subtle text-gold-primary',
  ACTIVE: 'bg-success/20 text-success',
  COMPLETED: 'bg-blue-500/20 text-blue-400',
  CANCELLED: 'bg-error/20 text-error',
};

function EventCard({
  event,
  onDelete,
}: {
  event: EventData;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const eventDate = new Date(event.date);
  const isPast = eventDate < new Date();

  return (
    <Card className="bg-bg-secondary border-border hover:border-gold-primary/30 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={STATUS_COLORS[event.status]}>{event.status}</Badge>
              {isPast && event.status !== 'COMPLETED' && event.status !== 'CANCELLED' && (
                <Badge variant="outline" className="text-warning border-warning">
                  Past
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg truncate">{event.name}</CardTitle>
            {event.tagline && (
              <CardDescription className="truncate">{event.tagline}</CardDescription>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/events/${event.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/events/${event.id}/edit`)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Event
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/events/${event.id}/matches`)}>
                <Sparkles className="mr-2 h-4 w-4" />
                Manage Matches
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-error focus:text-error"
                onClick={() => onDelete(event.id)}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-text-secondary">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-2 text-gold-primary" />
            <span>{format(eventDate, 'MMM d, yyyy')} at {event.startTime}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-2 text-gold-primary" />
            <span className="truncate">{event.venueName}</span>
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-2 text-gold-primary" />
            <span>{event._count.attendees} attendees • {event._count.matches} matches</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => router.push(`/events/${event.id}`)}
          >
            View
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-gold-primary hover:bg-gold-light text-bg-primary"
            onClick={() => router.push(`/events/${event.id}/matches`)}
          >
            Matches
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EventsListPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    async function fetchEvents() {
      try {
        const url = statusFilter === 'all' ? '/api/events' : `/api/events?status=${statusFilter}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch events');
        const data = await res.json();
        setEvents(data);
      } catch (error) {
        toast.error('Failed to load events');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, [statusFilter]);

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/events/${eventId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete event');

      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      toast.success('Event deleted');
    } catch (error) {
      toast.error('Failed to delete event');
    }
  };

  const filteredEvents =
    statusFilter === 'all' ? events : events.filter((e) => e.status === statusFilter);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Events</h1>
          <p className="text-text-secondary">Manage your networking events</p>
        </div>
        <Button
          onClick={() => router.push('/events/new')}
          className="bg-gold-primary hover:bg-gold-light text-bg-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[180px] bg-bg-secondary">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <Card className="bg-bg-secondary border-border">
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 text-gold-primary mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-text-primary mb-2">No events yet</h3>
            <p className="text-text-secondary mb-4">Create your first networking event</p>
            <Button
              onClick={() => router.push('/events/new')}
              className="bg-gold-primary hover:bg-gold-light text-bg-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
