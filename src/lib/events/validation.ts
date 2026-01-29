import type { EventWizardData, ValidationStatus } from './types';

/**
 * Validators for each event wizard/editor section.
 */
export const eventValidators = {
  basics: (data: EventWizardData): ValidationStatus => {
    if (!data.name || !data.date || !data.startTime || !data.endTime) {
      return data.name || data.date ? 'incomplete' : 'invalid';
    }
    return 'valid';
  },

  venue: (data: EventWizardData): ValidationStatus => {
    if (!data.venueName || !data.venueAddress) {
      return data.venueName || data.venueAddress ? 'incomplete' : 'invalid';
    }
    return 'valid';
  },

  team: (): ValidationStatus => {
    return 'valid'; // Organizers are optional
  },

  rsvp: (data: EventWizardData): ValidationStatus => {
    if (data.capacity < 2 || data.capacity > 200) return 'invalid';
    return 'valid';
  },

  cards: (): ValidationStatus => {
    return 'valid'; // Card settings always valid
  },

  questions: (data: EventWizardData): ValidationStatus => {
    if (data.questions.length < 2) return 'incomplete';
    const hasInvalidSelect = data.questions.some(
      (q) =>
        (q.type === 'single_select' || q.type === 'multi_select' || q.type === 'ranking') &&
        (!q.config?.options || q.config.options.length < 2)
    );
    if (hasInvalidSelect) return 'invalid';
    return 'valid';
  },

  landingPage: (): ValidationStatus => {
    return 'valid'; // Landing page settings always valid
  },

  preview: (): ValidationStatus => {
    return 'valid'; // Preview/review step always valid
  },
};

/**
 * Get validation status for all sections.
 */
export function getValidationStatus(data: EventWizardData): Record<string, ValidationStatus> {
  return {
    basics: eventValidators.basics(data),
    venue: eventValidators.venue(data),
    team: eventValidators.team(),
    rsvp: eventValidators.rsvp(data),
    cards: eventValidators.cards(),
    questions: eventValidators.questions(data),
    'landing-page': eventValidators.landingPage(),
    preview: eventValidators.preview(),
  };
}

/**
 * Check if a wizard step can proceed (for wizard navigation).
 */
export function canProceedFromStep(data: EventWizardData, step: number): boolean {
  switch (step) {
    case 0: // Basics
      return !!(data.name && data.date && data.startTime && data.endTime);
    case 1: // Venue
      return !!(data.venueName && data.venueAddress);
    case 2: // Organizers
      return true; // Optional
    case 3: // RSVP
      return data.capacity > 0;
    case 4: // Cards
      return true; // Always valid
    case 5: // Questions
      return data.questions.length >= 2;
    case 6: // Landing Page
      return true; // Always valid
    case 7: // Review
      return true;
    default:
      return false;
  }
}
