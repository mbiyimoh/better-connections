'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { ResponsesSummaryHeader } from '@/components/events/question-sets/responses/ResponsesSummaryHeader';
import {
  ResponsesViewToggle,
  type ResponsesView,
} from '@/components/events/question-sets/responses/ResponsesViewToggle';
import { ByQuestionView } from '@/components/events/question-sets/responses/ByQuestionView';
import { ByAttendeeView } from '@/components/events/question-sets/responses/ByAttendeeView';
import type { Question } from '@/lib/m33t/schemas';
import type { QuestionAggregation } from '@/lib/m33t/response-aggregation';

// ========== TYPES ==========

interface ResponsesSummary {
  totalAttendees: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  completionRate: number;
}

interface QuestionResponse {
  attendeeId: string;
  attendeeName: string;
  value: string | number | string[];
  context: string | null;
  answeredAt: string;
  isCompleted: boolean;
}

export interface QuestionWithResponses {
  question: Question;
  responses: QuestionResponse[];
  aggregation: QuestionAggregation;
}

export interface AttendeeWithResponses {
  attendee: {
    id: string;
    name: string;
    email: string;
    completedAt: string | null;
    startedAt: string;
  };
  responses: Array<{
    question: Question;
    value: string | number | string[] | null;
    context: string | null;
  }>;
}

interface ResponsesData {
  questionSet: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    publishedAt: string | null;
  };
  summary: ResponsesSummary;
  responsesByQuestion: QuestionWithResponses[];
  responsesByAttendee: AttendeeWithResponses[];
}

// ========== COMPONENT ==========

interface ResponsesPageClientProps {
  eventId: string;
  setId: string;
}

export function ResponsesPageClient({
  eventId,
  setId,
}: ResponsesPageClientProps) {
  const router = useRouter();
  const [data, setData] = useState<ResponsesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ResponsesView>('by-question');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/events/${eventId}/question-sets/${setId}/responses`
      );
      if (!res.ok) {
        if (res.status === 404) {
          setError('Question set not found or not yet published.');
          return;
        }
        throw new Error(`Failed to fetch responses: ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load responses'
      );
    } finally {
      setLoading(false);
    }
  }, [eventId, setId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-text-tertiary" />
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/events/${eventId}`)}
          className="text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Event
        </Button>
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <AlertCircle className="h-8 w-8 text-text-tertiary" />
          <p className="text-text-secondary">
            {error || 'Something went wrong'}
          </p>
          <Button variant="outline" size="sm" onClick={fetchData}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const hasResponses =
    data.responsesByQuestion.some((q) => q.responses.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/events/${eventId}`)}
          className="text-text-secondary hover:text-text-primary -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Event
        </Button>
        <h1 className="text-2xl font-semibold text-text-primary">
          Responses: {data.questionSet.title}
        </h1>
        {data.questionSet.description && (
          <p className="text-sm text-text-secondary">
            {data.questionSet.description}
          </p>
        )}
      </div>

      {/* Summary */}
      <ResponsesSummaryHeader summary={data.summary} />

      {/* Empty state */}
      {!hasResponses ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 border border-border rounded-lg">
          <p className="text-text-secondary text-center max-w-md">
            No responses have been submitted yet. Responses will appear here as
            attendees complete this question set.
          </p>
        </div>
      ) : (
        <>
          {/* View Toggle */}
          <ResponsesViewToggle
            activeView={activeView}
            onViewChange={setActiveView}
          />

          {/* Active View */}
          {activeView === 'by-question' ? (
            <ByQuestionView questions={data.responsesByQuestion} />
          ) : (
            <ByAttendeeView
              attendees={data.responsesByAttendee}
              notStartedCount={data.summary.notStarted}
            />
          )}
        </>
      )}
    </div>
  );
}
