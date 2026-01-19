'use client';

import { useState, useCallback, useMemo } from 'react';
import type { Event } from '@prisma/client';
import {
  type EventWizardData,
  DEFAULT_EVENT_DATA,
  mapEventToWizardData,
  canProceedFromStep,
} from '@/lib/events';

// Re-export EventWizardData for backward compatibility
export type { EventWizardData } from '@/lib/events';

interface WizardState {
  currentStep: number;
  completedSteps: Set<number>;
  data: EventWizardData;
  isDirty: boolean;
}

const TOTAL_STEPS = 8;

export function useWizardState(initialEvent?: Event) {
  const [state, setState] = useState<WizardState>(() => ({
    currentStep: 0,
    completedSteps: new Set(initialEvent ? [0, 1, 2, 3, 4, 5, 6, 7] : []),
    data: initialEvent ? mapEventToWizardData(initialEvent) : DEFAULT_EVENT_DATA,
    isDirty: false,
  }));

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < TOTAL_STEPS) {
      setState(prev => ({ ...prev, currentStep: step }));
    }
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, TOTAL_STEPS - 1),
      completedSteps: new Set([...prev.completedSteps, prev.currentStep]),
    }));
  }, []);

  const prevStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0),
    }));
  }, []);

  const updateData = useCallback((updates: Partial<EventWizardData>) => {
    setState(prev => ({
      ...prev,
      data: { ...prev.data, ...updates },
      isDirty: true,
    }));
  }, []);

  const isStepComplete = useCallback((step: number) => {
    return state.completedSteps.has(step);
  }, [state.completedSteps]);

  const canProceed = useMemo(() => {
    return canProceedFromStep(state.data, state.currentStep);
  }, [state]);

  return {
    currentStep: state.currentStep,
    completedSteps: state.completedSteps,
    data: state.data,
    isDirty: state.isDirty,
    totalSteps: TOTAL_STEPS,
    goToStep,
    nextStep,
    prevStep,
    updateData,
    isStepComplete,
    canProceed,
  };
}
