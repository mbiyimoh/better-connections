'use client';

import { Card } from '@/components/ui/card';
import { Users, CheckCircle2, Clock, UserX } from 'lucide-react';

interface ResponsesSummary {
  totalAttendees: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  completionRate: number;
}

interface ResponsesSummaryHeaderProps {
  summary: ResponsesSummary;
}

const metrics = [
  {
    key: 'totalAttendees' as const,
    label: 'Total Attendees',
    icon: Users,
    color: 'text-text-secondary',
    iconColor: 'text-text-tertiary',
  },
  {
    key: 'completed' as const,
    label: 'Completed',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    iconColor: 'text-emerald-400',
  },
  {
    key: 'inProgress' as const,
    label: 'In Progress',
    icon: Clock,
    color: 'text-gold-primary',
    iconColor: 'text-gold-primary',
  },
  {
    key: 'notStarted' as const,
    label: 'Not Started',
    icon: UserX,
    color: 'text-text-secondary',
    iconColor: 'text-text-tertiary',
  },
];

export function ResponsesSummaryHeader({ summary }: ResponsesSummaryHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.key} className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${metric.iconColor}`} />
                <span className="text-xs text-text-tertiary uppercase tracking-wider">
                  {metric.label}
                </span>
              </div>
              <p className={`text-2xl font-semibold ${metric.color}`}>
                {summary[metric.key]}
              </p>
            </Card>
          );
        })}
      </div>
      <p className="text-sm text-text-secondary">
        {summary.completionRate}% completion rate
      </p>
    </div>
  );
}
