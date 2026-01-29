'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getRsvpBasePath } from '@/lib/m33t/rsvp-paths';
import { Loader2, CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface QuestionSetSummary {
  id: string;
  internalId: string | null;
  title: string;
  description: string | null;
  questionCount: number;
  order: number;
  status: 'not_started' | 'in_progress' | 'completed';
  completedAt: string | null;
  answeredCount: number;
}

interface QuestionSetsData {
  event: { id: string; name: string };
  attendee: { id: string; firstName: string; lastName: string | null };
  questionSets: QuestionSetSummary[];
  nextSetId: string | null;
}

interface QuestionSetFlowProps {
  token: string;
  onStartSet: (setId: string) => void;
}

export function QuestionSetFlow({ token, onStartSet }: QuestionSetFlowProps) {
  const router = useRouter();
  const pathname = usePathname();
  const rsvpBase = getRsvpBasePath(pathname);
  const [data, setData] = useState<QuestionSetsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSets() {
      try {
        const res = await fetch(`/api/rsvp/${token}/question-sets`);
        if (!res.ok) {
          const error = await res.json();
          if (res.status === 403) {
            toast.error('Please confirm your RSVP first');
            router.push(rsvpBase);
            return;
          }
          throw new Error(error.error || 'Failed to load question sets');
        }
        const setsData = await res.json();
        setData(setsData);

        // If all sets are completed, redirect to complete page
        const allCompleted = setsData.questionSets.every(
          (s: QuestionSetSummary) => s.status === 'completed'
        );
        if (allCompleted && setsData.questionSets.length > 0) {
          router.push(`${rsvpBase}/complete`);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    fetchSets();
  }, [token, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gold-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-text-secondary">Failed to load question sets</p>
      </div>
    );
  }

  if (data.questionSets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-text-secondary mb-4">No question sets available yet.</p>
        <Button variant="outline" onClick={() => router.push(rsvpBase)}>
          Return to RSVP
        </Button>
      </div>
    );
  }

  const completedCount = data.questionSets.filter((s) => s.status === 'completed').length;
  const totalCount = data.questionSets.length;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-text-primary mb-1">
          Hi {data.attendee.firstName}!
        </h2>
        <p className="text-text-secondary">
          Complete your profile for {data.event.name} by answering these question sets.
        </p>
      </div>

      {/* Progress Summary */}
      <div className="mb-6 p-4 bg-bg-secondary rounded-lg border border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">Overall Progress</span>
          <span className="text-sm font-medium text-text-primary">
            {completedCount} of {totalCount} sets completed
          </span>
        </div>
        <div className="mt-2 h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-gold-primary transition-all duration-300"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Sets List */}
      <div className="space-y-3">
        {data.questionSets.map((set, index) => (
          <QuestionSetCard
            key={set.id}
            set={set}
            index={index}
            isNext={set.id === data.nextSetId}
            onStart={() => onStartSet(set.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface QuestionSetCardProps {
  set: QuestionSetSummary;
  index: number;
  isNext: boolean;
  onStart: () => void;
}

function QuestionSetCard({ set, index, isNext, onStart }: QuestionSetCardProps) {
  const isCompleted = set.status === 'completed';
  const isInProgress = set.status === 'in_progress';

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        isCompleted && 'opacity-60',
        isNext && 'ring-2 ring-gold-primary/50'
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            ) : (
              <Circle
                className={cn(
                  'w-5 h-5 flex-shrink-0',
                  isInProgress ? 'text-gold-primary' : 'text-text-tertiary'
                )}
              />
            )}
            <div>
              <CardTitle className="text-base">
                {set.title}
                {isNext && (
                  <span className="ml-2 text-xs font-normal text-gold-primary">Up Next</span>
                )}
              </CardTitle>
              {set.description && (
                <CardDescription className="mt-1 text-sm">{set.description}</CardDescription>
              )}
            </div>
          </div>
          <span className="text-xs text-text-tertiary">{set.questionCount} questions</span>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex items-center justify-between">
          <div className="text-xs text-text-tertiary">
            {isCompleted ? (
              <span className="text-green-500">Completed</span>
            ) : isInProgress ? (
              <span>
                {set.answeredCount} of {set.questionCount} answered
              </span>
            ) : (
              <span>Not started</span>
            )}
          </div>
          {!isCompleted && (
            <Button
              size="sm"
              variant={isNext ? 'default' : 'outline'}
              onClick={onStart}
              className={isNext ? 'bg-gold-primary hover:bg-gold-light text-bg-primary' : ''}
            >
              {isInProgress ? 'Continue' : 'Start'}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
