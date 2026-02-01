'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  buildGoogleCalendarUrl,
  downloadICSFile,
  type CalendarEventData,
} from '@/lib/m33t';

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

interface AddToCalendarButtonProps {
  event: CalendarEventData;
  variant?: 'completion' | 'landing';
}

export function AddToCalendarButton({
  event,
  variant = 'completion',
}: AddToCalendarButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767px)');

  const handleSelect = useCallback(
    (type: 'google' | 'ics') => {
      if (type === 'google') {
        window.open(buildGoogleCalendarUrl(event), '_blank');
      } else {
        downloadICSFile(event);
      }
      // Dismiss after brief delay for tap feedback
      setTimeout(() => setIsOpen(false), 150);
    },
    [event]
  );

  // Escape key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Prevent body scroll when sheet/modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // SSR guard: don't render interactive elements until hydrated
  if (isMobile === undefined) {
    return variant === 'completion' ? (
      <button
        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-gold-primary/40 text-gold-primary text-sm font-medium"
        disabled
      >
        <Calendar className="w-4 h-4" />
        Add to Calendar
      </button>
    ) : (
      <span className="inline-flex items-center gap-1.5 text-amber-500 text-sm">
        <Calendar className="w-3.5 h-3.5" />
        Add to Calendar
      </span>
    );
  }

  return (
    <>
      {/* Trigger Button */}
      {variant === 'completion' ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-gold-primary/40 text-gold-primary bg-transparent hover:bg-gold-subtle text-sm font-medium transition-colors"
        >
          <Calendar className="w-4 h-4" />
          Add to Calendar
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 text-amber-500 hover:text-amber-400 text-sm transition-colors"
        >
          <Calendar className="w-3.5 h-3.5" />
          Add to Calendar
        </button>
      )}

      {/* Bottom Sheet (mobile) / Modal (desktop) */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setIsOpen(false)}
            />

            {isMobile ? (
              /* Bottom Sheet */
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{
                  type: 'spring',
                  damping: 25,
                  stiffness: 300,
                }}
                className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 border-t border-zinc-800 rounded-t-2xl"
              >
                {/* Grab handle */}
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-10 h-1 bg-zinc-700 rounded-full" />
                </div>

                <div className="px-4 pb-2">
                  <p className="text-sm font-medium text-zinc-400 mb-2">
                    Add to Calendar
                  </p>
                </div>

                {/* Options */}
                <div>
                  <button
                    onClick={() => handleSelect('google')}
                    className="w-full flex items-center gap-4 px-6 py-4 border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors"
                  >
                    <GoogleIcon size={20} />
                    <span className="text-white text-sm">Google Calendar</span>
                  </button>
                  <button
                    onClick={() => handleSelect('ics')}
                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-zinc-800/50 transition-colors"
                  >
                    <Calendar className="w-5 h-5 text-gold-primary" />
                    <span className="text-white text-sm">iCal / Other</span>
                  </button>
                </div>

                {/* Safe area padding for iOS */}
                <div className="h-8" />
              </motion.div>
            ) : (
              /* Desktop Modal */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[320px] bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                  <p className="text-sm font-medium text-zinc-400">
                    Add to Calendar
                  </p>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Options */}
                <div>
                  <button
                    onClick={() => handleSelect('google')}
                    className="w-full flex items-center gap-4 px-4 py-3.5 border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors"
                  >
                    <GoogleIcon size={20} />
                    <span className="text-white text-sm">Google Calendar</span>
                  </button>
                  <button
                    onClick={() => handleSelect('ics')}
                    className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-zinc-800/50 transition-colors"
                  >
                    <Calendar className="w-5 h-5 text-gold-primary" />
                    <span className="text-white text-sm">iCal / Other</span>
                  </button>
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </>
  );
}
