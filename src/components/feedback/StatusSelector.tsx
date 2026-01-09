'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FEEDBACK_STATUS_LABELS,
  type FeedbackStatus,
} from '@/lib/validations/feedback';
import { FEEDBACK_STATUS_COLORS } from '@/lib/design-system';

interface StatusSelectorProps {
  feedbackId: string;
  currentStatus: FeedbackStatus;
  onStatusChange: (feedbackId: string, status: FeedbackStatus) => void;
}

export function StatusSelector({
  feedbackId,
  currentStatus,
  onStatusChange,
}: StatusSelectorProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus || isUpdating) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update status');
      }

      onStatusChange(feedbackId, newStatus as FeedbackStatus);
      toast.success('Status updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Select value={currentStatus} onValueChange={handleStatusChange} disabled={isUpdating}>
      <SelectTrigger
        className={`h-6 w-auto px-2 py-0 text-xs font-medium border-0 ${FEEDBACK_STATUS_COLORS[currentStatus]}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-bg-secondary border-white/10">
        {(Object.entries(FEEDBACK_STATUS_LABELS) as [FeedbackStatus, string][]).map(
          ([value, label]) => (
            <SelectItem
              key={value}
              value={value}
              className={`text-xs ${FEEDBACK_STATUS_COLORS[value]}`}
            >
              {label}
            </SelectItem>
          )
        )}
      </SelectContent>
    </Select>
  );
}
