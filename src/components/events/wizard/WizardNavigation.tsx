'use client';

import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  canProceed: boolean;
  isSubmitting: boolean;
  isEditMode: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function WizardNavigation({
  currentStep,
  totalSteps,
  canProceed,
  isSubmitting,
  isEditMode,
  onBack,
  onNext,
  onSubmit,
}: WizardNavigationProps) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="flex justify-between mt-8">
      <Button
        variant="outline"
        onClick={onBack}
        disabled={isFirstStep || isSubmitting}
        className={isFirstStep ? 'opacity-0 pointer-events-none' : ''}
      >
        <ChevronLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {isLastStep ? (
        <Button
          onClick={onSubmit}
          disabled={!canProceed || isSubmitting}
          className="bg-gold-primary hover:bg-gold-light text-bg-primary"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {isEditMode ? 'Saving...' : 'Creating...'}
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              {isEditMode ? 'Save Changes' : 'Create Event'}
            </>
          )}
        </Button>
      ) : (
        <Button
          onClick={onNext}
          disabled={!canProceed || isSubmitting}
          className="bg-gold-primary hover:bg-gold-light text-bg-primary"
        >
          Continue
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      )}
    </div>
  );
}
