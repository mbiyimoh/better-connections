'use client';

import type { QuestionAggregation } from '@/lib/m33t/response-aggregation';
import type { Question } from '@/lib/m33t/schemas';

interface AggregationDisplayProps {
  aggregation: QuestionAggregation;
  question: Question;
}

export function AggregationDisplay({
  aggregation,
  question,
}: AggregationDisplayProps) {
  switch (aggregation.type) {
    case 'single_select':
    case 'multi_select':
      return (
        <SelectAggregation
          counts={aggregation.counts}
          total={aggregation.total}
          options={question.config?.options ?? []}
        />
      );
    case 'slider':
      return (
        <SliderAggregation
          average={aggregation.average}
          min={aggregation.min}
          max={aggregation.max}
          total={aggregation.total}
          leftLabel={question.config?.leftLabel}
          rightLabel={question.config?.rightLabel}
        />
      );
    case 'ranking':
      return (
        <RankingAggregation
          averageRanks={aggregation.averageRanks}
          total={aggregation.total}
        />
      );
    case 'open_text':
    default:
      return null;
  }
}

// ========== SELECT AGGREGATION ==========

function SelectAggregation({
  counts,
  total,
  options,
}: {
  counts: Record<string, number>;
  total: number;
  options: Array<{ value: string; label: string }>;
}) {
  // Show all known options (even if count is 0), plus any unexpected values
  const knownValues = new Set(options.map((o) => o.value));
  const allEntries = [
    ...options.map((opt) => ({
      label: opt.label,
      count: counts[opt.value] ?? 0,
    })),
    ...Object.entries(counts)
      .filter(([key]) => !knownValues.has(key))
      .map(([key, count]) => ({ label: key, count })),
  ];

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      {allEntries.map((entry) => {
        const percentage = total > 0 ? Math.round((entry.count / total) * 100) : 0;
        return (
          <div key={entry.label} className="flex items-center gap-3">
            <span className="w-32 truncate text-sm text-text-secondary">
              {entry.label}
            </span>
            <div className="flex-1 h-2 rounded-full bg-bg-tertiary overflow-hidden">
              <div
                className="h-full rounded-full bg-gold-primary transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-sm text-text-secondary w-20 text-right">
              {percentage}% ({entry.count})
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ========== SLIDER AGGREGATION ==========

function SliderAggregation({
  average,
  min,
  max,
  total,
  leftLabel,
  rightLabel,
}: {
  average: number;
  min: number;
  max: number;
  total: number;
  leftLabel?: string;
  rightLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-center gap-6 text-sm">
        <div>
          <span className="text-text-tertiary">Average: </span>
          <span className="font-medium text-gold-primary">{average}</span>
        </div>
        <div>
          <span className="text-text-tertiary">Min: </span>
          <span className="text-text-secondary">{min}</span>
        </div>
        <div>
          <span className="text-text-tertiary">Max: </span>
          <span className="text-text-secondary">{max}</span>
        </div>
        <div>
          <span className="text-text-tertiary">Responses: </span>
          <span className="text-text-secondary">{total}</span>
        </div>
      </div>
      {(leftLabel || rightLabel) && (
        <div className="flex justify-between text-xs text-text-tertiary">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
    </div>
  );
}

// ========== RANKING AGGREGATION ==========

function RankingAggregation({
  averageRanks,
  total,
}: {
  averageRanks: Array<{ value: string; label: string; averageRank: number }>;
  total: number;
}) {
  return (
    <div className="rounded-lg border border-border p-3 space-y-1.5">
      <p className="text-xs text-text-tertiary mb-2">
        Average rank across {total} respondent{total !== 1 ? 's' : ''} (lower =
        higher ranked)
      </p>
      {averageRanks.map((item, index) => (
        <div key={item.value} className="flex items-center gap-3 text-sm">
          <span className="w-6 text-right font-mono text-text-tertiary">
            {index + 1}.
          </span>
          <span className="flex-1 text-text-secondary">{item.label}</span>
          <span className="text-text-tertiary text-xs">
            avg rank: {item.averageRank}
          </span>
        </div>
      ))}
    </div>
  );
}
