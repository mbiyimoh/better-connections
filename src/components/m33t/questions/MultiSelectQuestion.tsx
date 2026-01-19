'use client';

import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { Question } from '@/lib/m33t/schemas';

interface MultiSelectQuestionProps {
  question: Question;
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
}

export function MultiSelectQuestion({ question, value, onChange, error }: MultiSelectQuestionProps) {
  const options = question.config?.options || [];
  const maxSelections = question.config?.maxSelections;

  const handleToggle = (optionValue: string, checked: boolean) => {
    if (checked) {
      if (maxSelections && value.length >= maxSelections) {
        return; // Don't add if at max
      }
      onChange([...value, optionValue]);
    } else {
      onChange(value.filter((v) => v !== optionValue));
    }
  };

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
        {maxSelections && (
          <p className="text-sm text-text-tertiary mt-1">
            Select up to {maxSelections} ({value.length}/{maxSelections})
          </p>
        )}
      </div>

      <div className="space-y-2">
        {options.map((option) => {
          const isSelected = value.includes(option.value);
          const isDisabled = !isSelected && maxSelections !== undefined && value.length >= maxSelections;

          return (
            <div
              key={option.value}
              className={`flex items-start space-x-3 p-3 rounded-lg border border-border cursor-pointer transition-colors ${
                isSelected ? 'bg-gold-subtle border-gold-primary' : 'hover:bg-bg-tertiary'
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !isDisabled && handleToggle(option.value, !isSelected)}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => handleToggle(option.value, checked === true)}
                disabled={isDisabled}
                className="mt-0.5"
              />
              <div className="flex-1">
                <span className="font-medium">{option.label}</span>
                {option.description && (
                  <p className="text-sm text-text-secondary mt-0.5">{option.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {question.config?.hint && (
        <p className="text-xs text-text-tertiary">{question.config.hint}</p>
      )}

      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
