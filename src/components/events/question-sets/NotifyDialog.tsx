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
import { Send } from 'lucide-react';
import { toast } from 'sonner';

interface QuestionSet {
  id: string;
  title: string;
  completionStats: {
    total: number;
    completed: number;
    inProgress: number;
  };
}

interface NotifyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  questionSet: QuestionSet;
}

type FilterOption = 'announce' | 'all' | 'not_started' | 'in_progress';

export function NotifyDialog({
  isOpen,
  onClose,
  eventId,
  questionSet,
}: NotifyDialogProps) {
  const [filter, setFilter] = useState<FilterOption>('all');
  const [isSending, setIsSending] = useState(false);

  const { total, completed, inProgress } = questionSet.completionStats;
  const notStarted = total - completed - inProgress;

  const getCount = (f: FilterOption) => {
    switch (f) {
      case 'announce':
        return total; // Everyone
      case 'all':
        return total - completed;
      case 'not_started':
        return notStarted;
      case 'in_progress':
        return inProgress;
    }
  };

  const handleSend = async () => {
    setIsSending(true);

    try {
      const res = await fetch(
        `/api/events/${eventId}/question-sets/${questionSet.id}/notify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filter }),
        }
      );

      if (!res.ok) {
        throw new Error('Failed to send notifications');
      }

      const data = await res.json();
      toast.success(`Sent ${data.notificationsSent} notifications`);
      onClose();
    } catch (error) {
      toast.error('Failed to send notifications');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Notifications</DialogTitle>
          <DialogDescription>
            Remind attendees about &ldquo;{questionSet.title}&rdquo;
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Label className="text-sm font-medium mb-3 block">
            Who should receive notifications?
          </Label>
          <RadioGroup
            value={filter}
            onValueChange={(v) => setFilter(v as FilterOption)}
            className="space-y-2"
          >
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-gold-primary/30 bg-gold-subtle/20 hover:bg-gold-subtle/40 cursor-pointer">
              <RadioGroupItem value="announce" id="announce" />
              <Label htmlFor="announce" className="flex-1 cursor-pointer">
                <div className="font-medium text-gold-primary">Announce to Everyone</div>
                <div className="text-sm text-text-secondary">
                  All {getCount('announce')} confirmed attendees (e.g., new set available)
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-bg-secondary cursor-pointer">
              <RadioGroupItem value="all" id="all" />
              <Label htmlFor="all" className="flex-1 cursor-pointer">
                <div className="font-medium">All who haven&apos;t completed</div>
                <div className="text-sm text-text-secondary">
                  {getCount('all')} attendees
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-bg-secondary cursor-pointer">
              <RadioGroupItem value="not_started" id="not_started" />
              <Label htmlFor="not_started" className="flex-1 cursor-pointer">
                <div className="font-medium">Not started</div>
                <div className="text-sm text-text-secondary">
                  {getCount('not_started')} attendees
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-bg-secondary cursor-pointer">
              <RadioGroupItem value="in_progress" id="in_progress" />
              <Label htmlFor="in_progress" className="flex-1 cursor-pointer">
                <div className="font-medium">In progress</div>
                <div className="text-sm text-text-secondary">
                  {getCount('in_progress')} attendees
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
            disabled={isSending || getCount(filter) === 0}
            className="bg-gold-primary hover:bg-gold-light"
          >
            {isSending ? (
              'Sending...'
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send to {getCount(filter)} attendees
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
