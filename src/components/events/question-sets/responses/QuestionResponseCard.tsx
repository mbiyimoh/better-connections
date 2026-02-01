'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuestionWithResponses } from '@/app/(dashboard)/events/[eventId]/question-sets/[setId]/responses/ResponsesPageClient';
import { formatResponseValue, formatRelativeDate } from '@/lib/m33t/question-formatting';
import { AggregationDisplay } from './AggregationDisplay';

const typeBadgeConfig: Record<
  string,
  { label: string; className: string }
> = {
  open_text: { label: 'Open Text', className: 'bg-blue-500/20 text-blue-400' },
  single_select: {
    label: 'Single Select',
    className: 'bg-purple-500/20 text-purple-400',
  },
  multi_select: {
    label: 'Multi Select',
    className: 'bg-indigo-500/20 text-indigo-400',
  },
  slider: { label: 'Slider', className: 'bg-amber-500/20 text-amber-400' },
  ranking: {
    label: 'Ranking',
    className: 'bg-emerald-500/20 text-emerald-400',
  },
};

const INITIAL_SHOW_COUNT = 5;

interface QuestionResponseCardProps {
  data: QuestionWithResponses;
}

export function QuestionResponseCard({ data }: QuestionResponseCardProps) {
  const { question, responses, aggregation } = data;
  const badge = typeBadgeConfig[question.type] ?? { label: 'Text', className: 'bg-blue-500/20 text-blue-400' };

  const isOpenText = question.type === 'open_text';
  const needsExpander = isOpenText && responses.length > INITIAL_SHOW_COUNT;
  const [expanded, setExpanded] = useState(false);

  const visibleResponses =
    needsExpander && !expanded
      ? responses.slice(0, INITIAL_SHOW_COUNT)
      : responses;

  return (
    <Card className="p-5 space-y-4">
      {/* Question header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge className={cn('text-xs border-0', badge.className)}>
            {badge.label}
          </Badge>
          <span className="text-xs text-text-tertiary">
            {responses.length} response{responses.length !== 1 ? 's' : ''}
          </span>
        </div>
        <h3 className="font-medium text-text-primary">{question.title}</h3>
        {question.subtitle && (
          <p className="text-sm text-text-secondary">{question.subtitle}</p>
        )}
      </div>

      {/* Aggregation */}
      {aggregation.type !== 'open_text' && aggregation.total > 0 && (
        <AggregationDisplay aggregation={aggregation} question={question} />
      )}

      {/* Individual responses */}
      {responses.length > 0 && (
        <div className="space-y-2">
          {visibleResponses.map((response) => (
            <div
              key={`${response.attendeeId}-${response.answeredAt}`}
              className="rounded-lg border border-border p-3 space-y-1"
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-text-primary">
                  {response.attendeeName}
                </span>
                <span className="text-text-tertiary">
                  {formatRelativeDate(response.answeredAt)}
                </span>
                {!response.isCompleted && (
                  <Badge className="text-xs border-0 bg-gold-subtle text-gold-primary">
                    In Progress
                  </Badge>
                )}
              </div>
              <p className="text-sm text-text-secondary">
                {formatResponseValue(response.value, question)}
              </p>
              {response.context && (
                <p className="text-xs text-text-tertiary italic">
                  {response.context}
                </p>
              )}
            </div>
          ))}

          {needsExpander && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-text-secondary hover:text-text-primary w-full"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Show all {responses.length} responses
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
