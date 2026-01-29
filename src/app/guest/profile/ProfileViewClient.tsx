'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Camera, X, Plus, Loader2 } from 'lucide-react';

interface AttendeeData {
  id: string;
  eventId: string;
  eventName: string;
  firstName: string;
  lastName?: string | null;
  profile: Record<string, unknown> | null;
  tradingCard: Record<string, unknown> | null;
}

interface ProfileViewClientProps {
  attendees: AttendeeData[];
  selectedAttendeeId: string;
}

export function ProfileViewClient({
  attendees,
  selectedAttendeeId,
}: ProfileViewClientProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [selectedId, setSelectedId] = useState(selectedAttendeeId);

  const selectedAttendee = attendees.find((a) => a.id === selectedId) || attendees[0];

  const [formData, setFormData] = useState({
    firstName: selectedAttendee?.firstName || '',
    lastName: selectedAttendee?.lastName || '',
    location: (selectedAttendee?.profile?.location as string) || '',
    role: (selectedAttendee?.profile?.role as string) || '',
    company: (selectedAttendee?.profile?.company as string) || '',
    currentFocus: (selectedAttendee?.tradingCard?.currentFocus as string) || '',
    seeking: (selectedAttendee?.tradingCard?.seeking as string) || '',
    offering: (selectedAttendee?.tradingCard?.offering as string) || '',
    expertise: (selectedAttendee?.tradingCard?.expertise as string[]) || [],
  });
  const [newTag, setNewTag] = useState('');

  const handleEventChange = (eventId: string) => {
    const attendee = attendees.find((a) => a.eventId === eventId);
    if (attendee) {
      setSelectedId(attendee.id);
      setFormData({
        firstName: attendee.firstName || '',
        lastName: attendee.lastName || '',
        location: (attendee.profile?.location as string) || '',
        role: (attendee.profile?.role as string) || '',
        company: (attendee.profile?.company as string) || '',
        currentFocus: (attendee.tradingCard?.currentFocus as string) || '',
        seeking: (attendee.tradingCard?.seeking as string) || '',
        offering: (attendee.tradingCard?.offering as string) || '',
        expertise: (attendee.tradingCard?.expertise as string[]) || [],
      });
      setIsEditing(false);
    }
  };

  const handleSave = async () => {
    // Client-side validation
    if (!formData.firstName.trim()) {
      setSaveError('First name is required');
      return;
    }

    setIsSaving(true);
    setSaveError('');

    try {
      const response = await fetch(
        `/api/guest/events/${selectedAttendee?.eventId}/profile`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: formData.firstName,
            lastName: formData.lastName,
            location: formData.location,
            role: formData.role,
            company: formData.company,
            currentFocus: formData.currentFocus,
            seeking: formData.seeking,
            offering: formData.offering,
            expertise: formData.expertise,
          }),
        }
      );

      if (response.ok) {
        setIsEditing(false);
        router.refresh();
      } else {
        const data = await response.json();
        setSaveError(data.error || 'Failed to save profile');
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      setSaveError('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.expertise.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        expertise: [...prev.expertise, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      expertise: prev.expertise.filter((t) => t !== tag),
    }));
  };

  if (!selectedAttendee) {
    return <div>No profile data available</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Profile</h1>

        {/* Event Selector */}
        {attendees.length > 1 && (
          <Select
            value={selectedAttendee.eventId}
            onValueChange={handleEventChange}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {attendees.map((a) => (
                <SelectItem key={a.eventId} value={a.eventId}>
                  {a.eventName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Preview Mode */}
      {!isEditing && (
        <>
          <Card className="p-6 mb-4">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-full bg-gold-subtle flex items-center justify-center text-2xl font-bold text-gold-primary">
                {formData.firstName?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">
                  {formData.firstName} {formData.lastName}
                </h2>
                {(formData.role || formData.company) && (
                  <p className="text-text-secondary">
                    {formData.role}
                    {formData.role && formData.company && ' at '}
                    {formData.company}
                  </p>
                )}
                {formData.location && (
                  <p className="text-text-tertiary text-sm">{formData.location}</p>
                )}
              </div>
            </div>

            {formData.expertise.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm text-text-secondary mb-2">Expertise</p>
                <div className="flex flex-wrap gap-2">
                  {formData.expertise.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {formData.currentFocus && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm text-text-secondary mb-1">Current Focus</p>
                <p className="text-sm">{formData.currentFocus}</p>
              </div>
            )}

            {formData.seeking && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm text-text-secondary mb-1">Looking For</p>
                <p className="text-sm">{formData.seeking}</p>
              </div>
            )}

            {formData.offering && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm text-text-secondary mb-1">Can Offer</p>
                <p className="text-sm">{formData.offering}</p>
              </div>
            )}
          </Card>

          <Button onClick={() => setIsEditing(true)} className="w-full">
            Edit Profile
          </Button>
        </>
      )}

      {/* Edit Mode */}
      {isEditing && (
        <Card className="p-6">
          {/* Photo Upload Placeholder */}
          <div className="mb-6 flex justify-center">
            <div className="w-24 h-24 rounded-full bg-bg-tertiary flex items-center justify-center cursor-pointer hover:bg-bg-secondary transition">
              <Camera className="w-8 h-8 text-text-tertiary" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-text-secondary mb-1 block">
                  First Name *
                </label>
                <Input
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, firstName: e.target.value }))
                  }
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="text-sm text-text-secondary mb-1 block">
                  Last Name
                </label>
                <Input
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, lastName: e.target.value }))
                  }
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-text-secondary mb-1 block">
                  Role
                </label>
                <Input
                  value={formData.role}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, role: e.target.value }))
                  }
                  placeholder="e.g., Product Manager"
                />
              </div>
              <div>
                <label className="text-sm text-text-secondary mb-1 block">
                  Company
                </label>
                <Input
                  value={formData.company}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, company: e.target.value }))
                  }
                  placeholder="Company name"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-text-secondary mb-1 block">
                Location
              </label>
              <Input
                value={formData.location}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, location: e.target.value }))
                }
                placeholder="e.g., Austin, TX"
              />
            </div>

            {/* Expertise Tags */}
            <div>
              <label className="text-sm text-text-secondary mb-1 block">
                Expertise
              </label>
              {formData.expertise.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.expertise.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-error"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add expertise..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" variant="outline" size="icon" onClick={addTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm text-text-secondary mb-1 block">
                Current Focus
              </label>
              <Textarea
                value={formData.currentFocus}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, currentFocus: e.target.value }))
                }
                placeholder="What are you working on right now?"
                rows={2}
              />
            </div>

            <div>
              <label className="text-sm text-text-secondary mb-1 block">
                Looking For
              </label>
              <Textarea
                value={formData.seeking}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, seeking: e.target.value }))
                }
                placeholder="What kind of connections are you looking for?"
                rows={2}
              />
            </div>

            <div>
              <label className="text-sm text-text-secondary mb-1 block">
                Can Offer
              </label>
              <Textarea
                value={formData.offering}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, offering: e.target.value }))
                }
                placeholder="What can you offer to others?"
                rows={2}
              />
            </div>
          </div>

          {saveError && (
            <p className="text-sm text-red-500 mt-4">{saveError}</p>
          )}

          <div className="flex gap-3 mt-6">
            <Button
              onClick={handleSave}
              disabled={isSaving || !formData.firstName.trim()}
              className="flex-1"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setSaveError('');
              }}
              disabled={isSaving}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Photo Encouragement Card */}
      {!isEditing && (
        <Card className="p-4 mt-4 border-gold-primary/20 bg-gold-subtle/30">
          <p className="text-sm">
            <span className="font-medium">Tip:</span> Profiles with photos get 3x
            more connections!
          </p>
        </Card>
      )}
    </div>
  );
}
