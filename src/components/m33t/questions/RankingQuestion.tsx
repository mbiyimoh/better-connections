'use client';

import { useState } from 'react';
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import type { Question } from '@/lib/m33t/schemas';

interface RankingQuestionProps {
  question: Question;
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
}

interface SortableOptionProps {
  id: string;
  label: string;
  description?: string;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function SortableOption({ id, label, description, index, total, onMoveUp, onMoveDown }: SortableOptionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        isDragging
          ? 'bg-gold-subtle border-gold-primary shadow-lg z-50'
          : 'bg-zinc-900/50 border-zinc-700 hover:border-zinc-600'
      }`}
    >
      {/* Drag handle */}
      <button
        className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-5 h-5" />
      </button>

      {/* Rank number - solid gold badge */}
      <div className="w-7 h-7 rounded-full bg-gold-primary flex items-center justify-center shrink-0">
        <span className="text-sm font-semibold text-bg-primary">{index + 1}</span>
      </div>

      {/* Option label */}
      <div className="flex-1 min-w-0">
        <span className="font-body font-medium text-white">{label}</span>
        {description && (
          <p className="text-sm text-zinc-500 mt-0.5 font-body">{description}</p>
        )}
      </div>

      {/* Keyboard-accessible up/down buttons */}
      <div className="flex flex-col gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-zinc-600 hover:text-zinc-300"
          onClick={onMoveUp}
          disabled={index === 0}
          aria-label={`Move ${label} up`}
        >
          <ChevronUp className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-zinc-600 hover:text-zinc-300"
          onClick={onMoveDown}
          disabled={index === total - 1}
          aria-label={`Move ${label} down`}
        >
          <ChevronDown className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function RankingQuestion({ question, value, onChange, error }: RankingQuestionProps) {
  const options = question.config?.options || [];
  const [hasInteracted, setHasInteracted] = useState(false);

  // Initialize order: use saved value if available, otherwise default option order
  const orderedValues = value.length > 0
    ? value
    : options.map((o) => o.value);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedValues.indexOf(active.id as string);
    const newIndex = orderedValues.indexOf(over.id as string);
    const newOrder = arrayMove(orderedValues, oldIndex, newIndex);
    setHasInteracted(true);
    onChange(newOrder);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = arrayMove(orderedValues, index, index - 1);
    setHasInteracted(true);
    onChange(newOrder);
  };

  const handleMoveDown = (index: number) => {
    if (index === orderedValues.length - 1) return;
    const newOrder = arrayMove(orderedValues, index, index + 1);
    setHasInteracted(true);
    onChange(newOrder);
  };

  // Build a lookup for option details
  const optionMap = new Map(options.map((o) => [o.value, o]));

  return (
    <div className="space-y-3">
      <div>
        <Label className="font-display text-lg font-normal text-white">
          {question.title}
          {question.required && <span className="text-error ml-1">*</span>}
        </Label>
        {question.subtitle && (
          <p className="text-sm text-zinc-400 mt-1 font-body">{question.subtitle}</p>
        )}
        <p className="text-sm text-zinc-500 mt-1 font-body">
          Drag to reorder, or use the arrows. #1 = most important.
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={orderedValues} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {orderedValues.map((val, index) => {
              const option = optionMap.get(val);
              return (
                <SortableOption
                  key={val}
                  id={val}
                  label={option?.label || val}
                  description={option?.description}
                  index={index}
                  total={orderedValues.length}
                  onMoveUp={() => handleMoveUp(index)}
                  onMoveDown={() => handleMoveDown(index)}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {question.config?.hint && (
        <p className="text-xs text-zinc-500 font-body">{question.config.hint}</p>
      )}

      {!hasInteracted && value.length === 0 && (
        <p className="text-xs text-zinc-500 italic font-body">
          Reorder the items above to set your ranking
        </p>
      )}

      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
