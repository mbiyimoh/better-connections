'use client';

import { Calendar, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Contact } from '@/types/contact';
import { EditableSection } from './EditableSection';

interface RelationshipSectionProps {
  contact: Contact;
  isEditing: boolean;
  onEditStart: () => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  formData: Partial<Contact>;
  updateField: <K extends keyof Contact>(field: K, value: Contact[K]) => void;
}

const strengthLabels = ['', 'Weak', 'Casual', 'Good', 'Strong'];

const strengthDescriptions: Record<number, string> = {
  1: "Distant connection - know through others or met briefly",
  2: "Friendly acquaintance - met a few times, positive rapport",
  3: "Solid relationship - regular contact, would help if asked",
  4: "Close connection - trusted relationship, can reach out anytime",
};

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateForInput(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0] ?? '';
}

export function RelationshipSection({
  contact,
  isEditing,
  onEditStart,
  onSave,
  onCancel,
  isSaving,
  formData,
  updateField,
}: RelationshipSectionProps) {
  const currentStrength = formData.relationshipStrength ?? contact.relationshipStrength;

  return (
    <EditableSection
      title="Relationship"
      sectionId="relationship"
      isEditing={isEditing}
      onEditStart={onEditStart}
      onSave={onSave}
      onCancel={onCancel}
      isSaving={isSaving}
      editContent={
        <div className="space-y-4">
          {/* Relationship Strength Toggle */}
          <div className="space-y-2">
            <Label>Relationship Strength</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((level) => (
                <TooltipProvider key={level}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => updateField('relationshipStrength', level)}
                        className={cn(
                          'flex h-11 flex-1 items-center justify-center rounded-lg border text-sm font-medium transition-colors md:h-10',
                          currentStrength >= level
                            ? 'border-gold-primary bg-gold-primary text-bg-primary'
                            : 'border-border bg-bg-tertiary text-text-secondary hover:border-gold-primary/50'
                        )}
                      >
                        {strengthLabels[level]}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{strengthDescriptions[level]}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>

          {/* How We Met */}
          <div className="space-y-2">
            <Label htmlFor="howWeMet">How We Met</Label>
            <Textarea
              id="howWeMet"
              value={formData.howWeMet || ''}
              onChange={(e) => updateField('howWeMet', e.target.value)}
              placeholder="Met at TechCrunch Disrupt 2024..."
              rows={3}
              className="min-h-[80px] md:min-h-[60px]"
            />
          </div>

          {/* Last Contact Date */}
          <div className="space-y-2">
            <Label htmlFor="lastContactDate">Last Contact</Label>
            <Input
              id="lastContactDate"
              type="date"
              value={formatDateForInput(formData.lastContactDate as string | null)}
              onChange={(e) => updateField('lastContactDate', e.target.value || null)}
              className="h-12 md:h-10"
            />
          </div>

          {/* Referred By */}
          <div className="space-y-2">
            <Label htmlFor="referredBy">Referred By</Label>
            <Input
              id="referredBy"
              value={formData.referredBy || ''}
              onChange={(e) => updateField('referredBy', e.target.value)}
              placeholder="Who referred you?"
              className="h-12 md:h-10"
            />
          </div>

          {/* Relationship History */}
          <div className="space-y-2">
            <Label htmlFor="relationshipHistory">Relationship History</Label>
            <Textarea
              id="relationshipHistory"
              value={formData.relationshipHistory || ''}
              onChange={(e) => updateField('relationshipHistory', e.target.value)}
              placeholder="History of interactions, context..."
              rows={4}
              className="min-h-[100px] md:min-h-[80px]"
            />
          </div>
        </div>
      }
    >
      {/* View Mode */}
      <div className="space-y-4">
        {/* Relationship Strength */}
        <div>
          <p className="mb-1 text-sm text-text-tertiary">Strength</p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-help">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={cn(
                          'h-2 w-6 rounded-full',
                          level <= contact.relationshipStrength
                            ? 'bg-gold-primary'
                            : 'bg-white/10'
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-text-secondary">
                    {strengthLabels[contact.relationshipStrength]}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>{strengthDescriptions[contact.relationshipStrength]}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* How We Met */}
        {contact.howWeMet ? (
          <div>
            <p className="mb-1 text-sm text-text-tertiary">How We Met</p>
            <p className="text-white">{contact.howWeMet}</p>
          </div>
        ) : (
          <button
            onClick={onEditStart}
            className="text-sm italic text-text-tertiary hover:text-text-secondary"
          >
            Add how you met...
          </button>
        )}

        {/* Last Contact */}
        <div>
          <p className="mb-1 text-sm text-text-tertiary">Last Contact</p>
          <div className="flex items-center gap-2 text-text-secondary">
            <Calendar className="h-4 w-4" />
            {contact.lastContactDate ? (
              formatDate(contact.lastContactDate)
            ) : (
              <button
                onClick={onEditStart}
                className="italic text-text-tertiary hover:text-text-secondary"
              >
                Not set
              </button>
            )}
          </div>
        </div>

        {/* Referred By */}
        {contact.referredBy ? (
          <div>
            <p className="mb-1 text-sm text-text-tertiary">Referred By</p>
            <div className="flex items-center gap-2 text-text-secondary">
              <UserPlus className="h-4 w-4" />
              {contact.referredBy}
            </div>
          </div>
        ) : null}

        {/* Relationship History */}
        {contact.relationshipHistory ? (
          <div>
            <p className="mb-1 text-sm text-text-tertiary">Relationship History</p>
            <p className="text-white whitespace-pre-wrap">{contact.relationshipHistory}</p>
          </div>
        ) : null}
      </div>
    </EditableSection>
  );
}
