'use client';

import { motion } from 'framer-motion';
import { Label } from '@/components/ui/label';
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
        <Label className="font-display text-lg font-normal text-white">
          {question.title}
          {question.required && <span className="text-error ml-1">*</span>}
        </Label>
        {question.subtitle && (
          <p className="text-sm text-zinc-400 mt-1 font-body">{question.subtitle}</p>
        )}
      </div>

      <div className="space-y-2" role="radiogroup">
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <motion.button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(option.value)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={`w-full flex items-start gap-3 p-4 rounded-lg border transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50 ${
                isSelected
                  ? 'border-gold-primary bg-gold-subtle'
                  : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-600'
              }`}
            >
              {/* Custom radio dot */}
              <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                isSelected ? 'border-gold-primary' : 'border-zinc-600'
              }`}>
                {isSelected && (
                  <div className="w-2.5 h-2.5 rounded-full bg-gold-primary" />
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
