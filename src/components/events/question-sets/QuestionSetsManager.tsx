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
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Plus, AlertCircle } from 'lucide-react';
import { QuestionSetCard } from './QuestionSetCard';
import { PublishDialog } from './PublishDialog';
import { NotifyDialog } from './NotifyDialog';
import { toast } from 'sonner';

interface QuestionSet {
  id: string;
  internalId: string;
  title: string;
  description: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt: string | null;
  questionCount: number;
  completionStats: {
    total: number;
    completed: number;
    inProgress: number;
  };
}

interface QuestionSetsManagerProps {
  eventId: string;
  questionSets: QuestionSet[];
  onCreateSet: () => void;
  onEditSet: (setId: string) => void;
}

function SortableQuestionSetCard({
  set,
  onEdit,
  onPublish,
  onNotify,
  onDelete,
  onViewResponses,
}: {
  set: QuestionSet;
  onEdit: () => void;
  onPublish: () => void;
  onNotify: () => void;
  onDelete: () => void;
  onViewResponses?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: set.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <QuestionSetCard
        {...set}
        onEdit={onEdit}
        onPublish={onPublish}
        onNotify={onNotify}
        onDelete={onDelete}
        onViewResponses={onViewResponses}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export function QuestionSetsManager({
  eventId,
  questionSets: initialSets,
  onCreateSet,
  onEditSet,
}: QuestionSetsManagerProps) {
  const router = useRouter();
  // Local state for optimistic drag-and-drop updates
  // Server state is source of truth via router.refresh()
  const [sets, setSets] = useState(initialSets);
  const [publishDialogSet, setPublishDialogSet] = useState<QuestionSet | null>(null);
  const [notifyDialogSet, setNotifyDialogSet] = useState<QuestionSet | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = sets.findIndex((s) => s.id === active.id);
        const newIndex = sets.findIndex((s) => s.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        // Optimistic update
        const newSets = [...sets];
        const removed = newSets.splice(oldIndex, 1)[0];
        if (!removed) return;
        newSets.splice(newIndex, 0, removed);
        setSets(newSets);

        // Persist to server
        try {
          const res = await fetch(`/api/events/${eventId}/question-sets/reorder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderedIds: newSets.map((s) => s.id),
            }),
          });

          if (!res.ok) {
            throw new Error('Failed to reorder');
          }
        } catch (error) {
          // Revert by refreshing from server (closure has stale state)
          router.refresh();
          toast.error('Failed to reorder question sets');
        }
      }
    },
    [sets, eventId]
  );

  const handleDelete = useCallback(
    async (setId: string) => {
      const set = sets.find((s) => s.id === setId);
      if (!set) return;

      const confirmMessage =
        set.status === 'PUBLISHED'
          ? 'This will archive the question set. Responses will be preserved.'
          : 'Are you sure you want to delete this question set?';

      if (!confirm(confirmMessage)) return;

      try {
        const res = await fetch(
          `/api/events/${eventId}/question-sets/${setId}`,
          { method: 'DELETE' }
        );

        if (!res.ok) {
          throw new Error('Failed to delete');
        }

        const data = await res.json();

        if (data.action === 'archived') {
          toast.success('Question set archived');
        } else {
          toast.success('Question set deleted');
        }

        router.refresh();
      } catch (error) {
        toast.error('Failed to delete question set');
      }
    },
    [sets, eventId, router]
  );

  const activeSets = sets.filter((s) => s.status !== 'ARCHIVED');
  const archivedSets = sets.filter((s) => s.status === 'ARCHIVED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Question Sets</h2>
          <p className="text-sm text-text-secondary">
            Create multiple question sets to release over time
          </p>
        </div>
        <Button onClick={onCreateSet}>
          <Plus className="h-4 w-4 mr-2" />
          Add Question Set
        </Button>
      </div>

      {/* Empty State */}
      {sets.length === 0 && (
        <div className="border border-dashed border-border rounded-lg p-8 text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-3 text-text-tertiary" />
          <p className="text-text-secondary mb-4">No question sets yet</p>
          <Button onClick={onCreateSet}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Set
          </Button>
        </div>
      )}

      {/* Active Sets (Sortable) */}
      {activeSets.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={activeSets.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {activeSets.map((set) => (
                <SortableQuestionSetCard
                  key={set.id}
                  set={set}
                  onEdit={() => onEditSet(set.id)}
                  onPublish={() => setPublishDialogSet(set)}
                  onNotify={() => setNotifyDialogSet(set)}
                  onDelete={() => handleDelete(set.id)}
                  onViewResponses={
                    set.status === 'PUBLISHED'
                      ? () => router.push(`/events/${eventId}/question-sets/${set.id}/responses`)
                      : undefined
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Archived Sets (Not Sortable) */}
      {archivedSets.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-text-tertiary">Archived</h3>
          {archivedSets.map((set) => (
            <QuestionSetCard
              key={set.id}
              {...set}
              onEdit={() => {}}
              onPublish={() => {}}
              onNotify={() => {}}
              onDelete={() => {}}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      {publishDialogSet && (
        <PublishDialog
          isOpen={!!publishDialogSet}
          onClose={() => setPublishDialogSet(null)}
          eventId={eventId}
          questionSet={publishDialogSet}
        />
      )}

      {notifyDialogSet && (
        <NotifyDialog
          isOpen={!!notifyDialogSet}
          onClose={() => setNotifyDialogSet(null)}
          eventId={eventId}
          questionSet={notifyDialogSet}
        />
      )}
    </div>
  );
}
