'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';

interface EventReminderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eligibleCount: number;
  onSuccess: () => void;
}

export function EventReminderDialog({
  isOpen,
  onClose,
  eventId,
  eligibleCount,
  onSuccess,
}: EventReminderDialogProps) {
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    try {
      const res = await fetch(`/api/events/${eventId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'event_reminder' }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to send reminders');
      }

      const data = await res.json();
      toast.success(`Sent event reminders to ${data.sent} attendees`);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Event Reminders</DialogTitle>
          <DialogDescription>
            Remind confirmed attendees about the upcoming event
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-text-primary">
            <span className="font-semibold">{eligibleCount}</span> attendees will receive a reminder with event details.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || eligibleCount === 0}
            className="bg-gold-primary hover:bg-gold-light text-bg-primary"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <CalendarClock className="w-4 h-4 mr-2" />
                Send Reminders
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
