'use client';

import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { Question } from '@/lib/m33t/schemas';

interface OpenTextQuestionProps {
  question: Question;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function OpenTextQuestion({ question, value, onChange, error }: OpenTextQuestionProps) {
  const maxLength = 1000;
  const charCount = value.length;

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

      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.config?.placeholder}
        className="bg-bg-tertiary min-h-[120px] resize-none"
        maxLength={maxLength}
      />

      <div className="flex justify-between items-center">
        {question.config?.hint && (
          <p className="text-xs text-text-tertiary">{question.config.hint}</p>
        )}
        <p className={`text-xs ${charCount > maxLength * 0.9 ? 'text-warning' : 'text-text-tertiary'}`}>
          {charCount}/{maxLength}
        </p>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
