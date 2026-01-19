'use client';

import { CreditCard, User, Briefcase, Target, MessageSquare } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { EventWizardData } from '../hooks/useWizardState';

interface CardsStepProps {
  data: EventWizardData;
  onChange: (updates: Partial<EventWizardData>) => void;
}

interface FieldGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  fields: Array<{
    key: string;
    label: string;
    description: string;
  }>;
}

const FIELD_GROUPS: FieldGroup[] = [
  {
    id: 'professional',
    label: 'Professional',
    icon: <Briefcase className="w-4 h-4" />,
    fields: [
      { key: 'role', label: 'Job Role', description: 'Their current title or role' },
      { key: 'company', label: 'Company', description: 'Where they work' },
      { key: 'expertise', label: 'Expertise', description: 'Their areas of expertise' },
    ],
  },
  {
    id: 'goals',
    label: 'Goals & Needs',
    icon: <Target className="w-4 h-4" />,
    fields: [
      { key: 'lookingFor', label: 'Looking For', description: 'What they want to find' },
      { key: 'canHelp', label: 'Can Help With', description: 'How they can help others' },
      { key: 'whyNow', label: 'Why Now', description: 'Current priorities or context' },
    ],
  },
  {
    id: 'conversation',
    label: 'Conversation',
    icon: <MessageSquare className="w-4 h-4" />,
    fields: [
      { key: 'conversationStarters', label: 'Conversation Starters', description: 'AI-generated talking points' },
    ],
  },
];

export function CardsStep({ data, onChange }: CardsStepProps) {
  const toggleField = (key: string) => {
    const newSettings = {
      ...data.cardSettings,
      [key]: !data.cardSettings[key],
    };
    onChange({ cardSettings: newSettings });
  };

  const enabledCount = Object.values(data.cardSettings).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white mb-1">Trading Card Display</h2>
        <p className="text-text-secondary">Choose what attendees see on each other&apos;s cards</p>
      </div>

      {/* Preview Card */}
      <div className="p-5 rounded-xl bg-bg-tertiary border border-border">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-4 h-4 text-gold-primary" />
          <span className="text-sm font-medium text-white">Card Preview</span>
          <span className="text-xs text-text-tertiary ml-auto">{enabledCount} fields shown</span>
        </div>

        <div className="p-4 rounded-lg bg-bg-secondary border border-border/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-gold-subtle flex items-center justify-center shrink-0">
              <User className="w-6 h-6 text-gold-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold">Sample Attendee</p>
              {data.cardSettings.role && (
                <p className="text-text-secondary text-sm">Product Manager</p>
              )}
              {data.cardSettings.company && (
                <p className="text-text-tertiary text-sm">@ Acme Corp</p>
              )}
            </div>
          </div>

          {data.cardSettings.expertise && (
            <div className="mt-3 flex flex-wrap gap-1">
              <span className="text-xs px-2 py-0.5 bg-bg-tertiary rounded text-text-secondary">AI/ML</span>
              <span className="text-xs px-2 py-0.5 bg-bg-tertiary rounded text-text-secondary">Product</span>
            </div>
          )}

          {(data.cardSettings.lookingFor || data.cardSettings.canHelp) && (
            <div className="mt-3 space-y-2">
              {data.cardSettings.lookingFor && (
                <div className="text-sm">
                  <span className="text-text-tertiary">Looking for: </span>
                  <span className="text-text-secondary">Technical co-founder</span>
                </div>
              )}
              {data.cardSettings.canHelp && (
                <div className="text-sm">
                  <span className="text-text-tertiary">Can help with: </span>
                  <span className="text-text-secondary">Product strategy, GTM</span>
                </div>
              )}
            </div>
          )}

          {data.cardSettings.whyNow && (
            <div className="mt-3 text-sm text-gold-primary italic">
              &quot;Raising seed round, looking to close by Q2&quot;
            </div>
          )}

          {data.cardSettings.conversationStarters && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs text-text-tertiary mb-1">Conversation starters:</p>
              <p className="text-sm text-text-secondary">&quot;Ask about their AI product roadmap&quot;</p>
            </div>
          )}
        </div>
      </div>

      {/* Field Selection */}
      <div className="space-y-4">
        {FIELD_GROUPS.map((group) => (
          <div key={group.id} className="p-4 rounded-xl bg-bg-tertiary border border-border">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-gold-primary">{group.icon}</span>
              <span className="text-white font-medium">{group.label}</span>
            </div>

            <div className="space-y-3">
              {group.fields.map((field) => (
                <div key={field.key} className="flex items-start gap-3">
                  <Checkbox
                    id={field.key}
                    checked={data.cardSettings[field.key] ?? false}
                    onCheckedChange={() => toggleField(field.key)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={field.key}
                      className="text-white cursor-pointer block"
                    >
                      {field.label}
                    </Label>
                    <p className="text-xs text-text-tertiary">{field.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-gold-subtle border border-gold-primary/30">
        <p className="text-sm text-text-secondary">
          <strong className="text-white">Tip:</strong> More fields help attendees understand each other better,
          but too many can be overwhelming. We recommend 5-7 fields for the best experience.
        </p>
      </div>
    </div>
  );
}
