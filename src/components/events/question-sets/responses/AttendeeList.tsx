'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AttendeeWithResponses } from '@/app/(dashboard)/events/[eventId]/question-sets/[setId]/responses/ResponsesPageClient';

interface AttendeeListProps {
  attendees: AttendeeWithResponses[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  notStartedCount: number;
}

export function AttendeeList({
  attendees,
  selectedId,
  onSelect,
  notStartedCount,
}: AttendeeListProps) {
  const completed = attendees.filter((a) => a.attendee.completedAt !== null);
  const inProgress = attendees.filter((a) => a.attendee.completedAt === null);

  return (
    <div className="space-y-4">
      {/* Completed */}
      {completed.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-text-secondary">
            Completed ({completed.length})
          </h3>
          {completed.map((item) => (
            <AttendeeRow
              key={item.attendee.id}
              data={item}
              isSelected={selectedId === item.attendee.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}

      {/* In Progress */}
      {inProgress.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-text-secondary">
            In Progress ({inProgress.length})
          </h3>
          {inProgress.map((item) => (
            <AttendeeRow
              key={item.attendee.id}
              data={item}
              isSelected={selectedId === item.attendee.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}

      {/* Not started */}
      {notStartedCount > 0 && (
        <p className="text-sm text-text-tertiary">
          {notStartedCount} attendee{notStartedCount !== 1 ? 's' : ''} haven&apos;t
          started
        </p>
      )}
    </div>
  );
}

// ========== ATTENDEE ROW ==========

function AttendeeRow({
  data,
  isSelected,
  onSelect,
}: {
  data: AttendeeWithResponses;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
}) {
  const { attendee, responses } = data;
  const isCompleted = attendee.completedAt !== null;
  const answeredCount = responses.filter((r) => r.value !== null).length;
  const totalQuestions = responses.length;
  const initial = attendee.name.charAt(0).toUpperCase();

  const dateStr = isCompleted
    ? `Completed ${new Date(attendee.completedAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : `Started ${new Date(attendee.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return (
    <button
      onClick={() => onSelect(isSelected ? null : attendee.id)}
      className={cn(
        'w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-all',
        isSelected
          ? 'border-gold-primary ring-2 ring-gold-primary/30 bg-gold-subtle'
          : 'border-border hover:border-text-tertiary'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium',
          isCompleted
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'bg-gold-subtle text-gold-primary border border-gold-primary/30'
        )}
      >
        {initial}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-text-primary truncate">
            {attendee.name}
          </span>
          <Badge
            className={cn(
              'text-xs border-0 shrink-0',
              isCompleted
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-gold-subtle text-gold-primary'
            )}
          >
            {isCompleted ? 'Completed' : 'In Progress'}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <span>{dateStr}</span>
          <span>&middot;</span>
          <span>
            {answeredCount}/{totalQuestions} answered
          </span>
        </div>
      </div>
    </button>
  );
}
