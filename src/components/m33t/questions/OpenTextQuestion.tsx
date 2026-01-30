'use client';

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
        <Label className="font-display text-lg font-normal text-white">
          {question.title}
          {question.required && <span className="text-error ml-1">*</span>}
        </Label>
        {question.subtitle && (
          <p className="text-sm text-zinc-400 mt-1 font-body">{question.subtitle}</p>
        )}
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.config?.placeholder}
        maxLength={maxLength}
        className="w-full min-h-[120px] resize-none rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-white font-body placeholder:text-zinc-600 focus:border-gold-primary focus:outline-none focus:ring-1 focus:ring-gold-primary/50 transition-colors"
      />

      <div className="flex justify-between items-center">
        {question.config?.hint && (
          <p className="text-xs text-zinc-500 font-body">{question.config.hint}</p>
        )}
        <p className={`text-xs font-mono ml-auto ${charCount > maxLength * 0.9 ? 'text-warning' : 'text-zinc-500'}`}>
          {charCount}/{maxLength}
        </p>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
