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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, MessageSquare, Link as LinkIcon, Send } from 'lucide-react';
import { toast } from 'sonner';

interface InviteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eligibleCount: number;
  onSuccess: () => void;
}

type ChannelOption = 'email' | 'sms' | 'both' | 'none';

export function InviteDialog({
  isOpen,
  onClose,
  eventId,
  eligibleCount,
  onSuccess,
}: InviteDialogProps) {
  const [channel, setChannel] = useState<ChannelOption>('both');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    try {
      const res = await fetch(`/api/events/${eventId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'invitation',
          channels: channel,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to send invitations');
      }

      const data = await res.json();

      if (channel === 'none') {
        toast.success(`Marked ${data.total} attendee(s) as notified`);
      } else {
        const parts: string[] = [];
        if (data.emailSent > 0) parts.push(`${data.emailSent} email${data.emailSent > 1 ? 's' : ''}`);
        if (data.smsSent > 0) parts.push(`${data.smsSent} SMS`);
        const sentMsg = parts.length > 0 ? parts.join(' and ') : 'No messages';
        toast.success(`Sent invitations: ${sentMsg}`);
      }

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
          <DialogTitle>Send Invitations</DialogTitle>
          <DialogDescription>
            Choose how to deliver invitations to {eligibleCount} attendee{eligibleCount !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Label className="text-sm font-medium mb-3 block text-text-primary">Delivery Method</Label>
          <RadioGroup
            value={channel}
            onValueChange={(v) => setChannel(v as ChannelOption)}
            className="space-y-2"
          >
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-bg-secondary cursor-pointer">
              <RadioGroupItem value="both" id="both" />
              <Label htmlFor="both" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 font-medium text-text-primary">
                  <Mail className="w-4 h-4" />
                  <span>+</span>
                  <MessageSquare className="w-4 h-4" />
                  Email & SMS
                </div>
                <div className="text-sm text-text-secondary">Maximum reach (recommended)</div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-bg-secondary cursor-pointer">
              <RadioGroupItem value="email" id="email" />
              <Label htmlFor="email" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 font-medium text-text-primary">
                  <Mail className="w-4 h-4" />
                  Email Only
                </div>
                <div className="text-sm text-text-secondary">Send via email (rich formatting)</div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-bg-secondary cursor-pointer">
              <RadioGroupItem value="sms" id="sms" />
              <Label htmlFor="sms" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 font-medium text-text-primary">
                  <MessageSquare className="w-4 h-4" />
                  SMS Only
                </div>
                <div className="text-sm text-text-secondary">Text message (immediate delivery)</div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-lg border border-gold-primary/30 bg-gold-subtle hover:bg-gold-subtle/80 cursor-pointer">
              <RadioGroupItem value="none" id="none" />
              <Label htmlFor="none" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 font-medium text-gold-primary">
                  <LinkIcon className="w-4 h-4" />
                  Mark as Notified Only
                </div>
                <div className="text-sm text-text-secondary">
                  Use &quot;Copy Link&quot; to send manually with a personal message
                </div>
              </Label>
            </div>
          </RadioGroup>
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
                {channel === 'none' ? 'Marking...' : 'Sending...'}
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {channel === 'none' ? 'Mark as Notified' : 'Send Invitations'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
