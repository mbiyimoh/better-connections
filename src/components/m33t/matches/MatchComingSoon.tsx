'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Clock, ArrowLeft } from 'lucide-react';
import { getRsvpBasePath } from '@/lib/m33t/rsvp-paths';

interface MatchComingSoonProps {
  eventName: string;
  revealTiming: 'IMMEDIATE' | 'TWENTY_FOUR_HOURS_BEFORE' | 'FORTY_EIGHT_HOURS_BEFORE';
  estimatedRevealDate: string | null;
  rsvpToken: string;
}

const TIMING_MESSAGES: Record<string, string> = {
  IMMEDIATE: 'once your profile is complete',
  TWENTY_FOUR_HOURS_BEFORE: '24 hours before the event',
  FORTY_EIGHT_HOURS_BEFORE: '48 hours before the event',
};

export function MatchComingSoon({
  eventName,
  revealTiming,
  estimatedRevealDate,
  rsvpToken,
}: MatchComingSoonProps) {
  const pathname = usePathname();
  const rsvpBase = getRsvpBasePath(pathname);
  const timingMessage = TIMING_MESSAGES[revealTiming] || 'soon';

  // Format date if available
  const formattedDate = estimatedRevealDate
    ? new Date(estimatedRevealDate).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex items-center justify-center px-4"
    >
      <div className="text-center max-w-md">
        <div className="mb-6">
          <Clock className="w-16 h-16 text-gold-primary mx-auto" />
        </div>

        <h1 className="text-3xl font-bold text-text-primary mb-4">
          Your matches are coming!
        </h1>

        <p className="text-lg text-text-secondary mb-4">
          We&apos;re curating your perfect connections for {eventName}.
        </p>

        <p className="text-text-tertiary mb-8">
          Check back {timingMessage}
          {formattedDate && (
            <>
              <br />
              <span className="text-gold-primary font-medium">
                {formattedDate}
              </span>
            </>
          )}
        </p>

        <Link href={rsvpBase}>
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Event Details
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}
