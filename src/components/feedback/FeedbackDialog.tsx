'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { FeedbackForm } from './FeedbackForm';

interface FeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Dialog wrapper for the feedback form.
 * Used on the /feedback page when clicking "Add Feedback".
 */
export function FeedbackDialog({ isOpen, onClose, onSuccess }: FeedbackDialogProps) {
  const handleSuccess = () => {
    onSuccess?.();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-bg-secondary border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-text-primary">Submit Feedback</DialogTitle>
          <DialogDescription className="text-text-secondary">
            Share your thoughts, report bugs, or suggest improvements.
          </DialogDescription>
        </DialogHeader>
        <FeedbackForm onSuccess={handleSuccess} onCancel={onClose} />
      </DialogContent>
    </Dialog>
  );
}
