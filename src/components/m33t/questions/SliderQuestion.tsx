'use client';

import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import type { Question } from '@/lib/m33t/schemas';

interface SliderQuestionProps {
  question: Question;
  value: number;
  onChange: (value: number) => void;
  error?: string;
}

export function SliderQuestion({ question, value, onChange, error }: SliderQuestionProps) {
  const leftLabel = question.config?.leftLabel || 'Low';
  const rightLabel = question.config?.rightLabel || 'High';

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-base font-medium">
          {question.title}
          {question.required && <span className="text-error ml-1">*</span>}
        </Label>
        {question.subtitle && (
          <p className="text-sm text-text-secondary mt-1">{question.subtitle}</p>
        )}
      </div>

      <div className="pt-4 pb-2">
        <Slider
          value={[value]}
          onValueChange={(vals) => onChange(vals[0] ?? 50)}
          min={0}
          max={100}
          step={1}
          className="w-full"
        />
      </div>

      <div className="flex justify-between text-sm text-text-secondary">
        <span>{leftLabel}</span>
        <span className="text-gold-primary font-medium">{value}</span>
        <span>{rightLabel}</span>
      </div>

      {question.config?.hint && (
        <p className="text-xs text-text-tertiary">{question.config.hint}</p>
      )}

      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
