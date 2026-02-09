'use client';

import { useState, useEffect, useMemo } from 'react';
import { AlertCircle, Loader2, Check, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatRelativeDate } from '@/lib/m33t/question-formatting';

interface AttendeePreview {
  id: string;
  name: string;
  newRsvpCount: number;
  isEligible: boolean;
}

interface PreviewData {
  eligibleCount: number;
  skippedCount: number;
  sampleNewCount: number;
  lastSentAt: string | null;
  attendees: AttendeePreview[];
}

interface NewRsvpsNotifyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  eventDate: Date;
}

export function NewRsvpsNotifyDialog({
  isOpen,
  onClose,
  eventId,
  eventName,
  eventDate,
}: NewRsvpsNotifyDialogProps) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Get eligible attendees only
  const eligibleAttendees = useMemo(() => {
    return preview?.attendees.filter((a) => a.isEligible) ?? [];
  }, [preview?.attendees]);

  // Fetch preview when dialog opens
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch(`/api/events/${eventId}/notify/preview?type=new_rsvps`)
        .then((res) => res.json())
        .then((data: PreviewData) => {
          setPreview(data);
          // Select all eligible attendees by default
          const eligibleIds = data.attendees
            .filter((a) => a.isEligible)
            .map((a) => a.id);
          setSelectedIds(new Set(eligibleIds));
        })
        .catch(() => toast.error('Failed to load preview'))
        .finally(() => setLoading(false));
    } else {
      // Reset state when dialog closes
      setPreview(null);
      setSelectedIds(new Set());
    }
  }, [isOpen, eventId]);

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const eligibleIds = eligibleAttendees.map((a) => a.id);
    setSelectedIds(new Set(eligibleIds));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // Check selection state for the header checkbox
  const allSelected = eligibleAttendees.length > 0 && selectedIds.size === eligibleAttendees.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < eligibleAttendees.length;

  const handleHeaderCheckbox = () => {
    if (allSelected || someSelected) {
      handleDeselectAll();
    } else {
      handleSelectAll();
    }
  };

  const handleSend = async () => {
    if (selectedIds.size === 0) {
      toast.error('Select at least one attendee');
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/events/${eventId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_rsvps',
          channels: 'sms',
          attendeeIds: Array.from(selectedIds),
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to send');
      }

      toast.success(`Sent to ${result.sent} attendees`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send notifications');
    } finally {
      setSending(false);
    }
  };

  const lastSentAt = preview?.lastSentAt ? new Date(preview.lastSentAt) : null;
  const showWarning = lastSentAt && Date.now() - lastSentAt.getTime() < 24 * 60 * 60 * 1000;
  const formattedDate = eventDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  // Get sample count from first selected attendee for preview
  const selectedSampleCount = useMemo(() => {
    if (selectedIds.size === 0) return 0;
    const firstSelectedId = Array.from(selectedIds)[0];
    const attendee = preview?.attendees.find((a) => a.id === firstSelectedId);
    return attendee?.newRsvpCount ?? preview?.sampleNewCount ?? 0;
  }, [selectedIds, preview]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send New RSVPs Update</DialogTitle>
          <DialogDescription>
            Select which attendees to notify about new RSVPs since they joined.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
          </div>
        ) : preview ? (
          <div className="space-y-4">
            {/* Warning if sent recently */}
            {showWarning && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-200">
                  You sent this notification {formatRelativeDate(lastSentAt!.toISOString())}.
                  Sending again may cause notification fatigue.
                </p>
              </div>
            )}

            {/* Attendee selection list */}
            {eligibleAttendees.length > 0 ? (
              <div className="space-y-2">
                {/* Header with select all */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleHeaderCheckbox}
                    className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <div className="flex h-4 w-4 items-center justify-center rounded-sm border border-primary">
                      {allSelected && <Check className="h-3 w-3" />}
                      {someSelected && <Minus className="h-3 w-3" />}
                    </div>
                    <span>
                      {allSelected ? 'Deselect all' : someSelected ? `${selectedIds.size} selected` : 'Select all'}
                    </span>
                  </button>
                  <span className="text-xs text-text-tertiary">
                    {selectedIds.size} of {eligibleAttendees.length} selected
                  </span>
                </div>

                {/* Scrollable attendee list */}
                <ScrollArea className="h-[200px] rounded-lg border border-border">
                  <div className="p-2 space-y-1">
                    {eligibleAttendees.map((attendee) => (
                      <label
                        key={attendee.id}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-bg-secondary cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={selectedIds.has(attendee.id)}
                          onCheckedChange={() => handleToggle(attendee.id)}
                        />
                        <span className="flex-1 text-sm text-text-primary truncate">
                          {attendee.name}
                        </span>
                        <span className="text-xs text-text-tertiary shrink-0">
                          {attendee.newRsvpCount} new
                        </span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>

                {/* Ineligible count */}
                {preview.skippedCount > 0 && (
                  <p className="text-xs text-text-tertiary">
                    {preview.skippedCount} attendee{preview.skippedCount !== 1 ? 's' : ''} skipped (no new RSVPs for them)
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-text-secondary">No attendees have new RSVPs to see.</p>
              </div>
            )}

            {/* Preview message */}
            {selectedIds.size > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-text-secondary">Message preview</p>
                <div className="rounded-lg bg-bg-tertiary p-3 text-sm text-text-primary">
                  &quot;{selectedSampleCount} more people RSVP&apos;d for {eventName} on {formattedDate}! See who they are: [link]&quot;
                </div>
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || loading || selectedIds.size === 0}
          >
            {sending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Send to {selectedIds.size} Attendee{selectedIds.size !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
