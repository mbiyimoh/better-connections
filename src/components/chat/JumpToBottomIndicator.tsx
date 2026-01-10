'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface JumpToBottomIndicatorProps {
  visible: boolean;
  unreadCount?: number;
  onClick: () => void;
}

export function JumpToBottomIndicator({
  visible,
  unreadCount = 0,
  onClick,
}: JumpToBottomIndicatorProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10"
        >
          <motion.button
            onClick={onClick}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-bg-secondary border border-border shadow-lg"
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(212, 165, 74, 0)',
                '0 0 20px 4px rgba(212, 165, 74, 0.3)',
                '0 0 0 0 rgba(212, 165, 74, 0)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown className="w-4 h-4 text-gold-primary" />
            <span className="text-sm text-text-primary">
              {unreadCount > 0 ? `${unreadCount} new` : 'Jump to latest'}
            </span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
