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
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

interface MatchRevealDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eligibleCount: number;
  onSuccess: () => void;
}

export function MatchRevealDialog({
  isOpen,
  onClose,
  eventId,
  eligibleCount,
  onSuccess,
}: MatchRevealDialogProps) {
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    try {
      const res = await fetch(`/api/events/${eventId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'match_reveal' }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to send notifications');
      }

      const data = await res.json();
      toast.success(`Sent match reveals to ${data.sent} attendees`);
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
          <DialogTitle>Send Match Reveal Notifications</DialogTitle>
          <DialogDescription>
            Notify attendees about their curated matches
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-text-primary mb-2">
            <span className="font-semibold">{eligibleCount}</span> attendees will receive email and SMS notifications.
          </p>
          <p className="text-sm text-text-secondary">
            Only confirmed attendees with approved matches who haven&apos;t been notified yet.
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
                <Send className="w-4 h-4 mr-2" />
                Send Notifications
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
