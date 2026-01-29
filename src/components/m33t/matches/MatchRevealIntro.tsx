'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface MatchRevealIntroProps {
  eventName: string;
  matchCount: number;
  onContinue: () => void;
}

export function MatchRevealIntro({
  eventName,
  matchCount,
  onContinue,
}: MatchRevealIntroProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen flex items-center justify-center px-4"
    >
      <div className="text-center max-w-md">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="mb-6"
        >
          <Sparkles className="w-16 h-16 text-gold-primary mx-auto" />
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-3xl font-bold text-text-primary mb-4"
        >
          Your matches are ready!
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="text-lg text-text-secondary mb-8"
        >
          You have {matchCount} curated connection{matchCount !== 1 ? 's' : ''} waiting
          for you at {eventName}
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <Button
            onClick={onContinue}
            size="lg"
            className="bg-gold-primary hover:bg-gold-light text-bg-primary font-semibold"
          >
            View My Matches
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
