'use client';

import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface ImportSourceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  fileTypeHint: string;
  onClick: () => void;
  disabled?: boolean;
}

export function ImportSourceCard({
  icon: Icon,
  title,
  description,
  fileTypeHint,
  onClick,
  disabled = false,
}: ImportSourceCardProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full p-6 rounded-xl border text-left transition-all
        ${disabled
          ? 'border-zinc-800 bg-zinc-900/50 cursor-not-allowed opacity-50'
          : 'border-zinc-700 bg-zinc-800/50 hover:border-[#C9A227]/50 hover:bg-zinc-800'
        }
      `}
      whileHover={disabled ? {} : { scale: 1.01 }}
      whileTap={disabled ? {} : { scale: 0.99 }}
    >
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-zinc-700/50">
          <Icon className="w-6 h-6 text-[#C9A227]" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
          <p className="text-sm text-zinc-400 mb-2">{description}</p>
          <span className="text-xs text-zinc-500">{fileTypeHint}</span>
        </div>
      </div>
    </motion.button>
  );
}
