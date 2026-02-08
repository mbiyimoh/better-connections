'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DisconnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function DisconnectDialog({
  open,
  onOpenChange,
  onConfirm,
}: DisconnectDialogProps) {
  const [disconnecting, setDisconnecting] = useState(false);

  const handleConfirm = async () => {
    setDisconnecting(true);
    try {
      await onConfirm();
    } finally {
      setDisconnecting(false);
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-zinc-900 border-white/10">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="text-amber-500" size={20} />
            Disconnect Clarity Canvas?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400 space-y-3">
            <p>This will remove your 33 Strategies profile connection.</p>
            <p>Your Explore chat will no longer have context about:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your business goals and priorities</li>
              <li>Your target customer personas</li>
              <li>Your active projects</li>
            </ul>
            <p>
              Contact recommendations will become generic rather than personalized to
              your situation.
            </p>
            <p className="text-zinc-500">You can reconnect anytime from Settings.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            className="bg-white/10 border-white/10 text-white hover:bg-white/20"
            disabled={disconnecting}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={disconnecting}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {disconnecting ? 'Disconnecting...' : 'Disconnect'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
