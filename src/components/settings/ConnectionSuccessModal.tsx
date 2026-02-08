'use client';

import { useRouter } from 'next/navigation';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SynthesisSummary } from '@/components/clarity-canvas/SynthesisSummary';
import { SynthesisDetails } from '@/components/clarity-canvas/SynthesisDetails';
import type { BaseSynthesis } from '@/lib/clarity-canvas/types';

interface ConnectionSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  synthesis: BaseSynthesis;
}

export function ConnectionSuccessModal({
  open,
  onOpenChange,
  synthesis,
}: ConnectionSuccessModalProps) {
  const router = useRouter();

  const handleExplore = () => {
    onOpenChange(false);
    router.push('/explore');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-4">
          <div className="w-16 h-16 rounded-full bg-green-500/20 mx-auto flex items-center justify-center mb-4">
            <Check size={32} className="text-green-500" />
          </div>
          <DialogTitle className="text-xl text-white">
            Clarity Canvas Connected
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary */}
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <SynthesisSummary synthesis={synthesis} />
          </div>

          {/* What we'll use */}
          <div>
            <p className="text-sm text-zinc-400 mb-4">
              Here&apos;s what we&apos;ll use to personalize your experience:
            </p>
            <SynthesisDetails synthesis={synthesis} defaultExpanded />
          </div>

          {/* CTA */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <p className="text-sm text-zinc-400 text-center">
              Your Explore chat will now suggest contacts based on these goals and
              priorities.
            </p>
            <Button
              onClick={handleExplore}
              className="w-full bg-gold-primary hover:bg-gold-light text-black"
            >
              <Sparkles size={16} className="mr-2" />
              Explore Your Network
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
