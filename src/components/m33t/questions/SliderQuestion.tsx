'use client';

import { Label } from '@/components/ui/label';
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
  const min = 0;
  const max = 100;
  const percentage = ((value - min) / (max - min)) * 100;

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

      {/* Large serif value display */}
      <div className="text-center pt-2">
        <span className="font-display text-3xl text-gold-primary">{value}</span>
      </div>

      <div className="pt-2 pb-2">
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#D4A84B] [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(212,168,75,0.4)] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#D4A84B] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
          style={{
            background: `linear-gradient(to right, #D4A84B 0%, #D4A84B ${percentage}%, #3f3f46 ${percentage}%, #3f3f46 100%)`,
          }}
        />
      </div>

      <div className="flex justify-between text-sm font-body">
        <span className="text-zinc-500">{leftLabel}</span>
        <span className="text-zinc-500">{rightLabel}</span>
      </div>

      {question.config?.hint && (
        <p className="text-xs text-zinc-500 font-body">{question.config.hint}</p>
      )}

      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
