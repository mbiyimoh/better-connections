'use client';

import { useState, useEffect } from 'react';
import { Plus, Lock, ChevronUp, ChevronDown, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { REQUIRED_QUESTIONS, STARTER_QUESTIONS } from '@/lib/m33t/questions';
import { QuestionEditModal } from '../QuestionEditModal';
import type { Question } from '@/lib/m33t/schemas';
import type { EventWizardData } from '../hooks/useWizardState';

interface QuestionnaireStepProps {
  data: EventWizardData;
  onChange: (updates: Partial<EventWizardData>) => void;
}

export function QuestionnaireStep({ data, onChange }: QuestionnaireStepProps) {
  const [initialized, setInitialized] = useState(data.questions.length > 0);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Initialize with required questions if empty
  useEffect(() => {
    if (data.questions.length === 0 && initialized) {
      onChange({ questions: [...REQUIRED_QUESTIONS] });
    }
  }, [initialized, data.questions.length, onChange]);

  const startWithEssentials = () => {
    onChange({ questions: [...STARTER_QUESTIONS] });
    setInitialized(true);
  };

  const startFromScratch = () => {
    onChange({ questions: [...REQUIRED_QUESTIONS] });
    setInitialized(true);
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...data.questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    // Cannot move locked questions or move past them
    if (targetIndex < 0 || targetIndex >= newQuestions.length) return;
    if (newQuestions[index]?.locked || newQuestions[targetIndex]?.locked) return;

    // Swap
    const temp = newQuestions[index];
    if (temp && newQuestions[targetIndex]) {
      newQuestions[index] = newQuestions[targetIndex]!;
      newQuestions[targetIndex] = temp;

      // Update order numbers
      newQuestions.forEach((q, i) => {
        q.order = i;
      });

      onChange({ questions: newQuestions });
    }
  };

  const removeQuestion = (index: number) => {
    const question = data.questions[index];
    if (question?.locked) return;

    const newQuestions = data.questions.filter((_, i) => i !== index);
    newQuestions.forEach((q, i) => {
      q.order = i;
    });
    onChange({ questions: newQuestions });
  };

  const openEditModal = (question: Question) => {
    setEditingQuestion(question);
    setIsModalOpen(true);
  };

  const handleSaveQuestion = (updatedQuestion: Question) => {
    const newQuestions = data.questions.map(q =>
      q.id === updatedQuestion.id ? updatedQuestion : q
    );
    onChange({ questions: newQuestions });
  };

  const addNewQuestion = () => {
    const newQuestion: Question = {
      id: `custom-${Date.now()}`,
      type: 'open_text',
      category: 'PREFERENCES',
      title: 'New Question',
      subtitle: '',
      required: false,
      locked: false,
      order: data.questions.length,
      config: {
        placeholder: '',
        hint: '',
      },
    };
    onChange({ questions: [...data.questions, newQuestion] });
    // Open edit modal immediately for the new question
    setEditingQuestion(newQuestion);
    setIsModalOpen(true);
  };

  if (!initialized) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-1">Attendee Questionnaire</h2>
          <p className="text-text-secondary">Configure what you ask guests when they RSVP</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={startWithEssentials}
            className="w-full p-5 rounded-xl text-left bg-bg-tertiary border border-border hover:border-gold-primary transition-all"
          >
            <h3 className="text-white font-semibold text-lg">Start with Essentials</h3>
            <p className="text-sm mt-1 text-text-secondary">
              {STARTER_QUESTIONS.length} pre-configured questions. Edit and add more as needed.
            </p>
          </button>

          <button
            onClick={startFromScratch}
            className="w-full p-5 rounded-xl text-left bg-bg-tertiary border border-border hover:border-gold-primary transition-all"
          >
            <h3 className="text-white font-semibold text-lg">Build from Scratch</h3>
            <p className="text-sm mt-1 text-text-secondary">
              Start with just the {REQUIRED_QUESTIONS.length} required questions.
            </p>
          </button>
        </div>

        <div className="p-4 rounded-xl bg-gold-subtle border border-gold-primary/30">
          <p className="text-sm text-text-secondary">
            <strong className="text-white">Two questions are always required:</strong> &quot;What are your goals?&quot;
            and &quot;Who are your ideal connections?&quot; These power the matching algorithm.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-1">Attendee Questionnaire</h2>
          <p className="text-text-secondary">{data.questions.length} questions configured</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setInitialized(false)}
          className="text-text-secondary hover:text-text-primary"
        >
          Start over
        </Button>
      </div>

      <div className="space-y-3">
        {data.questions.map((q, idx) => {
          const canMoveUp = idx > 0 && !q.locked && !data.questions[idx - 1]?.locked;
          const canMoveDown = idx < data.questions.length - 1 && !q.locked && !data.questions[idx + 1]?.locked;

          return (
            <div
              key={q.id}
              className="p-4 rounded-xl bg-bg-tertiary border border-border group"
            >
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium bg-gold-subtle text-gold-primary shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{q.title}</p>
                  {q.subtitle && (
                    <p className="text-xs text-text-tertiary mt-0.5">{q.subtitle}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-text-secondary px-2 py-0.5 bg-bg-secondary rounded">
                      {q.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-text-tertiary">{q.category}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {q.locked && (
                    <div className="flex items-center gap-1 text-gold-primary mr-1">
                      <Lock size={14} />
                      <span className="text-xs">Required</span>
                    </div>
                  )}

                  {/* Edit button - available for ALL questions */}
                  <button
                    onClick={() => openEditModal(q)}
                    className="p-1 rounded hover:bg-bg-secondary"
                    title="Edit question"
                  >
                    <Pencil size={16} className="text-text-secondary hover:text-gold-primary" />
                  </button>

                  {/* Move and delete buttons - only for unlocked questions */}
                  {!q.locked && (
                    <>
                      <button
                        onClick={() => moveQuestion(idx, 'up')}
                        disabled={!canMoveUp}
                        className="p-1 rounded hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronUp size={16} className="text-text-secondary" />
                      </button>
                      <button
                        onClick={() => moveQuestion(idx, 'down')}
                        disabled={!canMoveDown}
                        className="p-1 rounded hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronDown size={16} className="text-text-secondary" />
                      </button>
                      <button
                        onClick={() => removeQuestion(idx)}
                        className="p-1 rounded hover:bg-bg-secondary text-error/70 hover:text-error"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Question Button */}
      <Button
        type="button"
        variant="outline"
        onClick={addNewQuestion}
        className="w-full border-dashed"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Custom Question
      </Button>

      <div className="p-4 rounded-xl bg-gold-subtle border border-gold-primary/30">
        <p className="text-sm text-text-secondary">
          <strong className="text-white">Tip:</strong> The two required questions power the matching algorithm.
          You can reword them but cannot delete them.
        </p>
      </div>

      {/* Question Edit Modal */}
      <QuestionEditModal
        question={editingQuestion}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingQuestion(null);
        }}
        onSave={handleSaveQuestion}
      />
    </div>
  );
}
