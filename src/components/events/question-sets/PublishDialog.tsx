'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { AlertCircle, Send, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface QuestionSet {
  id: string;
  title: string;
  questionCount: number;
  completionStats: {
    total: number;
    completed: number;
    inProgress: number;
  };
}

interface PublishDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  questionSet: QuestionSet;
}

export function PublishDialog({
  isOpen,
  onClose,
  eventId,
  questionSet,
}: PublishDialogProps) {
  const router = useRouter();
  const [notifyOption, setNotifyOption] = useState<'notify' | 'no_notify'>('notify');
  const [isPublishing, setIsPublishing] = useState(false);

  const eligibleToNotify = questionSet.completionStats.total;

  const handlePublish = async () => {
    setIsPublishing(true);

    try {
      const res = await fetch(
        `/api/events/${eventId}/question-sets/${questionSet.id}/publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notifyAttendees: notifyOption === 'notify',
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to publish');
      }

      const data = await res.json();

      if (notifyOption === 'notify' && data.notificationsSent) {
        toast.success(
          `Published and sent ${data.notificationsSent} notifications`
        );
      } else {
        toast.success('Question set published');
      }

      router.refresh();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to publish');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publish Question Set</DialogTitle>
          <DialogDescription>
            Make this question set visible to attendees
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="bg-bg-secondary rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-text-tertiary" />
              <span className="font-medium">{questionSet.title}</span>
            </div>
            <p className="text-sm text-text-secondary">
              {questionSet.questionCount} questions
            </p>
          </div>

          {/* Warning for no questions */}
          {questionSet.questionCount === 0 && (
            <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 text-warning" />
              <span className="text-warning">
                Cannot publish a set with no questions
              </span>
            </div>
          )}

          {/* Notification Option */}
          {questionSet.questionCount > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Notification preference
              </Label>
              <RadioGroup
                value={notifyOption}
                onValueChange={(v) => setNotifyOption(v as 'notify' | 'no_notify')}
                className="space-y-2"
              >
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-bg-secondary cursor-pointer">
                  <RadioGroupItem value="notify" id="notify" />
                  <Label htmlFor="notify" className="flex-1 cursor-pointer">
                    <div className="font-medium">Publish & Notify Now</div>
                    <div className="text-sm text-text-secondary">
                      Send notification to {eligibleToNotify} confirmed attendees
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-bg-secondary cursor-pointer">
                  <RadioGroupItem value="no_notify" id="no_notify" />
                  <Label htmlFor="no_notify" className="flex-1 cursor-pointer">
                    <div className="font-medium">Publish Only</div>
                    <div className="text-sm text-text-secondary">
                      Make visible but send notifications later
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPublishing}>
            Cancel
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isPublishing || questionSet.questionCount === 0}
            className="bg-gold-primary hover:bg-gold-light"
          >
            {isPublishing ? (
              'Publishing...'
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Publish
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
