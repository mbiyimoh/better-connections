'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Search, X, UserPlus, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useDebouncedCallback } from 'use-debounce';
import type { EventWizardData } from '../hooks/useWizardState';

interface OrganizersStepProps {
  data: EventWizardData;
  onChange: (updates: Partial<EventWizardData>) => void;
}

interface OrganizerEntry {
  id?: string;
  odId: string;
  contactId?: string;
  name: string;
  email?: string;
  permissions: {
    canInvite: boolean;
    canCurate: boolean;
    canEdit: boolean;
    canManage: boolean;
  };
}

interface SearchResult {
  id: string;
  name: string;
  email: string;
}

export function OrganizersStep({ data, onChange }: OrganizersStepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=10`);
      if (response.ok) {
        const users = await response.json();
        // Filter out already added organizers
        const filtered = users.filter(
          (u: SearchResult) => !data.organizers.some(o => o.odId === u.id)
        );
        setSearchResults(filtered);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setIsSearching(false);
    }
  }, [data.organizers]);

  const debouncedSearch = useDebouncedCallback(searchUsers, 300);

  useEffect(() => {
    if (showSearch) {
      debouncedSearch(searchQuery);
    }
  }, [searchQuery, showSearch, debouncedSearch]);

  const addOrganizer = (user: SearchResult) => {
    const newOrganizer: OrganizerEntry = {
      odId: user.id,
      name: user.name,
      email: user.email,
      permissions: {
        canInvite: true,
        canCurate: true,
        canEdit: false,
        canManage: false,
      },
    };
    onChange({ organizers: [...data.organizers, newOrganizer] });
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  const removeOrganizer = (index: number) => {
    const newOrganizers = data.organizers.filter((_, i) => i !== index);
    onChange({ organizers: newOrganizers });
  };

  const updatePermission = (index: number, permission: keyof OrganizerEntry['permissions'], value: boolean) => {
    const newOrganizers = [...data.organizers];
    const organizer = newOrganizers[index];
    if (organizer) {
      organizer.permissions[permission] = value;
      onChange({ organizers: newOrganizers });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white mb-1">Co-Organizers</h2>
        <p className="text-text-secondary">Invite others to help manage this event</p>
      </div>

      {/* Add Organizer Button */}
      {!showSearch && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowSearch(true)}
          className="w-full border-dashed"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add Co-Organizer
        </Button>
      )}

      {/* Search Panel */}
      {showSearch && (
        <div className="p-4 rounded-xl bg-bg-tertiary border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-text-tertiary" />
            <Input
              placeholder="Search contacts with M33T access..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-bg-secondary border-0"
              autoFocus
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {isSearching && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-gold-primary animate-spin" />
            </div>
          )}

          {!isSearching && searchQuery.length >= 2 && searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => addOrganizer(user)}
                  className="w-full p-3 rounded-lg bg-bg-secondary hover:bg-bg-primary/50 text-left flex items-center justify-between transition-colors group"
                >
                  <div>
                    <p className="text-white font-medium">{user.name}</p>
                    <p className="text-text-tertiary text-sm">{user.email}</p>
                  </div>
                  <UserPlus className="w-4 h-4 text-gold-primary opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          )}

          {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
            <p className="text-text-tertiary text-sm text-center py-4">
              No matching contacts with M33T access found
            </p>
          )}

          {!searchQuery && (
            <p className="text-text-tertiary text-sm text-center py-4">
              Type to search your contacts
            </p>
          )}
        </div>
      )}

      {/* Current Organizers */}
      {data.organizers.length > 0 && (
        <div className="space-y-3">
          <Label className="text-text-secondary">Co-Organizers ({data.organizers.length})</Label>
          {data.organizers.map((org, index) => (
            <div
              key={org.odId}
              className="p-4 rounded-xl bg-bg-tertiary border border-border"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold-subtle flex items-center justify-center">
                    <Users className="w-5 h-5 text-gold-primary" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{org.name}</p>
                    <p className="text-text-tertiary text-sm">{org.email}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeOrganizer(index)}
                  className="text-text-tertiary hover:text-error"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`invite-${index}`}
                    checked={org.permissions.canInvite}
                    onCheckedChange={(checked: boolean) => updatePermission(index, 'canInvite', checked)}
                  />
                  <Label htmlFor={`invite-${index}`} className="text-sm text-text-secondary cursor-pointer">
                    Can invite guests
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`curate-${index}`}
                    checked={org.permissions.canCurate}
                    onCheckedChange={(checked: boolean) => updatePermission(index, 'canCurate', checked)}
                  />
                  <Label htmlFor={`curate-${index}`} className="text-sm text-text-secondary cursor-pointer">
                    Can curate matches
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`edit-${index}`}
                    checked={org.permissions.canEdit}
                    onCheckedChange={(checked: boolean) => updatePermission(index, 'canEdit', checked)}
                  />
                  <Label htmlFor={`edit-${index}`} className="text-sm text-text-secondary cursor-pointer">
                    Can edit event
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`manage-${index}`}
                    checked={org.permissions.canManage}
                    onCheckedChange={(checked: boolean) => updatePermission(index, 'canManage', checked)}
                  />
                  <Label htmlFor={`manage-${index}`} className="text-sm text-text-secondary cursor-pointer">
                    Can manage team
                  </Label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.organizers.length === 0 && !showSearch && (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-text-tertiary" />
          </div>
          <p className="text-text-secondary mb-2">No co-organizers added yet</p>
          <p className="text-sm text-text-tertiary">
            You can skip this step and add co-organizers later
          </p>
        </div>
      )}

      <div className="p-4 rounded-xl bg-gold-subtle border border-gold-primary/30">
        <p className="text-sm text-text-secondary">
          <strong className="text-white">Note:</strong> Co-organizers must have M33T access enabled on their account.
          They&apos;ll receive an email invitation when you create the event.
        </p>
      </div>
    </div>
  );
}
