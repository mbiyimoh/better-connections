'use client';

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { Question } from '@/lib/m33t/schemas';

interface SingleSelectQuestionProps {
  question: Question;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function SingleSelectQuestion({ question, value, onChange, error }: SingleSelectQuestionProps) {
  const options = question.config?.options || [];

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

      <RadioGroup value={value} onValueChange={onChange} className="space-y-2">
        {options.map((option) => (
          <div
            key={option.value}
            className="flex items-start space-x-3 p-3 rounded-lg hover:bg-bg-tertiary cursor-pointer border border-border"
          >
            <RadioGroupItem value={option.value} id={`${question.id}-${option.value}`} className="mt-0.5" />
            <Label htmlFor={`${question.id}-${option.value}`} className="flex-1 cursor-pointer">
              <span className="font-medium">{option.label}</span>
              {option.description && (
                <p className="text-sm text-text-secondary mt-0.5">{option.description}</p>
              )}
            </Label>
          </div>
        ))}
      </RadioGroup>

      {question.config?.hint && (
        <p className="text-xs text-text-tertiary">{question.config.hint}</p>
      )}

      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
