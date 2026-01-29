'use client';

import { useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { QuestionSetFlow, QuestionSetQuestionnaire, ProfileSuggestionReview } from '@/components/rsvp';
import type { ProfileSuggestion } from '@/lib/m33t/suggestion-schema';

type FlowState =
  | { step: 'list' }
  | { step: 'questionnaire'; setId: string }
  | { step: 'review'; setId: string; suggestions: ProfileSuggestion[] };

export default function QuestionSetsPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [flowState, setFlowState] = useState<FlowState>({ step: 'list' });

  const handleStartSet = useCallback((setId: string) => {
    setFlowState({ step: 'questionnaire', setId });
  }, []);

  const handleQuestionnaireComplete = useCallback(
    (suggestions: ProfileSuggestion[]) => {
      if (flowState.step !== 'questionnaire') return;

      if (suggestions.length > 0) {
        setFlowState({ step: 'review', setId: flowState.setId, suggestions });
      } else {
        // No suggestions, go back to list
        setFlowState({ step: 'list' });
      }
    },
    [flowState]
  );

  const handleQuestionnaireBack = useCallback(() => {
    setFlowState({ step: 'list' });
  }, []);

  const handleReviewComplete = useCallback(() => {
    setFlowState({ step: 'list' });
  }, []);

  const handleReviewSkip = useCallback(() => {
    setFlowState({ step: 'list' });
  }, []);

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="bg-bg-secondary border-b border-border py-6">
        <div className="max-w-2xl mx-auto px-4">
          <p className="text-sm text-text-secondary mb-1">Complete your profile</p>
          <h1 className="text-2xl font-bold text-text-primary">Question Sets</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {flowState.step === 'list' && (
          <QuestionSetFlow token={token} onStartSet={handleStartSet} />
        )}

        {flowState.step === 'questionnaire' && (
          <QuestionSetQuestionnaire
            token={token}
            setId={flowState.setId}
            onComplete={handleQuestionnaireComplete}
            onBack={handleQuestionnaireBack}
          />
        )}

        {flowState.step === 'review' && (
          <ProfileSuggestionReview
            token={token}
            setId={flowState.setId}
            suggestions={flowState.suggestions}
            onComplete={handleReviewComplete}
            onSkip={handleReviewSkip}
          />
        )}
      </div>
    </div>
  );
}
