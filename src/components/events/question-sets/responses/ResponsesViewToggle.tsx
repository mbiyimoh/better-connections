'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type ResponsesView = 'by-question' | 'by-attendee';

interface ResponsesViewToggleProps {
  activeView: ResponsesView;
  onViewChange: (view: ResponsesView) => void;
}

const tabs: Array<{ value: ResponsesView; label: string }> = [
  { value: 'by-question', label: 'By Question' },
  { value: 'by-attendee', label: 'By Attendee' },
];

export function ResponsesViewToggle({
  activeView,
  onViewChange,
}: ResponsesViewToggleProps) {
  return (
    <div className="flex gap-1 border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onViewChange(tab.value)}
          className={cn(
            'relative px-4 py-2.5 text-sm font-medium transition-colors flex-1 md:flex-none',
            activeView === tab.value
              ? 'text-gold-primary'
              : 'text-text-tertiary hover:text-text-secondary'
          )}
        >
          {tab.label}
          {activeView === tab.value && (
            <motion.div
              layoutId="responses-view-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold-primary"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
