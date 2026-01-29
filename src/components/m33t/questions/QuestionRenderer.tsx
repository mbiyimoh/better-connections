'use client';

import type { Question } from '@/lib/m33t/schemas';
import { OpenTextQuestion } from './OpenTextQuestion';
import { SliderQuestion } from './SliderQuestion';
import { SingleSelectQuestion } from './SingleSelectQuestion';
import { MultiSelectQuestion } from './MultiSelectQuestion';
import { RankingQuestion } from './RankingQuestion';

type ResponseValue = string | number | string[];

interface QuestionRendererProps {
  question: Question;
  value: ResponseValue | undefined;
  onChange: (questionId: string, value: ResponseValue) => void;
  error?: string;
}

/**
 * Renders the appropriate question component based on question type.
 * Shared by all questionnaire renderers to avoid duplicating the type-switch logic.
 */
export function QuestionRenderer({ question, value, onChange, error }: QuestionRendererProps) {
  const handleChange = (v: ResponseValue) => onChange(question.id, v);

  switch (question.type) {
    case 'open_text':
      return (
        <OpenTextQuestion
          question={question}
          value={(value as string) || ''}
          onChange={handleChange}
          error={error}
        />
      );
    case 'slider':
      return (
        <SliderQuestion
          question={question}
          value={(value as number) || 50}
          onChange={handleChange}
          error={error}
        />
      );
    case 'single_select':
      return (
        <SingleSelectQuestion
          question={question}
          value={(value as string) || ''}
          onChange={handleChange}
          error={error}
        />
      );
    case 'multi_select':
      return (
        <MultiSelectQuestion
          question={question}
          value={(value as string[]) || []}
          onChange={handleChange}
          error={error}
        />
      );
    case 'ranking':
      return (
        <RankingQuestion
          question={question}
          value={(value as string[]) || []}
          onChange={handleChange}
          error={error}
        />
      );
    default:
      return null;
  }
}
