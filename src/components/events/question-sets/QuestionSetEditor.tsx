'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  ArrowLeft,
  Plus,
  GripVertical,
  Trash2,
  Pencil,
  Save,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Question } from '@/lib/m33t/schemas';
import { QuestionEditorModal } from './QuestionEditorModal';

interface QuestionSetEditorProps {
  eventId: string;
  questionSet?: {
    id: string;
    internalId: string;
    title: string;
    description: string | null;
    questions: Question[];
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  };
  onBack: () => void;
}

function SortableQuestionItem({
  question,
  index,
  onEdit,
  onDelete,
  disabled,
  editDisabled = disabled,
}: {
  question: Question;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
  editDisabled?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-bg-secondary rounded-lg ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {!disabled && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab text-text-tertiary hover:text-text-secondary"
        >
          <GripVertical className="h-5 w-5" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-tertiary font-mono">
            Q{index + 1}
          </span>
          <span className="text-xs px-1.5 py-0.5 bg-bg-tertiary rounded">
            {question.type.replace('_', ' ')}
          </span>
          {question.required && (
            <span className="text-xs text-amber-400">Required</span>
          )}
        </div>
        <p className="font-medium text-sm mt-1 truncate">{question.title}</p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onEdit}
          disabled={editDisabled}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-400 hover:text-red-300"
          onClick={onDelete}
          disabled={disabled || question.locked}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function QuestionSetEditor({
  eventId,
  questionSet,
  onBack,
}: QuestionSetEditorProps) {
  const router = useRouter();
  const isEditing = !!questionSet;
  const isPublished = questionSet?.status === 'PUBLISHED';

  const [title, setTitle] = useState(questionSet?.title || '');
  const [description, setDescription] = useState(
    questionSet?.description || ''
  );
  const [questions, setQuestions] = useState<Question[]>(
    questionSet?.questions || []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setQuestions((items) => {
        const oldIndex = items.findIndex((q) => q.id === active.id);
        const newIndex = items.findIndex((q) => q.id === over.id);
        return arrayMove(items, oldIndex, newIndex).map((q, i) => ({
          ...q,
          order: i,
        }));
      });
    }
  }, []);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    setIsSaving(true);

    try {
      const url = isEditing
        ? `/api/events/${eventId}/question-sets/${questionSet.id}`
        : `/api/events/${eventId}/question-sets`;

      const method = isEditing ? 'PATCH' : 'POST';

      const body = { title, description: description || null, questions };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      toast.success(
        isEditing ? 'Question set updated' : 'Question set created'
      );
      router.refresh();
      onBack();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddQuestion = (question: Question) => {
    setQuestions([...questions, { ...question, order: questions.length }]);
    setIsAddingQuestion(false);
  };

  const handleEditQuestion = (updatedQuestion: Question) => {
    setQuestions(
      questions.map((q) => (q.id === updatedQuestion.id ? updatedQuestion : q))
    );
    setEditingQuestion(null);
  };

  const handleDeleteQuestion = (questionId: string) => {
    setQuestions(questions.filter((q) => q.id !== questionId));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Edit Question Set' : 'New Question Set'}
          </h2>
          {isEditing && (
            <p className="text-sm text-text-tertiary">
              {questionSet.internalId}
            </p>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving || !title.trim()}
          className="bg-gold-primary hover:bg-gold-light"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Published Warning */}
      {isPublished && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 text-amber-400" />
          <span className="text-amber-400">
            This set is published. You can edit question text, answer labels, and descriptions, but cannot add, remove, or reorder questions.
          </span>
        </div>
      )}

      {/* Form */}
      <Card className="p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Starter Questions, Deep Dive..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A brief description shown to attendees..."
            rows={2}
          />
        </div>
      </Card>

      {/* Questions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Questions ({questions.length})</h3>
          {!isPublished && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingQuestion(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          )}
        </div>

        {questions.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-6 text-center">
            <p className="text-text-secondary mb-3">No questions yet</p>
            {!isPublished && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingQuestion(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Question
              </Button>
            )}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={questions.map((q) => q.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {questions.map((question, index) => (
                  <SortableQuestionItem
                    key={question.id}
                    question={question}
                    index={index}
                    onEdit={() => setEditingQuestion(question)}
                    onDelete={() => handleDeleteQuestion(question.id)}
                    disabled={isPublished}
                    editDisabled={false}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Question Editor Modal */}
      {(editingQuestion || isAddingQuestion) && (
        <QuestionEditorModal
          isOpen={true}
          onClose={() => {
            setEditingQuestion(null);
            setIsAddingQuestion(false);
          }}
          question={editingQuestion}
          onSave={editingQuestion ? handleEditQuestion : handleAddQuestion}
          existingIds={questions.map((q) => q.id)}
          textOnlyMode={isPublished}
        />
      )}
    </div>
  );
}
