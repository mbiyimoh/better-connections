'use client';

import type { QuestionWithResponses } from '@/app/(dashboard)/events/[eventId]/question-sets/[setId]/responses/ResponsesPageClient';
import { QuestionResponseCard } from './QuestionResponseCard';

interface ByQuestionViewProps {
  questions: QuestionWithResponses[];
}

export function ByQuestionView({ questions }: ByQuestionViewProps) {
  return (
    <div className="space-y-4">
      {questions.map((item) => (
        <QuestionResponseCard key={item.question.id} data={item} />
      ))}
    </div>
  );
}
