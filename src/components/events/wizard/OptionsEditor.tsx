'use client';

import { useState } from 'react';
import { Plus, X, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface OptionItem {
  value: string;
  label: string;
  description?: string;
}

interface OptionsEditorProps {
  options: OptionItem[];
  onChange: (options: OptionItem[]) => void;
  showMaxSelections?: boolean;
  maxSelections?: number;
  onMaxSelectionsChange?: (max: number | undefined) => void;
}

function generateOptionValue(label: string, existingValues: string[]): string {
  let base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  if (!base) base = 'option';

  let value = base;
  let counter = 1;
  while (existingValues.includes(value)) {
    value = `${base}_${counter}`;
    counter++;
  }
  return value;
}

export function OptionsEditor({
  options,
  onChange,
  showMaxSelections = false,
  maxSelections,
  onMaxSelectionsChange,
}: OptionsEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const handleAddOption = () => {
    const existingValues = options.map((o) => o.value);
    const newOption: OptionItem = {
      value: generateOptionValue('New Option', existingValues),
      label: 'New Option',
      description: '',
    };
    onChange([...options, newOption]);
    // Start editing the new option
    setEditingIndex(options.length);
    setEditLabel('New Option');
    setEditDescription('');
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditLabel(options[index]?.label || '');
    setEditDescription(options[index]?.description || '');
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;

    const existingValues = options
      .filter((_, i) => i !== editingIndex)
      .map((o) => o.value);

    const updatedOptions = options.map((opt, i) =>
      i === editingIndex
        ? {
            ...opt,
            label: editLabel.trim() || 'Untitled',
            description: editDescription.trim() || undefined,
            value: generateOptionValue(editLabel.trim() || 'Untitled', existingValues),
          }
        : opt
    );

    onChange(updatedOptions);
    setEditingIndex(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
  };

  const handleDelete = (index: number) => {
    onChange(options.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= options.length) return;

    const newOptions = [...options];
    const temp = newOptions[index];
    newOptions[index] = newOptions[newIndex]!;
    newOptions[newIndex] = temp!;
    onChange(newOptions);
  };

  return (
    <div className="space-y-4">
      <Label>Answer Options</Label>

      {options.length === 0 ? (
        <div className="text-sm text-text-tertiary p-4 bg-bg-tertiary rounded-lg text-center">
          No options yet. Add at least 2 options for this question type.
        </div>
      ) : (
        <div className="space-y-2">
          {options.map((option, index) => (
            <div
              key={option.value}
              className="flex items-start gap-2 p-3 bg-bg-tertiary rounded-lg group"
            >
              {/* Move buttons */}
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => handleMove(index, 'up')}
                  disabled={index === 0}
                  className="p-0.5 rounded hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronUp size={14} className="text-text-tertiary" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(index, 'down')}
                  disabled={index === options.length - 1}
                  className="p-0.5 rounded hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronDown size={14} className="text-text-tertiary" />
                </button>
              </div>

              {/* Option content */}
              {editingIndex === index ? (
                <div className="flex-1 space-y-2">
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    placeholder="Option label"
                    className="bg-bg-secondary"
                    autoFocus
                  />
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Description (optional)"
                    className="bg-bg-secondary"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEdit}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => handleStartEdit(index)}
                >
                  <p className="text-white text-sm font-medium">{option.label}</p>
                  {option.description && (
                    <p className="text-xs text-text-tertiary">{option.description}</p>
                  )}
                </div>
              )}

              {/* Delete button */}
              {editingIndex !== index && (
                <button
                  type="button"
                  onClick={() => handleDelete(index)}
                  className="p-1 rounded hover:bg-bg-secondary text-text-tertiary hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddOption}
        className="w-full border-dashed"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Option
      </Button>

      {options.length > 0 && options.length < 2 && (
        <p className="text-xs text-warning">
          Select questions require at least 2 options
        </p>
      )}

      {showMaxSelections && (
        <div className="pt-4 border-t border-border space-y-2">
          <Label htmlFor="maxSelections">Max Selections</Label>
          <Input
            id="maxSelections"
            type="number"
            min={1}
            max={options.length || 10}
            value={maxSelections || ''}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              onMaxSelectionsChange?.(isNaN(val) ? undefined : val);
            }}
            placeholder="Leave empty for unlimited"
            className="bg-bg-tertiary w-32"
          />
          <p className="text-xs text-text-tertiary">
            Leave empty to allow selecting all options
          </p>
        </div>
      )}
    </div>
  );
}
