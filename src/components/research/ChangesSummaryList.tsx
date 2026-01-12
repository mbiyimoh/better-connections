'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface ChangesSummaryListProps {
  changes: string[];
}

export function ChangesSummaryList({ changes }: ChangesSummaryListProps) {
  if (changes.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
        Changes Applied
      </h4>
      <ul className="space-y-1.5">
        {changes.map((change, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-2 text-sm text-zinc-300"
          >
            <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
            <span>{change}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
