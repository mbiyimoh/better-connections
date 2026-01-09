'use client';

import {
  FEEDBACK_STATUS_LABELS,
  type FeedbackStatus,
} from '@/lib/validations/feedback';
import { FEEDBACK_STATUS_COLORS } from '@/lib/design-system';

interface StatusBadgeProps {
  status: FeedbackStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${FEEDBACK_STATUS_COLORS[status]}`}>
      {FEEDBACK_STATUS_LABELS[status]}
    </span>
  );
}
