'use client';

import { useState } from 'react';
import { Eye, EyeOff, Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { EventWizardData } from '../hooks/useWizardState';
import type { WhatToExpectItem, LandingPageSettings } from '@/lib/m33t/schemas';

interface LandingPageStepProps {
  data: EventWizardData;
  onChange: (updates: Partial<EventWizardData>) => void;
}

// Generate unique ID using crypto API for better uniqueness
function generateId(): string {
  return 'wte_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
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

export function LandingPageStep({ data, onChange }: LandingPageStepProps) {
  const [editingItem, setEditingItem] = useState<WhatToExpectItem | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

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
    </div>
  );
}
