'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import type { Event } from '@prisma/client';
import { eventWizardDataToApiPayload } from '@/lib/events/transforms';
import { useWizardState } from './hooks/useWizardState';
import { WizardStepper } from './WizardStepper';
import { WizardNavigation } from './WizardNavigation';
import { BasicsStep } from './steps/BasicsStep';
import { VenueStep } from './steps/VenueStep';
import { OrganizersStep } from './steps/OrganizersStep';
import { RSVPStep } from './steps/RSVPStep';
import { CardsStep } from './steps/CardsStep';
import { QuestionnaireStep } from './steps/QuestionnaireStep';
import { LandingPageStep } from './steps/LandingPageStep';
import { ReviewStep } from './steps/ReviewStep';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface EventWizardProps {
  event?: Event;
  mode: 'create' | 'edit';
}

export function EventWizard({ event, mode }: EventWizardProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const wizard = useWizardState(event);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const url = mode === 'edit'
        ? `/api/events/${event!.id}`
        : '/api/events';
      const method = mode === 'edit' ? 'PUT' : 'POST';

      // Transform wizard data to API format using centralized helper
      const apiData = {
        ...eventWizardDataToApiPayload(wizard.data),
        organizers: wizard.data.organizers.map(org => ({
          userId: org.odId,
          canInvite: org.permissions.canInvite,
          canCurate: org.permissions.canCurate,
          canEdit: org.permissions.canEdit,
          canManage: org.permissions.canManage,
        })),
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save event');
      }

      const savedEvent = await response.json();
      toast.success(mode === 'edit' ? 'Event updated!' : 'Event created!');
      router.push(`/events/${savedEvent.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (wizard.currentStep) {
      case 0:
        return <BasicsStep data={wizard.data} onChange={wizard.updateData} />;
      case 1:
        return <VenueStep data={wizard.data} onChange={wizard.updateData} />;
      case 2:
        return <OrganizersStep data={wizard.data} onChange={wizard.updateData} />;
      case 3:
        return <RSVPStep data={wizard.data} onChange={wizard.updateData} />;
      case 4:
        return <CardsStep data={wizard.data} onChange={wizard.updateData} />;
      case 5:
        return <QuestionnaireStep data={wizard.data} onChange={wizard.updateData} />;
      case 6:
        return <LandingPageStep data={wizard.data} onChange={wizard.updateData} />;
      case 7:
        return <ReviewStep data={wizard.data} onEdit={wizard.goToStep} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <Link
        href="/events"
        className="inline-flex items-center text-sm text-text-secondary hover:text-text-primary mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Events
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-semibold">
          <span className="text-gold-primary">{mode === 'edit' ? 'Edit' : 'Create'}</span> Event
        </h1>
        <p className="text-text-secondary mt-2">
          {mode === 'edit' ? 'Update your event details' : 'Set up your networking event in minutes'}
        </p>
      </div>

      <WizardStepper
        currentStep={wizard.currentStep}
        completedSteps={wizard.completedSteps}
        onStepClick={wizard.goToStep}
      />

      <Card className="bg-bg-secondary border-border overflow-hidden">
        <CardContent className="pt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={wizard.currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      <WizardNavigation
        currentStep={wizard.currentStep}
        totalSteps={wizard.totalSteps}
        canProceed={wizard.canProceed}
        isSubmitting={isSubmitting}
        isEditMode={mode === 'edit'}
        onBack={wizard.prevStep}
        onNext={wizard.nextStep}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
