'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: string;
  label: string;
}

const STEPS: Step[] = [
  { id: 'basics', label: 'Basics' },
  { id: 'venue', label: 'Venue' },
  { id: 'organizers', label: 'Team' },
  { id: 'rsvp', label: 'RSVP' },
  { id: 'cards', label: 'Cards' },
  { id: 'questions', label: 'Questions' },
  { id: 'landing-page', label: 'Landing Page' },
  { id: 'review', label: 'Review' },
];

interface WizardStepperProps {
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick: (step: number) => void;
}

export function WizardStepper({
  currentStep,
  completedSteps,
  onStepClick,
}: WizardStepperProps) {
  return (
    <div className="flex items-center justify-between mb-8 px-4">
      {STEPS.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <button
            onClick={() => index < currentStep && onStepClick(index)}
            disabled={index > currentStep && !completedSteps.has(index)}
            className={cn(
              'flex flex-col items-center gap-2 transition-all duration-300',
              index < currentStep ? 'cursor-pointer' : 'cursor-default'
            )}
          >
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 border',
                index === currentStep && 'bg-gold-primary text-bg-primary border-gold-primary scale-110',
                index < currentStep && 'bg-gold-subtle text-gold-primary border-gold-primary',
                index > currentStep && 'bg-bg-tertiary text-text-tertiary border-border'
              )}
            >
              {completedSteps.has(index) && index < currentStep ? (
                <Check size={16} />
              ) : (
                index + 1
              )}
            </div>
            <span
              className={cn(
                'text-xs font-medium hidden sm:block',
                index === currentStep ? 'text-gold-primary' : 'text-text-tertiary'
              )}
            >
              {step.label}
            </span>
          </button>
          {index < STEPS.length - 1 && (
            <div
              className={cn(
                'flex-1 h-px mx-2 min-w-[20px]',
                index < currentStep ? 'bg-gold-primary' : 'bg-border'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
