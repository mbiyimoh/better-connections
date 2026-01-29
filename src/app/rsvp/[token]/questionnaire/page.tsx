'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { getRsvpBasePath } from '@/lib/m33t/rsvp-paths';
import { useDebouncedCallback } from 'use-debounce';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { QuestionRenderer } from '@/components/m33t/questions';
import type { Question, QuestionnaireResponse } from '@/lib/m33t/schemas';

interface QuestionnaireData {
  event: { id: string; name: string };
  attendee: { id: string; firstName: string; lastName: string | null; completed: boolean };
  questions: Question[];
  responses: QuestionnaireResponse[];
}

type ResponseValue = string | number | string[];

export default function QuestionnairePage() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const token = params.token as string;
  const rsvpBase = getRsvpBasePath(pathname);

  const [data, setData] = useState<QuestionnaireData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [responses, setResponses] = useState<Record<string, ResponseValue>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Fetch questionnaire data
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/rsvp/${token}/questionnaire`);
        if (!res.ok) {
          const error = await res.json();
          if (res.status === 403) {
            toast.error('Please confirm your RSVP first');
            router.push(rsvpBase);
            return;
          }
          throw new Error(error.error || 'Failed to load questionnaire');
        }
        const questionnaireData = await res.json();
        setData(questionnaireData);

        // Initialize responses from saved data
        const initialResponses: Record<string, ResponseValue> = {};
        if (questionnaireData.responses) {
          for (const r of questionnaireData.responses) {
            initialResponses[r.questionId] = r.value;
          }
        }
        setResponses(initialResponses);

        // If already completed, redirect
        if (questionnaireData.attendee.completed) {
          router.push(`${rsvpBase}/complete`);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load questionnaire');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [token, router]);

  // Auto-save with debounce
  const debouncedSave = useDebouncedCallback(async (responsesToSave: Record<string, ResponseValue>) => {
    if (!data) return;
    setSaving(true);
    try {
      const formattedResponses = Object.entries(responsesToSave).map(([questionId, value]) => ({
        questionId,
        value,
        answeredAt: new Date().toISOString(),
      }));

      await fetch(`/api/rsvp/${token}/questionnaire/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: formattedResponses }),
      });
    } catch {
      // Silent fail for auto-save
    } finally {
      setSaving(false);
    }
  }, 500);

  const handleResponseChange = useCallback((questionId: string, value: ResponseValue) => {
    setResponses((prev) => {
      const updated = { ...prev, [questionId]: value };
      debouncedSave(updated);
      return updated;
    });
    // Clear error when user starts typing
    setErrors((prev) => ({ ...prev, [questionId]: '' }));
  }, [debouncedSave]);

  const validateCurrentQuestion = (): boolean => {
    if (!data) return false;
    const question = data.questions[currentIndex];
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
    if (data && currentIndex < data.questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!data) return;

    // Validate all required questions
    const newErrors: Record<string, string> = {};
    for (const question of data.questions) {
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
      const firstErrorIndex = data.questions.findIndex((q) => newErrors[q.id]);
      if (firstErrorIndex >= 0) {
        setCurrentIndex(firstErrorIndex);
      }
      toast.error('Please complete all required questions');
      return;
    }

    setSubmitting(true);
    try {
      const formattedResponses = Object.entries(responses).map(([questionId, value]) => ({
        questionId,
        value,
        answeredAt: new Date().toISOString(),
      }));

      const res = await fetch(`/api/rsvp/${token}/questionnaire/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: formattedResponses, isComplete: true }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit questionnaire');
      }

      toast.success('Profile complete!');
      router.push(`${rsvpBase}/complete`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <p className="text-text-secondary">Failed to load questionnaire</p>
      </div>
    );
  }

  const currentQuestion = data.questions[currentIndex];
  const progress = ((currentIndex + 1) / data.questions.length) * 100;
  const isLastQuestion = currentIndex === data.questions.length - 1;

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="bg-bg-secondary border-b border-border py-6">
        <div className="max-w-2xl mx-auto px-4">
          <p className="text-sm text-text-secondary mb-1">Complete your profile for</p>
          <h1 className="text-2xl font-bold text-text-primary">{data.event.name}</h1>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-text-secondary">
            Question {currentIndex + 1} of {data.questions.length}
          </span>
          {saving && (
            <span className="text-xs text-text-tertiary flex items-center">
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
              Saving...
            </span>
          )}
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Card className="bg-bg-secondary border-border">
          <CardHeader>
            <CardTitle className="text-lg">Hi {data.attendee.firstName}!</CardTitle>
            <CardDescription>
              Help us find your perfect matches by answering a few questions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentQuestion && (
              <div className="py-4">
                <QuestionRenderer
                  question={currentQuestion}
                  value={responses[currentQuestion.id]}
                  onChange={handleResponseChange}
                  error={errors[currentQuestion.id]}
                />
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t border-border">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              {isLastQuestion ? (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-gold-primary hover:bg-gold-light text-bg-primary"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Complete Profile
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
    </div>
  );
}
