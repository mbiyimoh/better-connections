'use client';

import { useState, useEffect } from 'react';
import { Lightbulb, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAreaCodeInfo } from '@/lib/area-codes';

interface HometownSuggestionProps {
  phone: string | null | undefined;
  currentLocation: string | null | undefined;
  onAccept: (location: string) => void;
}

export function HometownSuggestion({
  phone,
  currentLocation,
  onAccept,
}: HometownSuggestionProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [areaCode, setAreaCode] = useState<string | null>(null);

  useEffect(() => {
    // Reset dismissed state when phone changes
    setIsDismissed(false);

    if (!phone || currentLocation) {
      setSuggestion(null);
      setAreaCode(null);
      return;
    }

    const info = getAreaCodeInfo(phone);
    if (info) {
      setSuggestion(`${info.city}, ${info.stateAbbr}`);
      setAreaCode(info.code);
    } else {
      setSuggestion(null);
      setAreaCode(null);
    }
  }, [phone, currentLocation]);

  // Don't show if no suggestion, dismissed, or location already set
  if (!suggestion || isDismissed || currentLocation) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="mt-2 p-3 rounded-lg bg-gold-subtle border border-gold-primary/30"
      >
        <div className="flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-gold-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-300">
              Based on area code ({areaCode}), this might be:
            </p>
            <p className="text-sm font-medium text-white mt-0.5">
              {suggestion}
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={() => onAccept(suggestion)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                       bg-gold-primary text-black rounded-md hover:bg-gold-light
                       transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Use This
          </button>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                       bg-zinc-700 text-zinc-300 rounded-md hover:bg-zinc-600
                       transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Dismiss
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
