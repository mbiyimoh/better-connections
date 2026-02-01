'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AttendeeWithResponses } from '@/app/(dashboard)/events/[eventId]/question-sets/[setId]/responses/ResponsesPageClient';
import { formatResponseValue } from '@/lib/m33t/question-formatting';

interface AttendeeDetailProps {
  data: AttendeeWithResponses;
  onClose: () => void;
}

export function AttendeeDetail({ data, onClose }: AttendeeDetailProps) {
  const { attendee, responses } = data;
  const isCompleted = attendee.completedAt !== null;

  const dateLabel = isCompleted
    ? `Completed ${new Date(attendee.completedAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : `Started ${new Date(attendee.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <Card className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium text-text-primary">
              {attendee.name}
            </h3>
            <Badge
              className={cn(
                'text-xs border-0',
                isCompleted
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-gold-subtle text-gold-primary'
              )}
            >
              {isCompleted ? 'Completed' : 'In Progress'}
            </Badge>
          </div>
          <p className="text-sm text-text-tertiary">{attendee.email}</p>
          <p className="text-xs text-text-tertiary mt-0.5">{dateLabel}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 text-text-tertiary hover:text-text-primary"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Responses */}
      <div className="space-y-3">
        {responses.map((item) => {
          const hasAnswer = item.value !== null && item.value !== undefined;
          return (
            <div
              key={item.question.id}
              className="border-b border-border pb-3 last:border-0 last:pb-0"
            >
              <p className="text-sm font-medium text-text-secondary">
                {item.question.title}
              </p>
              {hasAnswer ? (
                <>
                  <p className="text-sm text-text-primary mt-1">
                    {formatResponseValue(item.value, item.question)}
                  </p>
                  {item.context && (
                    <p className="text-xs text-text-tertiary italic mt-1">
                      {item.context}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-text-tertiary italic mt-1">
                  (skipped)
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
