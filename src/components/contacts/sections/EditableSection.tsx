'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EditableSectionProps {
  title: string;
  sectionId: string;
  isEditing: boolean;
  onEditStart: () => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  children: React.ReactNode;
  editContent: React.ReactNode;
  className?: string;
  variant?: 'default' | 'gold';
  // For profile header - no title shown, different layout
  hideTitle?: boolean;
  // Optional icon to show in header (for Why Now section)
  headerIcon?: React.ReactNode;
}

export function EditableSection({
  title,
  sectionId,
  isEditing,
  onEditStart,
  onSave,
  onCancel,
  isSaving,
  children,
  editContent,
  className,
  variant = 'default',
  hideTitle = false,
  headerIcon,
}: EditableSectionProps) {
  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isEditing) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }

    // Ctrl/Cmd + Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onSave();
    }
  }, [isEditing, onCancel, onSave]);

  useEffect(() => {
    if (isEditing) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isEditing, handleKeyDown]);

  const handleSave = async () => {
    await onSave();
  };

  return (
    <motion.div
      layout
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={cn(
        'group rounded-xl border p-6 transition-colors',
        variant === 'gold'
          ? isEditing
            ? 'border-gold-primary bg-gold-subtle'
            : 'border-gold-primary/30 bg-gold-subtle'
          : isEditing
            ? 'border-gold-primary/50 bg-bg-secondary'
            : 'border-border bg-bg-secondary',
        className
      )}
    >
      {/* Section Header */}
      {!hideTitle && (
        <div className="mb-4 flex items-center justify-between">
          <h2 className={cn(
            'flex items-center gap-2 text-sm font-semibold uppercase tracking-wider',
            variant === 'gold' ? 'text-gold-primary' : 'text-text-tertiary'
          )}>
            {headerIcon}
            {title}
          </h2>
          {!isEditing && (
            <button
              onClick={onEditStart}
              className="rounded-md p-1.5 text-text-tertiary opacity-100 transition-opacity hover:bg-white/5 hover:text-white md:opacity-0 md:group-hover:opacity-100"
              aria-label={`Edit ${title}`}
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            key="edit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {editContent}

            {/* Save/Cancel Buttons */}
            <div className="mt-4 flex flex-col gap-2 md:flex-row md:justify-end md:gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isSaving}
                className="w-full md:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-gold-primary hover:bg-gold-light text-bg-primary md:w-auto"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
