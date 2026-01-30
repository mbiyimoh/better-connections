'use client';

import { motion } from 'framer-motion';
import { Label } from '@/components/ui/label';
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
        return;
      }
      onChange([...value, optionValue]);
    } else {
      onChange(value.filter((v) => v !== optionValue));
    }
  };

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
        {maxSelections && (
          <p className="text-sm text-zinc-500 mt-1 font-mono">
            {value.length}/{maxSelections} selected
          </p>
        )}
      </div>

      <div className="space-y-2">
        {options.map((option) => {
          const isSelected = value.includes(option.value);
          const isDisabled = !isSelected && maxSelections !== undefined && value.length >= maxSelections;

          return (
            <motion.button
              key={option.value}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              disabled={isDisabled}
              onClick={() => !isDisabled && handleToggle(option.value, !isSelected)}
              whileHover={isDisabled ? undefined : { scale: 1.01 }}
              whileTap={isDisabled ? undefined : { scale: 0.99 }}
              className={`w-full flex items-start gap-3 p-4 rounded-lg border transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50 ${
                isSelected
                  ? 'border-gold-primary bg-gold-subtle'
                  : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-600'
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {/* Custom checkbox */}
              <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                isSelected
                  ? 'border-gold-primary bg-gold-primary'
                  : 'border-zinc-600 bg-transparent'
              }`}>
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="#0a0a0f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <span className={`font-body font-medium ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                  {option.label}
                </span>
                {option.description && (
                  <p className="text-sm text-zinc-500 mt-0.5 font-body">{option.description}</p>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {question.config?.hint && (
        <p className="text-xs text-zinc-500 font-body">{question.config.hint}</p>
      )}

      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
