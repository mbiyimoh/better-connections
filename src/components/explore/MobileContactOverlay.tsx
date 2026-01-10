'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users } from 'lucide-react';

interface MobileContactOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function MobileContactOverlay({
  isOpen,
  onClose,
  children,
  title = 'Contacts',
  subtitle,
}: MobileContactOverlayProps) {
  // Body scroll lock (SSR-safe)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Escape key handler
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleEscape]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Slide-in panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="overlay-title"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed inset-0 z-50 bg-bg-primary flex flex-col"
            style={{ willChange: 'transform' }}
          >
            {/* Header */}
            <header className="flex items-center gap-3 p-4 border-b border-border shrink-0">
              <button
                onClick={onClose}
                className="p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors"
                aria-label="Back to chat"
              >
                <ArrowLeft className="w-5 h-5 text-text-secondary" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-gold-primary shrink-0" />
                  <h2 id="overlay-title" className="font-semibold text-text-primary truncate">
                    {title}
                  </h2>
                </div>
                {subtitle && (
                  <p className="text-sm text-text-secondary truncate">{subtitle}</p>
                )}
              </div>
            </header>

            {/* Content - with iOS scroll momentum */}
            <div
              className="flex-1 overflow-y-auto min-h-0"
              style={{
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain'
              }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
