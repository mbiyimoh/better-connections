'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttendeeStatus {
  id: string;
  firstName: string;
  lastName: string | null;
  status: 'completed' | 'in_progress' | 'not_started';
  completedAt?: string;
}

interface CompletionStatsPanelProps {
  total: number;
  completed: number;
  inProgress: number;
  attendees?: AttendeeStatus[];
  showAttendeeList?: boolean;
}

export function CompletionStatsPanel({
  total,
  completed,
  inProgress,
  attendees,
  showAttendeeList = false,
}: CompletionStatsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const notStarted = total - completed - inProgress;
  const completionPercent =
    total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Completion Stats</h4>
        <span className="text-lg font-semibold text-gold-primary">
          {completionPercent}%
        </span>
      </div>

      <Progress value={completionPercent} className="h-2" />

      <div className="grid grid-cols-3 gap-4 text-center text-sm">
        <div>
          <div className="text-2xl font-semibold text-emerald-400">
            {completed}
          </div>
          <div className="text-text-secondary">Completed</div>
        </div>
        <div>
          <div className="text-2xl font-semibold text-amber-400">
            {inProgress}
          </div>
          <div className="text-text-secondary">In Progress</div>
        </div>
        <div>
          <div className="text-2xl font-semibold text-zinc-400">
            {notStarted}
          </div>
          <div className="text-text-secondary">Not Started</div>
        </div>
      </div>

      {/* Attendee List (Optional) */}
      {showAttendeeList && attendees && attendees.length > 0 && (
        <div className="border-t border-border pt-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <span>Attendee Details</span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {isExpanded && (
            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
              {attendees.map((attendee) => (
                <div
                  key={attendee.id}
                  className="flex items-center justify-between py-2 px-3 bg-bg-secondary rounded"
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-text-tertiary" />
                    <span className="text-sm">
                      {attendee.firstName} {attendee.lastName}
                    </span>
                  </div>
                  <Badge
                    className={cn(
                      'text-xs',
                      attendee.status === 'completed' &&
                        'bg-emerald-500/20 text-emerald-400',
                      attendee.status === 'in_progress' &&
                        'bg-amber-500/20 text-amber-400',
                      attendee.status === 'not_started' &&
                        'bg-zinc-500/20 text-zinc-400'
                    )}
                  >
                    {attendee.status === 'completed'
                      ? 'Completed'
                      : attendee.status === 'in_progress'
                        ? 'In Progress'
                        : 'Not Started'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
