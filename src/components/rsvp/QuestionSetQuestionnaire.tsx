'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { Loader2, ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  OpenTextQuestion,
  SliderQuestion,
  SingleSelectQuestion,
  MultiSelectQuestion,
} from '@/components/m33t/questions';
import type { Question } from '@/lib/m33t/schemas';
import type { ProfileSuggestion } from '@/lib/m33t/suggestion-schema';

interface StoredResponse {
  questionId: string;
  value: string | number | string[];
}

interface QuestionSetData {
  questionSet: {
    id: string;
    internalId: string | null;
    title: string;
    description: string | null;
    questions: Question[];
  };
  responses: StoredResponse[];
  progress: {
    total: number;
    answered: number;
    currentIndex: number;
  };
  isCompleted: boolean;
}

type ResponseValue = string | number | string[];

interface QuestionSetQuestionnaireProps {
  token: string;
  setId: string;
  onComplete: (suggestions: ProfileSuggestion[]) => void;
  onBack: () => void;
}

export function QuestionSetQuestionnaire({
  token,
  setId,
  onComplete,
  onBack,
}: QuestionSetQuestionnaireProps) {
  const [data, setQuestionSetData] = useState<QuestionSetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [responses, setResponses] = useState<Record<string, ResponseValue>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Fetch question set data
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/rsvp/${token}/question-sets/${setId}`);
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Failed to load question set');
        }
        const questionSetData: QuestionSetData = await res.json();
        setQuestionSetData(questionSetData);

        // Initialize responses from saved data
        const initialResponses: Record<string, ResponseValue> = {};
        if (questionSetData.responses) {
          for (const r of questionSetData.responses) {
            initialResponses[r.questionId] = r.value;
          }
        }
        setResponses(initialResponses);

        // Resume from where they left off
        setCurrentIndex(questionSetData.progress.currentIndex);

        // If already completed, trigger completion with empty suggestions
        if (questionSetData.isCompleted) {
          onComplete([]);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load question set');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [token, setId, onComplete]);

  // Auto-save with debounce
  const debouncedSave = useDebouncedCallback(
    async (responsesToSave: Record<string, ResponseValue>) => {
      if (!data) return;
      setSaving(true);
      try {
        const formattedResponses = Object.entries(responsesToSave).map(([questionId, value]) => ({
          questionId,
          value,
        }));

        await fetch(`/api/rsvp/${token}/question-sets/${setId}/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ responses: formattedResponses }),
        });
      } catch {
        // Silent fail for auto-save
      } finally {
        setSaving(false);
      }
    },
    500
  );

  const handleResponseChange = useCallback(
    (questionId: string, value: ResponseValue) => {
      setResponses((prev) => {
        const updated = { ...prev, [questionId]: value };
        debouncedSave(updated);
        return updated;
      });
      // Clear error when user starts typing
      setErrors((prev) => ({ ...prev, [questionId]: '' }));
    },
    [debouncedSave]
  );

  const validateCurrentQuestion = (): boolean => {
    if (!data) return false;
    const question = data.questionSet.questions[currentIndex];
    if (!question) return true;

    if (question.required) {
      const value = responses[question.id];
      if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        setErrors((prev) => ({ ...prev, [question.id]: 'This field is required' }));
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentQuestion()) return;
    if (data && currentIndex < data.questionSet.questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleComplete = async () => {
    if (!data) return;

    // Validate all required questions
    const newErrors: Record<string, string> = {};
    for (const question of data.questionSet.questions) {
      if (question.required) {
        const value = responses[question.id];
        if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
          newErrors[question.id] = 'This field is required';
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Find first question with error
      const firstErrorIndex = data.questionSet.questions.findIndex((q) => newErrors[q.id]);
      if (firstErrorIndex >= 0) {
        setCurrentIndex(firstErrorIndex);
      }
      toast.error('Please complete all required questions');
      return;
    }

    setSubmitting(true);
    try {
      // First save all responses
      const formattedResponses = Object.entries(responses).map(([questionId, value]) => ({
        questionId,
        value,
      }));

      await fetch(`/api/rsvp/${token}/question-sets/${setId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: formattedResponses }),
      });

      // Then complete the set
      const res = await fetch(`/api/rsvp/${token}/question-sets/${setId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to complete question set');
      }

      const result = await res.json();
      toast.success('Question set completed!');
      onComplete(result.suggestions || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to complete');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gold-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-text-secondary mb-4">Failed to load question set</p>
        <Button variant="outline" onClick={onBack}>
          Go Back
        </Button>
      </div>
    );
  }

  const currentQuestion = data.questionSet.questions[currentIndex];
  const progress = ((currentIndex + 1) / data.questionSet.questions.length) * 100;
  const isLastQuestion = currentIndex === data.questionSet.questions.length - 1;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <X className="w-4 h-4 mr-1" />
          Exit
        </Button>
        {saving && (
          <span className="text-xs text-text-tertiary flex items-center">
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
            Saving...
          </span>
        )}
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text-primary">{data.questionSet.title}</span>
          <span className="text-sm text-text-secondary">
            {currentIndex + 1} of {data.questionSet.questions.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <Card className="bg-bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-lg">{currentQuestion?.title}</CardTitle>
          {currentQuestion?.subtitle && (
            <CardDescription>{currentQuestion.subtitle}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {currentQuestion && (
            <div className="py-4">
              {currentQuestion.type === 'open_text' && (
                <OpenTextQuestion
                  question={currentQuestion}
                  value={(responses[currentQuestion.id] as string) || ''}
                  onChange={(value) => handleResponseChange(currentQuestion.id, value)}
                  error={errors[currentQuestion.id]}
                />
              )}
              {currentQuestion.type === 'slider' && (
                <SliderQuestion
                  question={currentQuestion}
                  value={(responses[currentQuestion.id] as number) || 50}
                  onChange={(value) => handleResponseChange(currentQuestion.id, value)}
                  error={errors[currentQuestion.id]}
                />
              )}
              {currentQuestion.type === 'single_select' && (
                <SingleSelectQuestion
                  question={currentQuestion}
                  value={(responses[currentQuestion.id] as string) || ''}
                  onChange={(value) => handleResponseChange(currentQuestion.id, value)}
                  error={errors[currentQuestion.id]}
                />
              )}
              {currentQuestion.type === 'multi_select' && (
                <MultiSelectQuestion
                  question={currentQuestion}
                  value={(responses[currentQuestion.id] as string[]) || []}
                  onChange={(value) => handleResponseChange(currentQuestion.id, value)}
                  error={errors[currentQuestion.id]}
                />
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-6 border-t border-border">
            <Button variant="outline" onClick={handlePrevious} disabled={currentIndex === 0}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {isLastQuestion ? (
              <Button
                onClick={handleComplete}
                disabled={submitting}
                className="bg-gold-primary hover:bg-gold-light text-bg-primary"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Complete
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
