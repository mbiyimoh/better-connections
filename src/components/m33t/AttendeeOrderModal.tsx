'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GripVertical, Pin, PinOff, Loader2, ChevronDown, Sparkles, ArrowUpDown, Calendar } from 'lucide-react';

interface AttendeeOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onSave: () => void;
}

interface OrderedAttendee {
  id: string;
  name: string;
  email: string | null;
  rsvpStatus: string;
  displayOrder: number | null;
  profileRichness: number;
  profile: {
    role?: string;
    company?: string;
  };
}

interface SortableAttendeeItemProps {
  attendee: OrderedAttendee;
  onTogglePin: (id: string) => void;
  isPinned: boolean;
  index: number;
}

function SortableAttendeeItem({ attendee, onTogglePin, isPinned, index }: SortableAttendeeItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: attendee.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getRsvpColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-emerald-500/20 text-emerald-400';
      case 'MAYBE': return 'bg-amber-500/20 text-amber-400';
      default: return 'bg-zinc-500/20 text-zinc-400';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        isDragging
          ? 'bg-zinc-800 border-gold-primary shadow-lg z-50'
          : isPinned
            ? 'bg-gold-subtle/30 border-gold-primary/30'
            : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
      }`}
    >
      {/* Drag handle */}
      <button
        className="cursor-grab active:cursor-grabbing text-zinc-500 hover:text-zinc-300 touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-5 h-5" />
      </button>

      {/* Position indicator */}
      <div className="w-8 text-center">
        <span className={`text-sm font-medium ${isPinned ? 'text-gold-primary' : 'text-zinc-500'}`}>
          {index + 1}
        </span>
      </div>

      {/* Attendee info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white truncate">{attendee.name}</span>
          <Badge variant="outline" className={`text-xs ${getRsvpColor(attendee.rsvpStatus)}`}>
            {attendee.rsvpStatus.toLowerCase()}
          </Badge>
        </div>
        {(attendee.profile.role || attendee.profile.company) && (
          <p className="text-sm text-zinc-400 truncate">
            {[attendee.profile.role, attendee.profile.company].filter(Boolean).join(' at ')}
          </p>
        )}
      </div>

      {/* Richness score */}
      <div className="flex items-center gap-1 text-sm">
        <Sparkles className="w-4 h-4 text-gold-primary" />
        <span className="text-zinc-400">{attendee.profileRichness}</span>
      </div>

      {/* Pin toggle */}
      <button
        onClick={() => onTogglePin(attendee.id)}
        className={`p-1.5 rounded transition-colors ${
          isPinned
            ? 'text-gold-primary hover:text-gold-light'
            : 'text-zinc-500 hover:text-zinc-300'
        }`}
        title={isPinned ? 'Unpin (use auto-sort)' : 'Pin position'}
      >
        {isPinned ? <Pin className="w-4 h-4 fill-current" /> : <PinOff className="w-4 h-4" />}
      </button>
    </div>
  );
}

export function AttendeeOrderModal({
  isOpen,
  onClose,
  eventId,
  onSave,
}: AttendeeOrderModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attendees, setAttendees] = useState<OrderedAttendee[]>([]);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch attendee order
  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/attendee-order`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();

      setAttendees(data.attendees);
      setPinnedIds(new Set(
        data.attendees
          .filter((a: OrderedAttendee) => a.displayOrder !== null)
          .map((a: OrderedAttendee) => a.id)
      ));
      setHasChanges(false);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load attendee order');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (isOpen) {
      fetchOrder();
    }
  }, [isOpen, fetchOrder]);

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setAttendees((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        // When dragging, auto-pin the dragged item at its new position
        setPinnedIds((prev) => new Set([...prev, active.id as string]));
        setHasChanges(true);

        return newItems;
      });
    }
  };

  // Toggle pin status
  const handleTogglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      setHasChanges(true);
      return next;
    });
  };

  // Auto-sort options
  const handleAutoSort = async (sortBy: 'richness' | 'name' | 'rsvp-date') => {
    try {
      const res = await fetch(`/api/events/${eventId}/attendee-order/auto-sort`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortBy }),
      });

      if (!res.ok) throw new Error('Failed to sort');

      toast.success(`Sorted by ${sortBy === 'richness' ? 'profile richness' : sortBy === 'name' ? 'name' : 'RSVP date'}`);
      await fetchOrder();
    } catch (error) {
      console.error('Error auto-sorting:', error);
      toast.error('Failed to sort attendees');
    }
  };

  // Save changes
  const handleSave = async () => {
    setSaving(true);
    try {
      // Build orders array with pinned positions
      const orders = attendees.map((attendee, index) => ({
        attendeeId: attendee.id,
        displayOrder: pinnedIds.has(attendee.id) ? index : null,
      }));

      const res = await fetch(`/api/events/${eventId}/attendee-order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders }),
      });

      if (!res.ok) throw new Error('Failed to save');

      toast.success('Attendee order saved');
      setHasChanges(false);
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving order:', error);
      toast.error('Failed to save order');
    } finally {
      setSaving(false);
    }
  };

  const pinnedCount = pinnedIds.size;
  const autoSortedCount = attendees.length - pinnedCount;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">
            Customize Attendee Order
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Drag to reorder attendees. Pinned attendees stay fixed, unpinned ones auto-sort by profile richness.
          </DialogDescription>
        </DialogHeader>

        {/* Stats and actions bar */}
        <div className="flex items-center justify-between py-2 border-b border-zinc-800">
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <span className="flex items-center gap-1">
              <Pin className="w-4 h-4 text-gold-primary" />
              {pinnedCount} pinned
            </span>
            <span className="flex items-center gap-1">
              <ArrowUpDown className="w-4 h-4" />
              {autoSortedCount} auto-sorted
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                Auto-sort All
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
              <DropdownMenuItem
                onClick={() => handleAutoSort('richness')}
                className="gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-gold-primary" />
                By Profile Richness
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleAutoSort('name')}
                className="gap-2 cursor-pointer"
              >
                <ArrowUpDown className="w-4 h-4" />
                By Name (A-Z)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleAutoSort('rsvp-date')}
                className="gap-2 cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                By RSVP Date
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Attendee list */}
        <div className="flex-1 overflow-y-auto py-2 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gold-primary" />
            </div>
          ) : attendees.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              No attendees to reorder
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={attendees.map((a) => a.id)}
                strategy={verticalListSortingStrategy}
              >
                {attendees.map((attendee, index) => (
                  <SortableAttendeeItem
                    key={attendee.id}
                    attendee={attendee}
                    onTogglePin={handleTogglePin}
                    isPinned={pinnedIds.has(attendee.id)}
                    index={index}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="bg-gold-primary hover:bg-gold-light text-black"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Order'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
