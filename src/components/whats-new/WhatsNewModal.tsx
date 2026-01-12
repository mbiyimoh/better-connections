'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Update, UpdateSummaryItem } from '@/lib/updates/types';

interface WhatsNewModalProps {
  update: Update;
  isOpen: boolean;
  onClose: () => void;
  onMarkSeen: (version: string) => Promise<void>;
}

interface AccordionItemProps {
  item: UpdateSummaryItem;
  isExpanded: boolean;
  onToggle: () => void;
}

function AccordionItem({ item, isExpanded, onToggle }: AccordionItemProps) {
  return (
    <div className="border-b border-white/10 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 py-3 text-left hover:bg-white/5 transition-colors rounded-lg px-2 -mx-2"
      >
        <motion.div
          initial={false}
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          className="mt-0.5 text-gold-primary"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </motion.div>
        <div className="flex-1">
          <span className="font-semibold text-white">{item.title}</span>
          <span className="text-muted-foreground ml-1">- {item.summary}</span>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isExpanded && item.details && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-9 pb-3 pr-2">
              <div className="bg-secondary/50 rounded-lg p-4 text-sm text-muted-foreground prose prose-sm prose-invert max-w-none">
                <ReactMarkdown>{item.details}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function WhatsNewModal({
  update,
  isOpen,
  onClose,
  onMarkSeen,
}: WhatsNewModalProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = async () => {
    if (isClosing) return;
    setIsClosing(true);
    await onMarkSeen(update.version);
    onClose();
    setIsClosing(false);
  };

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px] bg-secondary border-white/10">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold-primary" />
            <span className="text-sm font-medium text-gold-primary">
              What&apos;s New
            </span>
          </div>
          <DialogTitle className="text-xl">{update.title}</DialogTitle>
        </DialogHeader>

        <div className="py-4 max-h-[60vh] overflow-y-auto">
          {update.items.map((item) => (
            <AccordionItem
              key={item.id}
              item={item}
              isExpanded={expandedId === item.id}
              onToggle={() => handleToggle(item.id)}
            />
          ))}
        </div>

        <DialogFooter>
          <Button
            onClick={handleClose}
            disabled={isClosing}
            className="w-full sm:w-auto bg-gold-primary hover:bg-gold-light text-black font-semibold"
          >
            Got it!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
