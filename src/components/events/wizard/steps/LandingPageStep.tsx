'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Plus, Pencil, Trash2, GripVertical, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { EventWizardData } from '../hooks/useWizardState';
import type { WhatToExpectItem, LandingPageSettings } from '@/lib/m33t/schemas';
import type { EventHost } from '@/lib/events/types';

interface LandingPageStepProps {
  data: EventWizardData;
  onChange: (updates: Partial<EventWizardData>) => void;
}

// Generate unique ID using crypto API for better uniqueness
function generateId(prefix: string = 'wte'): string {
  return prefix + '_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
}

interface WhatToExpectEditorProps {
  item: WhatToExpectItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: WhatToExpectItem) => void;
}

function WhatToExpectEditor({ item, isOpen, onClose, onSave }: WhatToExpectEditorProps) {
  const [icon, setIcon] = useState(item?.icon || '');
  const [title, setTitle] = useState(item?.title || '');
  const [description, setDescription] = useState(item?.description || '');

  // Sync state when modal opens or item changes
  useEffect(() => {
    if (isOpen) {
      setIcon(item?.icon || '');
      setTitle(item?.title || '');
      setDescription(item?.description || '');
    }
  }, [item, isOpen]);

  const handleSave = () => {
    if (!icon.trim() || !title.trim() || !description.trim()) return;

    onSave({
      id: item?.id || generateId(),
      icon: icon.trim(),
      title: title.trim(),
      description: description.trim(),
    });
    onClose();
  };

  const isValid = icon.trim() && title.trim() && description.trim();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-bg-secondary border-border">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit' : 'Add'} What to Expect Card</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="wte-icon">Icon</Label>
            <Input
              id="wte-icon"
              placeholder="e.g., Users, Utensils, Lightbulb, or a character like ◆"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="bg-bg-tertiary"
            />
            <p className="text-xs text-text-tertiary">
              Enter a Lucide icon name or a simple character/emoji
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wte-title">Title</Label>
            <Input
              id="wte-title"
              placeholder="e.g., Connections, Sessions, Dinner"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-bg-tertiary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wte-description">Description</Label>
            <Textarea
              id="wte-description"
              placeholder="e.g., AI-curated introductions to your ideal matches..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-bg-tertiary min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {item ? 'Save Changes' : 'Add Card'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface HostEditorProps {
  host: EventHost | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (host: EventHost) => void;
}

function HostEditor({ host, isOpen, onClose, onSave }: HostEditorProps) {
  const [name, setName] = useState(host?.name || '');
  const [title, setTitle] = useState(host?.title || '');
  const [photo, setPhoto] = useState(host?.photo || '');
  const [quote, setQuote] = useState(host?.quote || '');
  const [bio, setBio] = useState(host?.bio || '');

  // Sync state when modal opens or host changes
  useEffect(() => {
    if (isOpen) {
      setName(host?.name || '');
      setTitle(host?.title || '');
      setPhoto(host?.photo || '');
      setQuote(host?.quote || '');
      setBio(host?.bio || '');
    }
  }, [host, isOpen]);

  const handleSave = () => {
    if (!name.trim()) return;

    onSave({
      id: host?.id || generateId('host'),
      name: name.trim(),
      title: title.trim() || undefined,
      photo: photo.trim() || undefined,
      quote: quote.trim() || undefined,
      bio: bio.trim() || undefined,
    });
    onClose();
  };

  const isValid = name.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-bg-secondary border-border">
        <DialogHeader>
          <DialogTitle>{host ? 'Edit' : 'Add'} Host</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="host-name">Name <span className="text-gold-primary">*</span></Label>
              <Input
                id="host-name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-bg-tertiary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="host-title">Title</Label>
              <Input
                id="host-title"
                placeholder="e.g., Founder, 33 Strategies"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-bg-tertiary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="host-photo">Photo URL</Label>
            <Input
              id="host-photo"
              placeholder="https://example.com/your-photo.jpg"
              value={photo}
              onChange={(e) => setPhoto(e.target.value)}
              className="bg-bg-tertiary"
            />
            <p className="text-xs text-text-tertiary">
              Link to headshot image (square recommended)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="host-quote">Featured Quote</Label>
            <Input
              id="host-quote"
              placeholder="A memorable quote or tagline..."
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              className="bg-bg-tertiary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="host-bio">Bio</Label>
            <Textarea
              id="host-bio"
              placeholder="Tell attendees about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="bg-bg-tertiary min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {host ? 'Save Changes' : 'Add Host'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LandingPageStep({ data, onChange }: LandingPageStepProps) {
  const [editingItem, setEditingItem] = useState<WhatToExpectItem | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingHost, setEditingHost] = useState<EventHost | null>(null);
  const [isHostEditorOpen, setIsHostEditorOpen] = useState(false);

  const settings = data.landingPageSettings;
  const whatToExpect = data.whatToExpect;

  const handleSettingChange = (key: keyof LandingPageSettings, value: boolean) => {
    onChange({
      landingPageSettings: {
        ...settings,
        [key]: value,
      },
    });
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setIsEditorOpen(true);
  };

  const handleEditItem = (item: WhatToExpectItem) => {
    setEditingItem(item);
    setIsEditorOpen(true);
  };

  const handleDeleteItem = (id: string) => {
    onChange({
      whatToExpect: whatToExpect.filter((item) => item.id !== id),
    });
  };

  const handleSaveItem = (item: WhatToExpectItem) => {
    if (editingItem) {
      // Update existing
      onChange({
        whatToExpect: whatToExpect.map((i) => (i.id === item.id ? item : i)),
      });
    } else {
      // Add new
      onChange({
        whatToExpect: [...whatToExpect, item],
      });
    }
  };

  const sectionToggles: { key: keyof LandingPageSettings; label: string; description: string }[] = [
    { key: 'showVenue', label: 'Venue Information', description: 'Location, address, and parking details' },
    { key: 'showSchedule', label: 'Event Schedule', description: 'Timeline of activities' },
    { key: 'showHost', label: 'Host Information', description: 'Host bio and introduction' },
    { key: 'showAttendees', label: "Who's Coming", description: 'Attendee carousel preview' },
    { key: 'showWhatToExpect', label: 'What to Expect', description: 'Custom content cards (configure below)' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-white mb-1">Landing Page</h2>
        <p className="text-text-secondary">
          Configure what appears on your public event page
        </p>
      </div>

      {/* Section Visibility */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white flex items-center gap-2">
          <Eye className="w-5 h-5 text-gold-primary" />
          Section Visibility
        </h3>
        <p className="text-sm text-text-tertiary">
          Toggle which sections appear on your event landing page
        </p>

        <div className="space-y-3 bg-bg-tertiary rounded-lg p-4">
          {sectionToggles.map((toggle) => (
            <div
              key={toggle.key}
              className="flex items-center justify-between py-2"
            >
              <div className="flex-1">
                <Label htmlFor={toggle.key} className="text-white cursor-pointer">
                  {toggle.label}
                </Label>
                <p className="text-xs text-text-tertiary">{toggle.description}</p>
              </div>
              <Switch
                id={toggle.key}
                checked={settings[toggle.key]}
                onCheckedChange={(checked: boolean) => handleSettingChange(toggle.key, checked)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Host Configuration */}
      {settings.showHost && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <User className="w-5 h-5 text-gold-primary" />
                Host Configuration
              </h3>
              <p className="text-sm text-text-tertiary">
                Add hosts who will be featured on the landing page
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingHost(null);
                setIsHostEditorOpen(true);
              }}
              className="border-gold-primary/50 text-gold-primary hover:bg-gold-subtle"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Host
            </Button>
          </div>

          {data.hosts.length === 0 ? (
            <div className="bg-bg-tertiary rounded-lg p-8 text-center">
              <p className="text-text-tertiary mb-2">No hosts added yet</p>
              <p className="text-xs text-text-tertiary">
                Add yourself and any co-hosts for the event
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.hosts.map((host) => (
                <div
                  key={host.id}
                  className="bg-bg-tertiary rounded-lg p-4 border border-border group hover:border-gold-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {host.photo ? (
                        <img
                          src={host.photo}
                          alt={host.name}
                          className="w-12 h-12 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-bg-secondary flex items-center justify-center text-text-tertiary shrink-0">
                          <User className="w-6 h-6" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-medium text-white truncate">{host.name}</h4>
                        {host.title && (
                          <p className="text-sm text-text-secondary truncate">{host.title}</p>
                        )}
                        {host.quote && (
                          <p className="text-xs text-text-tertiary italic mt-1 line-clamp-1">
                            &ldquo;{host.quote}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-text-tertiary hover:text-white"
                        onClick={() => {
                          setEditingHost(host);
                          setIsHostEditorOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-text-tertiary hover:text-error"
                        onClick={() => {
                          onChange({
                            hosts: data.hosts.filter((h) => h.id !== host.id),
                          });
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* What to Expect Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <GripVertical className="w-5 h-5 text-gold-primary" />
              What to Expect Cards
            </h3>
            <p className="text-sm text-text-tertiary">
              Add cards describing what attendees will experience
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            className="border-gold-primary/50 text-gold-primary hover:bg-gold-subtle"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Card
          </Button>
        </div>

        {whatToExpect.length === 0 ? (
          <div className="bg-bg-tertiary rounded-lg p-8 text-center">
            <p className="text-text-tertiary mb-2">No cards yet</p>
            <p className="text-xs text-text-tertiary">
              Add cards to describe sessions, networking, dining, or other event highlights
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {whatToExpect.map((item) => (
              <div
                key={item.id}
                className="bg-bg-tertiary rounded-lg p-4 border border-border group hover:border-gold-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-xl text-gold-primary shrink-0">{item.icon}</span>
                    <div className="min-w-0">
                      <h4 className="font-medium text-white truncate">{item.title}</h4>
                      <p className="text-sm text-text-tertiary line-clamp-2">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-text-tertiary hover:text-white"
                      onClick={() => handleEditItem(item)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-text-tertiary hover:text-error"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!settings.showWhatToExpect && whatToExpect.length > 0 && (
          <div className="flex items-center gap-2 text-warning text-sm">
            <EyeOff className="w-4 h-4" />
            <span>
              What to Expect section is hidden. Enable it above to show these cards.
            </span>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      <WhatToExpectEditor
        item={editingItem}
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
      />

      {/* Host Editor Modal */}
      <HostEditor
        host={editingHost}
        isOpen={isHostEditorOpen}
        onClose={() => {
          setIsHostEditorOpen(false);
          setEditingHost(null);
        }}
        onSave={(host) => {
          if (editingHost) {
            // Update existing host
            onChange({
              hosts: data.hosts.map((h) => (h.id === host.id ? host : h)),
            });
          } else {
            // Add new host
            onChange({
              hosts: [...data.hosts, host],
            });
          }
        }}
      />
    </div>
  );
}
