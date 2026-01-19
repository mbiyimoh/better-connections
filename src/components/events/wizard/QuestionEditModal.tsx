'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Question } from '@/lib/m33t/schemas';
import { QUESTION_TYPES, QUESTION_CATEGORIES } from '@/lib/m33t/questions';
import { OptionsEditor } from './OptionsEditor';

interface QuestionEditModalProps {
  question: Question | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: Question) => void;
}

export function QuestionEditModal({ question, isOpen, onClose, onSave }: QuestionEditModalProps) {
  const [editedQuestion, setEditedQuestion] = useState<Question | null>(null);

  useEffect(() => {
    if (question) {
      setEditedQuestion({ ...question, config: { ...question.config } });
    }
  }, [question]);

  if (!isOpen || !editedQuestion) return null;

  const handleSave = () => {
    if (!editedQuestion) return;

    // Validate select questions have at least 2 options
    if (
      (editedQuestion.type === 'single_select' || editedQuestion.type === 'multi_select') &&
      (!editedQuestion.config?.options || editedQuestion.config.options.length < 2)
    ) {
      // Don't save - validation message shown in OptionsEditor
      return;
    }

    onSave(editedQuestion);
    onClose();
  };

  const updateField = <K extends keyof Question>(field: K, value: Question[K]) => {
    setEditedQuestion(prev => prev ? { ...prev, [field]: value } : null);
  };

  const updateConfig = (field: string, value: unknown) => {
    setEditedQuestion(prev => {
      if (!prev) return null;
      return {
        ...prev,
        config: {
          ...prev.config,
          [field]: value,
        },
      };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-bg-secondary border border-border rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-bg-secondary border-b border-border p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {editedQuestion.locked ? 'Edit Required Question' : 'Edit Question'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* Question Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Question Title <span className="text-gold-primary">*</span></Label>
            <Input
              id="title"
              value={editedQuestion.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="What is your question?"
              className="bg-bg-tertiary"
            />
          </div>

          {/* Subtitle */}
          <div className="space-y-2">
            <Label htmlFor="subtitle">Subtitle / Helper Text</Label>
            <Input
              id="subtitle"
              value={editedQuestion.subtitle || ''}
              onChange={(e) => updateField('subtitle', e.target.value)}
              placeholder="Optional additional context"
              className="bg-bg-tertiary"
            />
          </div>

          {/* Question Type - only editable for non-locked questions */}
          {!editedQuestion.locked && (
            <div className="space-y-2">
              <Label>Question Type</Label>
              <Select
                value={editedQuestion.type}
                onValueChange={(v) => updateField('type', v as Question['type'])}
              >
                <SelectTrigger className="bg-bg-tertiary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Category - only editable for non-locked questions */}
          {!editedQuestion.locked && (
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={editedQuestion.category}
                onValueChange={(v) => updateField('category', v)}
              >
                <SelectTrigger className="bg-bg-tertiary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Config fields based on question type */}
          {editedQuestion.type === 'open_text' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="placeholder">Placeholder Text</Label>
                <Input
                  id="placeholder"
                  value={editedQuestion.config?.placeholder || ''}
                  onChange={(e) => updateConfig('placeholder', e.target.value)}
                  placeholder="e.g., Enter your answer..."
                  className="bg-bg-tertiary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hint">Hint Text</Label>
                <Input
                  id="hint"
                  value={editedQuestion.config?.hint || ''}
                  onChange={(e) => updateConfig('hint', e.target.value)}
                  placeholder="Additional guidance for respondents"
                  className="bg-bg-tertiary"
                />
              </div>
            </>
          )}

          {editedQuestion.type === 'slider' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leftLabel">Left Label</Label>
                <Input
                  id="leftLabel"
                  value={editedQuestion.config?.leftLabel || ''}
                  onChange={(e) => updateConfig('leftLabel', e.target.value)}
                  placeholder="e.g., Beginner"
                  className="bg-bg-tertiary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rightLabel">Right Label</Label>
                <Input
                  id="rightLabel"
                  value={editedQuestion.config?.rightLabel || ''}
                  onChange={(e) => updateConfig('rightLabel', e.target.value)}
                  placeholder="e.g., Expert"
                  className="bg-bg-tertiary"
                />
              </div>
            </div>
          )}

          {(editedQuestion.type === 'single_select' || editedQuestion.type === 'multi_select') && (
            <OptionsEditor
              options={editedQuestion.config?.options || []}
              onChange={(options) => updateConfig('options', options)}
              showMaxSelections={editedQuestion.type === 'multi_select'}
              maxSelections={editedQuestion.config?.maxSelections}
              onMaxSelectionsChange={(max) => updateConfig('maxSelections', max)}
            />
          )}

          {editedQuestion.locked && (
            <div className="p-3 rounded-lg bg-gold-subtle border border-gold-primary/30">
              <p className="text-sm text-text-secondary">
                This is a required question for matching. You can edit the wording but cannot delete it or change its type.
              </p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-bg-secondary border-t border-border p-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!editedQuestion.title.trim()}
            className="bg-gold-primary hover:bg-gold-light text-bg-primary"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
