'use client';

import { useState, useEffect } from 'react';
import { Search, Linkedin, Globe, FileText, Sparkles, CheckCircle, Share2 } from 'lucide-react';
import { ResearchStepper, type Step } from './ResearchStepper';

interface ResearchProgressViewProps {
  contactName: string;
  runId: string;
  contactId: string;
  onComplete: () => void;
  onError: (error: string) => void;
}

export const RESEARCH_STEPS: Step[] = [
  { label: 'Preparing search', icon: <Search className="h-5 w-5" /> },
  { label: 'Checking LinkedIn', icon: <Linkedin className="h-5 w-5" /> },
  { label: 'Discovering social profiles', icon: <Share2 className="h-5 w-5" /> },
  { label: 'Searching for sources', icon: <Globe className="h-5 w-5" /> },
  { label: 'Reading through findings', icon: <FileText className="h-5 w-5" /> },
  { label: 'Crafting recommendations', icon: <Sparkles className="h-5 w-5" /> },
  { label: 'Finalizing results', icon: <CheckCircle className="h-5 w-5" /> },
];

const PROGRESS_STAGE_MAP: Record<string, number> = {
  'Building search query...': 0,
  'Extracting LinkedIn profile...': 1,
  'Discovering social profiles...': 2,
  'Searching twitter...': 2,
  'Searching github...': 2,
  'Searching instagram...': 2,
  'Searching the web...': 3,
  'Analyzing findings...': 4,
  'Generating recommendations...': 5,
  'Research complete!': 6,
};

function getStepIndex(progressStage: string | null): number {
  if (!progressStage) return 0;
  return PROGRESS_STAGE_MAP[progressStage] ?? 0;
}

export function ResearchProgressView({
  contactName,
  runId,
  contactId,
  onComplete,
  onError,
}: ResearchProgressViewProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState<'running' | 'completed' | 'failed'>('running');

  useEffect(() => {
    let isSubscribed = true;
    let shouldContinuePolling = true;

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/contacts/${contactId}/research/${runId}`,
          { cache: 'no-store' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch research status');
        }

        const data = await response.json();

        if (!isSubscribed) return;

        // Update step based on progressStage
        const stepIndex = getStepIndex(data.progressStage);
        setCurrentStep(stepIndex);

        // Handle completion
        if (data.status === 'COMPLETED') {
          setStatus('completed');
          shouldContinuePolling = false;
          // Delay before closing to show completion state
          setTimeout(() => {
            if (isSubscribed) onComplete();
          }, 1500);
        }

        // Handle failure
        if (data.status === 'FAILED') {
          setStatus('failed');
          shouldContinuePolling = false;
          onError(data.errorMessage || 'Research failed');
        }
      } catch (err) {
        if (isSubscribed) {
          setStatus('failed');
          shouldContinuePolling = false;
          onError(err instanceof Error ? err.message : 'An error occurred');
        }
      }
    };

    // Initial poll
    poll();

    // Poll every 2 seconds
    const intervalId = setInterval(() => {
      if (shouldContinuePolling) poll();
    }, 2000);

    return () => {
      isSubscribed = false;
      shouldContinuePolling = false;
      clearInterval(intervalId);
    };
  }, [contactId, runId, onComplete, onError]);

  return (
    <div className="py-4">
      <p className="text-sm text-muted-foreground mb-4">
        Researching {contactName}...
      </p>
      <ResearchStepper
        steps={RESEARCH_STEPS}
        currentStep={currentStep}
        status={status}
      />
      {status === 'completed' && (
        <p className="text-sm text-gold-primary mt-4 text-center">
          Research complete! Loading results...
        </p>
      )}
    </div>
  );
}
