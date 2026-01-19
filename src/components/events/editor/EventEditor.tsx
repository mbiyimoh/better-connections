'use client';

import type { Event } from '@prisma/client';
import type { EventWizardData } from '@/lib/events';
import { useEventEditor } from './hooks/useEventEditor';
import { useActiveSection } from './hooks/useActiveSection';
import { EventEditorHeader } from './EventEditorHeader';
import { EventEditorSidebar, SECTIONS } from './EventEditorSidebar';
import { Section } from './Section';

// Import existing step components (we'll use their content)
import { BasicsStep } from '@/components/events/wizard/steps/BasicsStep';
import { VenueStep } from '@/components/events/wizard/steps/VenueStep';
import { OrganizersStep } from '@/components/events/wizard/steps/OrganizersStep';
import { RSVPStep } from '@/components/events/wizard/steps/RSVPStep';
import { CardsStep } from '@/components/events/wizard/steps/CardsStep';
import { QuestionnaireStep } from '@/components/events/wizard/steps/QuestionnaireStep';
import { LandingPageStep } from '@/components/events/wizard/steps/LandingPageStep';
import { EventEditorPreview } from './EventEditorPreview';

const SECTION_IDS = SECTIONS.map((s) => s.id);

interface EventEditorProps {
  event?: Event;
  initialOrganizers?: EventWizardData['organizers'];
}

export function EventEditor({ event, initialOrganizers }: EventEditorProps) {
  const editor = useEventEditor(event, initialOrganizers);
  const activeSection = useActiveSection(SECTION_IDS);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <EventEditorHeader
        isNew={!event}
        isDirty={editor.isDirty}
        isSaving={editor.isSaving}
        onSave={editor.save}
      />

      <div className="flex">
        <EventEditorSidebar
          activeSection={activeSection}
          validationStatus={editor.validationStatus}
          onSectionClick={scrollToSection}
        />

        <main className="flex-1 max-w-4xl mx-auto px-6 pb-24">
          <Section id="basics" title="Basics" description="Event name, date, and time">
            <BasicsStep data={editor.data} onChange={editor.update} />
          </Section>

          <Section id="venue" title="Venue" description="Location and logistics">
            <VenueStep data={editor.data} onChange={editor.update} />
          </Section>

          <Section id="team" title="Team" description="Organizers and permissions">
            <OrganizersStep data={editor.data} onChange={editor.update} />
          </Section>

          <Section id="rsvp" title="RSVP" description="Capacity and timing settings">
            <RSVPStep data={editor.data} onChange={editor.update} />
          </Section>

          <Section id="cards" title="Cards" description="Trading card field configuration">
            <CardsStep data={editor.data} onChange={editor.update} />
          </Section>

          <Section id="questions" title="Questions" description="Attendee questionnaire">
            <QuestionnaireStep data={editor.data} onChange={editor.update} />
          </Section>

          <Section id="landing-page" title="Landing Page" description="Public page configuration">
            <LandingPageStep data={editor.data} onChange={editor.update} />
          </Section>

          <Section id="preview" title="Preview" description="Review your event">
            <EventEditorPreview data={editor.data} onEdit={scrollToSection} eventId={event?.id} />
          </Section>
        </main>
      </div>
    </div>
  );
}
