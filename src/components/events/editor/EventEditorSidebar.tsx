'use client';

import { FileText, MapPin, Users, Mail, CreditCard, HelpCircle, Layout, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const SECTIONS = [
  { id: 'basics', label: 'Basics', icon: FileText },
  { id: 'venue', label: 'Venue', icon: MapPin },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'rsvp', label: 'RSVP', icon: Mail },
  { id: 'cards', label: 'Cards', icon: CreditCard },
  { id: 'questions', label: 'Questions', icon: HelpCircle },
  { id: 'landing-page', label: 'Landing Page', icon: Layout },
  { id: 'preview', label: 'Preview', icon: Eye },
] as const;

export type SectionId = (typeof SECTIONS)[number]['id'];

type ValidationStatus = 'valid' | 'invalid' | 'incomplete';

interface EventEditorSidebarProps {
  activeSection: string;
  validationStatus: Record<string, ValidationStatus>;
  onSectionClick: (sectionId: string) => void;
}

export function EventEditorSidebar({
  activeSection,
  validationStatus,
  onSectionClick,
}: EventEditorSidebarProps) {
  const isMobile = useMediaQuery('(max-width: 1023px)');

  if (isMobile) {
    return (
      <div className="sticky top-14 z-10 bg-bg-primary border-b border-border overflow-x-auto">
        <div className="flex gap-1 p-2 min-w-max">
          {SECTIONS.map((section) => {
            const isActive = activeSection === section.id;
            const status = validationStatus[section.id];

            return (
              <button
                key={section.id}
                onClick={() => onSectionClick(section.id)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-gold-subtle text-gold-primary'
                    : 'text-text-secondary hover:text-white hover:bg-bg-tertiary',
                  status === 'invalid' && 'ring-1 ring-error/50'
                )}
              >
                {section.label}
                {status === 'invalid' && (
                  <span className="ml-1 w-1.5 h-1.5 rounded-full bg-error inline-block" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-bg-secondary sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
      <div className="p-4">
        <h2 className="text-sm font-medium text-text-secondary mb-4">Event Details</h2>

        <nav className="space-y-1">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            const status = validationStatus[section.id];

            return (
              <button
                key={section.id}
                onClick={() => onSectionClick(section.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                  isActive
                    ? 'bg-gold-subtle text-gold-primary border-l-2 border-gold-primary -ml-0.5 pl-[calc(0.75rem+2px)]'
                    : 'text-text-secondary hover:text-white hover:bg-bg-tertiary'
                )}
              >
                <Icon size={16} />
                <span className="flex-1">{section.label}</span>
                {status === 'invalid' && (
                  <span className="w-2 h-2 rounded-full bg-error" />
                )}
                {status === 'incomplete' && (
                  <span className="w-2 h-2 rounded-full bg-warning" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

export { SECTIONS };
