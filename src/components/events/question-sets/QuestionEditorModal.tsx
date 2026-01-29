'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { Question, QuestionConfig } from '@/lib/m33t/schemas';
import { QUESTION_TYPES, QUESTION_CATEGORIES } from '@/lib/m33t/questions';

interface QuestionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question | null;
  onSave: (question: Question) => void;
  existingIds: string[];
}

type QuestionType = 'open_text' | 'slider' | 'single_select' | 'multi_select';

interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export function QuestionEditorModal({
  isOpen,
  onClose,
  question,
  onSave,
}: QuestionEditorModalProps) {
  const isEditing = !!question;

  // Form state
  const [type, setType] = useState<QuestionType>(question?.type || 'open_text');
  const [category, setCategory] = useState(question?.category || 'GOALS');
  const [title, setTitle] = useState(question?.title || '');
  const [subtitle, setSubtitle] = useState(question?.subtitle || '');
  const [required, setRequired] = useState(question?.required ?? false);
  const [config, setConfig] = useState<QuestionConfig>(question?.config || {});

  // Options for select types
  const [options, setOptions] = useState<SelectOption[]>(
    (question?.config?.options as SelectOption[]) || [{ value: '', label: '' }]
  );

  // Reset form when question changes
  useEffect(() => {
    if (question) {
      setType(question.type);
      setCategory(question.category);
      setTitle(question.title);
      setSubtitle(question.subtitle || '');
      setRequired(question.required);
      setConfig(question.config || {});
      setOptions(
        (question.config?.options as SelectOption[]) || [{ value: '', label: '' }]
      );
    } else {
      setType('open_text');
      setCategory('GOALS');
      setTitle('');
      setSubtitle('');
      setRequired(false);
      setConfig({});
      setOptions([{ value: '', label: '' }]);
    }
  }, [question]);

  const handleAddOption = () => {
    setOptions([...options, { value: '', label: '' }]);
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (
    index: number,
    field: keyof SelectOption,
    value: string
  ) => {
    setOptions(
      options.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt))
    );
  };

  const handleSave = () => {
    if (!title.trim()) return;

    // Build config based on type
    let finalConfig: QuestionConfig = { ...config };

    if (type === 'open_text') {
      finalConfig = {
        placeholder: config.placeholder || '',
        hint: config.hint || '',
      };
    } else if (type === 'slider') {
      finalConfig = {
        leftLabel: config.leftLabel || '',
        rightLabel: config.rightLabel || '',
      };
    } else if (type === 'single_select' || type === 'multi_select') {
      finalConfig = {
        options: options.filter((o) => o.value && o.label),
        ...(type === 'multi_select' && { maxSelections: config.maxSelections }),
      };
    }

    const newQuestion: Question = {
      id: question?.id || crypto.randomUUID(),
      type,
      category,
      title,
      subtitle: subtitle || undefined,
      required,
      locked: question?.locked || false,
      order: question?.order || 0,
      config: finalConfig,
    };

    onSave(newQuestion);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Question' : 'Add Question'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Type & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Question Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as QuestionType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Question</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What would you like to ask?"
            />
          </div>

          {/* Subtitle */}
          <div className="space-y-2">
            <Label>Subtitle (optional)</Label>
            <Input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Additional context for the question"
            />
          </div>

          {/* Required toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Required</Label>
              <p className="text-xs text-text-secondary">
                Attendees must answer this question
              </p>
            </div>
            <Switch checked={required} onCheckedChange={setRequired} />
          </div>

          {/* Type-specific config */}
          {type === 'open_text' && (
            <div className="space-y-4 border-t border-border pt-4">
              <div className="space-y-2">
                <Label>Placeholder</Label>
                <Input
                  value={config.placeholder || ''}
                  onChange={(e) =>
                    setConfig({ ...config, placeholder: e.target.value })
                  }
                  placeholder="e.g., Type your answer here..."
                />
              </div>
              <div className="space-y-2">
                <Label>Hint</Label>
                <Input
                  value={config.hint || ''}
                  onChange={(e) =>
                    setConfig({ ...config, hint: e.target.value })
                  }
                  placeholder="Help text shown below the input"
                />
              </div>
            </div>
          )}

          {type === 'slider' && (
            <div className="space-y-4 border-t border-border pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Left Label</Label>
                  <Input
                    value={config.leftLabel || ''}
                    onChange={(e) =>
                      setConfig({ ...config, leftLabel: e.target.value })
                    }
                    placeholder="e.g., Strongly Disagree"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Right Label</Label>
                  <Input
                    value={config.rightLabel || ''}
                    onChange={(e) =>
                      setConfig({ ...config, rightLabel: e.target.value })
                    }
                    placeholder="e.g., Strongly Agree"
                  />
                </div>
              </div>
            </div>
          )}

          {(type === 'single_select' || type === 'multi_select') && (
            <div className="space-y-4 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <Label>Options</Label>
                <Button variant="ghost" size="sm" onClick={handleAddOption}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Option
                </Button>
              </div>

              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option.value}
                      onChange={(e) =>
                        handleOptionChange(index, 'value', e.target.value)
                      }
                      placeholder="Value"
                      className="w-24"
                    />
                    <Input
                      value={option.label}
                      onChange={(e) =>
                        handleOptionChange(index, 'label', e.target.value)
                      }
                      placeholder="Label"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(index)}
                      disabled={options.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {type === 'multi_select' && (
                <div className="space-y-2">
                  <Label>Max Selections</Label>
                  <Input
                    type="number"
                    min={1}
                    value={config.maxSelections || ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        maxSelections: parseInt(e.target.value) || undefined,
                      })
                    }
                    placeholder="No limit"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim()}
            className="bg-gold-primary hover:bg-gold-light"
          >
            {isEditing ? 'Update' : 'Add'} Question
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
