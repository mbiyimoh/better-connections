'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface AttendeeOption {
  id: string;
  name: string;
  email: string | null;
}

interface ManualMatchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  attendees: AttendeeOption[];
  onSuccess: () => void;
}

export function ManualMatchDialog({
  isOpen,
  onClose,
  eventId,
  attendees,
  onSuccess,
}: ManualMatchDialogProps) {
  const [firstAttendeeId, setFirstAttendeeId] = useState<string>('');
  const [secondAttendeeId, setSecondAttendeeId] = useState<string>('');
  const [curatorNotes, setCuratorNotes] = useState('');
  const [createReciprocal, setCreateReciprocal] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Filter out first attendee from second dropdown
  const secondAttendeeOptions = useMemo(
    () => attendees.filter((a) => a.id !== firstAttendeeId),
    [attendees, firstAttendeeId]
  );

  const resetForm = () => {
    setFirstAttendeeId('');
    setSecondAttendeeId('');
    setCuratorNotes('');
    setCreateReciprocal(true);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreate = async () => {
    if (!firstAttendeeId || !secondAttendeeId) {
      toast.error('Please select both attendees');
      return;
    }

    setIsCreating(true);
    try {
      // Create primary match: A → B
      const res1 = await fetch(`/api/events/${eventId}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendeeId: firstAttendeeId,
          matchedWithId: secondAttendeeId,
          curatorNotes: curatorNotes || undefined,
        }),
      });

      if (!res1.ok) {
        const error = await res1.json();
        throw new Error(error.error || 'Failed to create match');
      }

      // Create reciprocal match: B → A (if checkbox checked)
      if (createReciprocal) {
        const res2 = await fetch(`/api/events/${eventId}/matches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attendeeId: secondAttendeeId,
            matchedWithId: firstAttendeeId,
            curatorNotes: curatorNotes || undefined,
          }),
        });

        // 409 is acceptable if reciprocal already exists
        if (!res2.ok && res2.status !== 409) {
          const error = await res2.json();
          throw new Error(error.error || 'Failed to create reciprocal match');
        }
      }

      toast.success(createReciprocal ? 'Created mutual match!' : 'Match created!');
      onSuccess();
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create match');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Manual Match</DialogTitle>
          <DialogDescription>
            Create a match between two attendees
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="first-attendee">First Attendee</Label>
            <Select value={firstAttendeeId} onValueChange={setFirstAttendeeId}>
              <SelectTrigger id="first-attendee">
                <SelectValue placeholder="Select attendee..." />
              </SelectTrigger>
              <SelectContent>
                {attendees.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} {a.email && `(${a.email})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="second-attendee">Second Attendee</Label>
            <Select
              value={secondAttendeeId}
              onValueChange={setSecondAttendeeId}
              disabled={!firstAttendeeId}
            >
              <SelectTrigger id="second-attendee">
                <SelectValue placeholder="Select attendee..." />
              </SelectTrigger>
              <SelectContent>
                {secondAttendeeOptions.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} {a.email && `(${a.email})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="curator-notes">Curator Notes (optional)</Label>
            <Textarea
              id="curator-notes"
              placeholder="Why should these two meet?"
              value={curatorNotes}
              onChange={(e) => setCuratorNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="reciprocal"
              checked={createReciprocal}
              onCheckedChange={(checked) => setCreateReciprocal(checked === true)}
            />
            <Label htmlFor="reciprocal" className="text-sm cursor-pointer">
              Create reciprocal match (both see each other)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !firstAttendeeId || !secondAttendeeId}
            className="bg-gold-primary hover:bg-gold-light text-bg-primary"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Match
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
