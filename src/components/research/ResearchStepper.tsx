'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Step {
  label: string;
  icon: React.ReactNode;
}

export interface ResearchStepperProps {
  steps: Step[];
  currentStep: number; // 0-indexed, -1 for not started
  status: 'running' | 'completed' | 'failed';
}

export function ResearchStepper({ steps, currentStep, status }: ResearchStepperProps) {
  return (
    <div className="space-y-0">
      {steps.map((step, index) => {
        const isCompleted = status === 'completed' || index < currentStep;
        const isCurrent = status === 'running' && index === currentStep;
        const isPending = index > currentStep && status !== 'completed';

        return (
          <div key={index} className="relative">
            {/* Connector line (except for last item) */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'absolute left-[19px] top-10 h-4 w-px',
                  isCompleted ? 'bg-gold-primary/50' : 'bg-border'
                )}
              />
            )}

            {/* Step row */}
            <motion.div
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className={cn(
                'flex items-center gap-3 py-2 px-3 rounded-lg transition-all',
                isCurrent && 'border-l-2 border-gold-primary bg-gold-subtle'
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                  isCompleted && 'text-gold-primary',
                  isCurrent && 'text-gold-primary',
                  isPending && 'text-muted-foreground/50'
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : isCurrent ? (
                  <motion.div
                    animate={{ scale: [1, 1.1, 1], opacity: [1, 0.8, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    {step.icon}
                  </motion.div>
                ) : (
                  step.icon
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  'text-sm font-medium',
                  isCompleted && 'text-muted-foreground',
                  isCurrent && 'text-white',
                  isPending && 'text-muted-foreground/50'
                )}
              >
                {step.label}
              </span>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
