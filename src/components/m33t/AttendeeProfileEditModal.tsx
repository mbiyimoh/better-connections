'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, X, Plus, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Profile, ProfileOverrides } from '@/lib/m33t/schemas';

interface AttendeeProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  attendeeId: string;
  onSave: () => void;
}

interface AttendeeData {
  id: string;
  firstName: string;
  lastName: string | null;
  profile: Profile | null;
  profileOverrides: ProfileOverrides | null;
  overriddenFields: string[];
  overridesEditedAt: string | null;
  overridesEditedBy: { id: string; name: string } | null;
}

interface FieldState {
  value: string;
  isOverridden: boolean;
  isHidden: boolean;
}

export function AttendeeProfileEditModal({
  isOpen,
  onClose,
  eventId,
  attendeeId,
  onSave,
}: AttendeeProfileEditModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attendee, setAttendee] = useState<AttendeeData | null>(null);

  // Form state for each field
  const [role, setRole] = useState<FieldState>({ value: '', isOverridden: false, isHidden: false });
  const [company, setCompany] = useState<FieldState>({ value: '', isOverridden: false, isHidden: false });
  const [location, setLocation] = useState<FieldState>({ value: '', isOverridden: false, isHidden: false });
  const [currentFocus, setCurrentFocus] = useState<FieldState>({ value: '', isOverridden: false, isHidden: false });

  // Expertise state (special handling for surgical editing)
  const [expertiseTags, setExpertiseTags] = useState<string[]>([]);
  const [baseTags, setBaseTags] = useState<string[]>([]);
  const [removedTags, setRemovedTags] = useState<string[]>([]);
  const [addedTags, setAddedTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [expertiseHidden, setExpertiseHidden] = useState(false);

  // Fetch attendee data
  const fetchAttendee = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/attendees/${attendeeId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setAttendee(data);

      // Initialize form state from data
      const profile = data.profile as Profile | null;
      const overrides = data.profileOverrides as ProfileOverrides | null;
      const overriddenFields = data.overriddenFields as string[];

      // Role
      const roleOverridden = overriddenFields.includes('role');
      const roleHidden = overrides?.role === null;
      setRole({
        value: roleHidden ? '' : (overrides?.role ?? profile?.role ?? ''),
        isOverridden: roleOverridden,
        isHidden: roleHidden,
      });

      // Company
      const companyOverridden = overriddenFields.includes('company');
      const companyHidden = overrides?.company === null;
      setCompany({
        value: companyHidden ? '' : (overrides?.company ?? profile?.company ?? ''),
        isOverridden: companyOverridden,
        isHidden: companyHidden,
      });

      // Location
      const locationOverridden = overriddenFields.includes('location');
      const locationHidden = overrides?.location === null;
      setLocation({
        value: locationHidden ? '' : (overrides?.location ?? profile?.location ?? ''),
        isOverridden: locationOverridden,
        isHidden: locationHidden,
      });

      // Current Focus
      const focusOverridden = overriddenFields.includes('currentFocus');
      const focusHidden = overrides?.currentFocus === null;
      setCurrentFocus({
        value: focusHidden ? '' : (overrides?.currentFocus ?? profile?.currentFocus ?? ''),
        isOverridden: focusOverridden,
        isHidden: focusHidden,
      });

      // Expertise - store base tags for surgical editing
      const profileTags = profile?.expertise ?? [];
      setBaseTags(profileTags);

      const expertiseOverride = overrides?.expertise;
      if (expertiseOverride === null) {
        setExpertiseHidden(true);
        setExpertiseTags([]);
        setRemovedTags([]);
        setAddedTags([]);
      } else if (Array.isArray(expertiseOverride)) {
        // Complete replacement mode
        setExpertiseTags(expertiseOverride);
        setRemovedTags([]);
        setAddedTags([]);
      } else if (expertiseOverride && typeof expertiseOverride === 'object') {
        // Surgical mode
        const removed = expertiseOverride.remove ?? [];
        const added = expertiseOverride.add ?? [];
        const displayed = profileTags.filter(t => !removed.includes(t));
        added.forEach(t => {
          if (!displayed.includes(t)) displayed.push(t);
        });
        setExpertiseTags(displayed);
        setRemovedTags(removed);
        setAddedTags(added);
      } else {
        // No override - use base
        setExpertiseTags(profileTags);
        setRemovedTags([]);
        setAddedTags([]);
      }
      setExpertiseHidden(expertiseOverride === null);
    } catch (error) {
      console.error('Error fetching attendee:', error);
      toast.error('Failed to load attendee data');
    } finally {
      setLoading(false);
    }
  }, [eventId, attendeeId]);

  useEffect(() => {
    if (!isOpen) return;
    fetchAttendee();
  }, [isOpen, fetchAttendee]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build overrides object - only include fields that are actually overridden
      const overrides: ProfileOverrides = {};

      // Role
      if (role.isHidden) {
        overrides.role = null;
      } else if (role.isOverridden) {
        overrides.role = role.value;
      }

      // Company
      if (company.isHidden) {
        overrides.company = null;
      } else if (company.isOverridden) {
        overrides.company = company.value;
      }

      // Location
      if (location.isHidden) {
        overrides.location = null;
      } else if (location.isOverridden) {
        overrides.location = location.value;
      }

      // Current Focus
      if (currentFocus.isHidden) {
        overrides.currentFocus = null;
      } else if (currentFocus.isOverridden) {
        overrides.currentFocus = currentFocus.value;
      }

      // Expertise
      if (expertiseHidden) {
        overrides.expertise = null;
      } else if (removedTags.length > 0 || addedTags.length > 0) {
        overrides.expertise = { remove: removedTags, add: addedTags };
      }

      const res = await fetch(`/api/events/${eventId}/attendees/${attendeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileOverrides: overrides }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save');
      }

      toast.success('Profile customizations saved');
      onSave();
    } catch (error) {
      console.error('Error saving overrides:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const resetField = (field: 'role' | 'company' | 'location' | 'currentFocus') => {
    const profile = attendee?.profile;
    const baseValue = profile?.[field] ?? '';
    const setter = {
      role: setRole,
      company: setCompany,
      location: setLocation,
      currentFocus: setCurrentFocus,
    }[field];
    setter({ value: baseValue, isOverridden: false, isHidden: false });
  };

  const removeTag = (tag: string) => {
    if (baseTags.includes(tag)) {
      // Tag is from base - mark as removed
      if (!removedTags.includes(tag)) {
        setRemovedTags(prev => [...prev, tag]);
      }
    } else {
      // Tag was added - just remove from added
      setAddedTags(prev => prev.filter(t => t !== tag));
    }
    setExpertiseTags(prev => prev.filter(t => t !== tag));
  };

  const addTag = () => {
    const tag = newTagInput.trim();
    if (!tag || expertiseTags.includes(tag)) {
      setNewTagInput('');
      return;
    }

    if (baseTags.includes(tag) && removedTags.includes(tag)) {
      // Re-adding a removed base tag
      setRemovedTags(prev => prev.filter(t => t !== tag));
    } else if (!baseTags.includes(tag)) {
      // New tag
      setAddedTags(prev => [...prev, tag]);
    }

    setExpertiseTags(prev => [...prev, tag]);
    setNewTagInput('');
  };

  const resetExpertise = () => {
    setExpertiseTags(baseTags);
    setRemovedTags([]);
    setAddedTags([]);
    setExpertiseHidden(false);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-bg-secondary border-border">
        <DialogHeader>
          <DialogTitle className="text-text-primary">
            Edit Attendee Profile
            {attendee && (
              <span className="font-normal text-text-secondary ml-2">
                {attendee.firstName} {attendee.lastName}
              </span>
            )}
          </DialogTitle>
          {attendee?.overridesEditedBy && (
            <p className="text-xs text-text-tertiary mt-1">
              Last edited by {attendee.overridesEditedBy.name}
              {attendee.overridesEditedAt && (
                <> {formatDistanceToNow(new Date(attendee.overridesEditedAt))} ago</>
              )}
            </p>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-text-secondary" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Role Field */}
            <FieldEditor
              label="Role"
              value={role.value}
              onChange={(v) => setRole({ ...role, value: v, isOverridden: true })}
              isOverridden={role.isOverridden}
              isHidden={role.isHidden}
              onHideChange={(h) => setRole({ ...role, isHidden: h, isOverridden: true })}
              onReset={() => resetField('role')}
              baseValue={attendee?.profile?.role}
            />

            {/* Company Field */}
            <FieldEditor
              label="Company"
              value={company.value}
              onChange={(v) => setCompany({ ...company, value: v, isOverridden: true })}
              isOverridden={company.isOverridden}
              isHidden={company.isHidden}
              onHideChange={(h) => setCompany({ ...company, isHidden: h, isOverridden: true })}
              onReset={() => resetField('company')}
              baseValue={attendee?.profile?.company}
            />

            {/* Location Field */}
            <FieldEditor
              label="Location"
              value={location.value}
              onChange={(v) => setLocation({ ...location, value: v, isOverridden: true })}
              isOverridden={location.isOverridden}
              isHidden={location.isHidden}
              onHideChange={(h) => setLocation({ ...location, isHidden: h, isOverridden: true })}
              onReset={() => resetField('location')}
              baseValue={attendee?.profile?.location}
            />

            {/* Expertise Tags */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-text-primary">Expertise Tags</Label>
                <Button variant="ghost" size="sm" onClick={resetExpertise} className="text-text-secondary hover:text-text-primary">
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </Button>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  id="hide-expertise"
                  checked={expertiseHidden}
                  onCheckedChange={(checked) => setExpertiseHidden(!!checked)}
                />
                <Label htmlFor="hide-expertise" className="text-sm text-text-secondary">
                  Hide expertise section
                </Label>
              </div>

              {!expertiseHidden && (
                <>
                  <div className="flex flex-wrap gap-2 p-3 border border-border rounded-lg min-h-[60px] bg-bg-tertiary">
                    {expertiseTags.map((tag) => {
                      const isFromBase = baseTags.includes(tag);
                      const isAdded = addedTags.includes(tag);
                      return (
                        <Badge
                          key={tag}
                          variant="outline"
                          className={`
                            ${isAdded ? 'border-success/50 text-success' : ''}
                            ${isFromBase && !isAdded ? 'border-border text-text-secondary' : ''}
                          `}
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="ml-1 hover:text-error"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      );
                    })}
                    {expertiseTags.length === 0 && (
                      <span className="text-sm text-text-tertiary">No expertise tags</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Add tag..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="flex-1 bg-bg-tertiary border-border text-text-primary"
                    />
                    <Button variant="outline" size="sm" onClick={addTag} className="border-border">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}

              <FieldStatusIndicator
                isOverridden={removedTags.length > 0 || addedTags.length > 0 || expertiseHidden}
                baseValue={baseTags.length > 0 ? baseTags.join(', ') : undefined}
              />
            </div>

            {/* Current Focus Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-text-primary">Current Focus</Label>
                <Button variant="ghost" size="sm" onClick={() => resetField('currentFocus')} className="text-text-secondary hover:text-text-primary">
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </Button>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  id="hide-focus"
                  checked={currentFocus.isHidden}
                  onCheckedChange={(checked) => setCurrentFocus({ ...currentFocus, isHidden: !!checked, isOverridden: true })}
                />
                <Label htmlFor="hide-focus" className="text-sm text-text-secondary">
                  Hide this field
                </Label>
              </div>

              {!currentFocus.isHidden && (
                <Textarea
                  value={currentFocus.value}
                  onChange={(e) => setCurrentFocus({ ...currentFocus, value: e.target.value, isOverridden: true })}
                  placeholder="What are they currently working on?"
                  rows={3}
                  className="bg-bg-tertiary border-border text-text-primary"
                />
              )}

              <FieldStatusIndicator
                isOverridden={currentFocus.isOverridden}
                baseValue={attendee?.profile?.currentFocus}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="border-border text-text-secondary">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-gold-primary hover:bg-gold-light text-bg-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Sub-components

interface FieldEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isOverridden: boolean;
  isHidden: boolean;
  onHideChange: (hidden: boolean) => void;
  onReset: () => void;
  baseValue?: string | null;
}

function FieldEditor({
  label,
  value,
  onChange,
  isOverridden,
  isHidden,
  onHideChange,
  onReset,
  baseValue,
}: FieldEditorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-text-primary">{label}</Label>
        <Button variant="ghost" size="sm" onClick={onReset} className="text-text-secondary hover:text-text-primary">
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Checkbox
          id={`hide-${label.toLowerCase()}`}
          checked={isHidden}
          onCheckedChange={(checked) => onHideChange(!!checked)}
        />
        <Label htmlFor={`hide-${label.toLowerCase()}`} className="text-sm text-text-secondary">
          Hide this field
        </Label>
      </div>

      {!isHidden && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${label.toLowerCase()}...`}
          className="bg-bg-tertiary border-border text-text-primary"
        />
      )}

      <FieldStatusIndicator isOverridden={isOverridden} baseValue={baseValue} />
    </div>
  );
}

interface FieldStatusIndicatorProps {
  isOverridden: boolean;
  baseValue?: string | null;
}

function FieldStatusIndicator({ isOverridden, baseValue }: FieldStatusIndicatorProps) {
  return (
    <div className="text-xs text-text-tertiary">
      {isOverridden ? (
        <span className="text-purple-400">Customized</span>
      ) : (
        <span>
          Inherited from profile
          {baseValue ? `: "${baseValue.length > 40 ? baseValue.slice(0, 40) + '...' : baseValue}"` : ''}
        </span>
      )}
    </div>
  );
}
