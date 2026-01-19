'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface EventEditorHeaderProps {
  isNew: boolean;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => Promise<void>;
}

export function EventEditorHeader({
  isNew,
  isDirty,
  isSaving,
  onSave,
}: EventEditorHeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-bg-primary border-b border-border">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-4">
          <Link
            href="/events"
            className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Back to Events</span>
          </Link>
        </div>

        <h1 className="text-lg font-semibold text-white">
          {isNew ? 'Create' : 'Edit'} Event
        </h1>

        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="text-xs text-warning px-2 py-1 bg-warning/10 rounded">
              Unsaved changes
            </span>
          )}
          <Button
            onClick={onSave}
            disabled={!isDirty || isSaving}
            className="bg-gold-primary hover:bg-gold-light text-bg-primary"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
